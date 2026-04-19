"""
DataHarmonizer — AgnesCore Phase 1: Data Harmonization Pipeline.

STEP 1a: Load structured data from SQLite DB (no LLM needed — already clean).
STEP 1b: Load unstructured CSV + FDA API JSON → OpenAI gpt-4o-mini → structured dicts.
STEP 1c: Merge all sources → unified list[MaterialRecord] → persist as harmonized_materials.json.

Design:
- DB data is canonical (no LLM, full confidence).
- CSV/FDA JSON is enriched by LLM and then merged, DB values take precedence where present.
- Every intermediate result is persisted as a JSON file for inspection and auditing.
- All I/O is async (FastAPI compatible).
"""
import json
import os
import uuid
from pathlib import Path
from typing import Any

import pandas as pd
from openai import AsyncOpenAI

from extraction.cache import get_cached
from ingestion.db_reader import build_ingredient_df
from ingestion.fda_ratings import get_fda_status, get_standards
from optimization.carbon import get_prop65_warning
from src.models.material import DataSource, HazardLevel, MaterialRecord

_DB_PATH = Path(__file__).parent.parent.parent / "data" / "db.sqlite"
_OUTPUT_DIR = Path(__file__).parent.parent.parent / "data" / "harmonized"

_PARSE_SYSTEM = (
    "You are a regulatory and supply chain expert for US CPG ingredients. "
    "Convert raw input data into structured compliance JSON. "
    "Respond ONLY with valid JSON matching the schema. No prose. "
    "Only output what is explicitly stated in the source — do not infer or guess."
)

# FDA API schema: only extract what the API response explicitly states.
# is_fda_approved and fda_gras_status come ONLY from verified API data (eCFR/Excel),
# not LLM inference. vegan/halal/non_gmo are NOT asked — require supplier certificates.
_FDA_SCHEMA = """{
  "substance_name": "string — canonical ingredient name",
  "fda_gras_status": "GRAS_Affirmed | Approved_Food_Additive | Approved_SOI | Restricted | Prohibited | Unknown — extract ONLY if explicitly stated in the source",
  "allergens": ["array — only from: milk, eggs, fish, shellfish, tree-nuts, peanuts, wheat, soybeans, sesame — only if explicitly listed"],
  "prop65_concern": "boolean — true only if explicitly mentioned",
  "cfr_citation": "string or null — copy exactly as stated, e.g. '21 CFR 182.3013'"
}"""

# CSV schema: extract what the row contains, classify functional class.
# Do NOT infer is_fda_approved, vegan, halal, kosher, non_gmo — these require
# certified documentation that a CSV row cannot provide.
_CSV_SCHEMA = """{
  "name": "string — canonical ingredient name",
  "functional_class": "one of: emulsifier|sweetener|preservative|colorant|flavor|thickener|antioxidant|acidulant|bulking-agent|nutrient|fat|protein|carbohydrate|mineral|vitamin|enzyme|stabilizer|humectant|solvent|other",
  "allergens": ["array — only from: milk, eggs, fish, shellfish, tree-nuts, peanuts, wheat, soybeans, sesame — only if the row explicitly lists them"],
  "confidence": "float 0.5-0.8 — functional_class extraction confidence only"
}"""


def _derive_hazard(gras_status: str | None, prop65_substances: list[str]) -> HazardLevel:
    """Deterministic hazard level — no LLM involved."""
    if prop65_substances:
        return HazardLevel.HIGH
    if gras_status == "GRAS_Affirmed":
        return HazardLevel.LOW
    if gras_status in ("Approved_Food_Additive", "Approved_SOI"):
        return HazardLevel.MEDIUM
    if gras_status in ("Restricted", "Prohibited"):
        return HazardLevel.HIGH
    return HazardLevel.UNKNOWN


def _parse_bool(val: Any) -> bool | None:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    if s in ("true", "yes", "1", "y", "ja"):
        return True
    if s in ("false", "no", "0", "n", "nein"):
        return False
    return None


class DataHarmonizer:
    def __init__(
        self,
        db_path: Path = _DB_PATH,
        output_dir: Path = _OUTPUT_DIR,
    ) -> None:
        self._db_path = db_path
        self._output_dir = output_dir
        self._output_dir.mkdir(parents=True, exist_ok=True)
        self._openai = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self._standards = get_standards()

    def _persist(self, filename: str, data: list[dict] | dict) -> Path:
        """Write intermediate result to data/harmonized/ for inspection."""
        path = self._output_dir / filename
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
        return path

    # ── STEP 1a: Structured DB data (no LLM) ────────────────────────────────

    async def from_db(self) -> list[MaterialRecord]:
        """
        Load all raw materials from SQLite.
        Enriches with cached IngredientProfile data (already structured, no LLM call).
        Persists result to harmonized/db_materials.json.
        """
        df = build_ingredient_df(self._db_path)
        records: list[MaterialRecord] = []

        for _, row in df.iterrows():
            name: str = row["ingredient_name"]
            cached: dict = get_cached(name) or {}
            functional_class = cached.get("functional_class", "other")
            fda_info = get_fda_status(name, self._standards) or {}
            gras_status = fda_info.get("gras_status")
            prop65 = get_prop65_warning(name)
            supplier_names: list[str] = list(row.get("supplier_names", []))

            # Only use vegan/halal/kosher/non_gmo from cache if source was NOT llm_knowledge
            # (i.e., the data came from a real web source or OpenFoodFacts, not LLM inference)
            cached_sources = cached.get("sources", [])
            has_real_source = cached_sources and "llm_knowledge" not in cached_sources

            rec = MaterialRecord(
                material_id=str(row.get("product_id", uuid.uuid4())),
                name=name,
                functional_class=functional_class,
                supplier_ids=supplier_names,
                supplier_count=len(supplier_names),
                is_vegan=cached.get("vegan") if has_real_source else None,
                is_fda_approved=gras_status in (
                    "GRAS_Affirmed", "Approved_Food_Additive", "Approved_SOI"
                ),
                fda_gras_status=gras_status,
                hazard_level=_derive_hazard(gras_status, prop65),
                allergens=cached.get("allergens", []),
                non_gmo=cached.get("non_gmo") if has_real_source else None,
                source=DataSource.DATABASE,
                confidence=cached.get("confidence", 0.5),
            )
            records.append(rec)

        self._persist("db_materials.json", [r.model_dump() for r in records])
        return records

    # ── STEP 1b-i: Unstructured CSV → LLM → structured dicts ────────────────

    async def structure_csv(self, path: Path) -> list[dict]:
        """
        Reads a supplier CSV with arbitrary columns.
        Sends each row to gpt-4o-mini → structured dict matching _CSV_SCHEMA.
        Persists result to harmonized/csv_structured.json.
        """
        df = pd.read_csv(path)
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        structured: list[dict] = []

        for _, row in df.iterrows():
            raw_row = row.dropna().to_dict()
            if not raw_row:
                continue

            prompt = (
                f"Raw CSV row from a CPG supplier data sheet:\n"
                f"{json.dumps(raw_row, default=str)}\n\n"
                f"Convert to this compliance schema:\n{_CSV_SCHEMA}"
            )
            try:
                resp = await self._openai.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": _PARSE_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=300,
                )
                parsed = json.loads(resp.choices[0].message.content)
                # Attach raw supplier column if present
                for col in (
                    "supplier",
                    "supplier_name",
                    "vendor",
                    "vendor_name",
                    "manufacturer",
                    "manufacturer_name",
                ):
                    if col in raw_row:
                        parsed["_supplier"] = str(raw_row[col])
                        break
                structured.append(parsed)
            except Exception:
                structured.append({"name": str(raw_row.get("name", "")), "_error": "parse_failed"})

        self._persist("csv_structured.json", structured)
        return structured

    # ── STEP 1b-ii: FDA API JSON → LLM → structured dicts ───────────────────

    async def structure_fda_responses(self, responses: list[dict]) -> list[dict]:
        """
        Parses a list of (possibly heterogeneous) FDA API JSON responses.
        Sends each to gpt-4o-mini → unified compliance schema.
        Persists result to harmonized/fda_structured.json.
        """
        structured: list[dict] = []

        for raw in responses:
            prompt = (
                f"FDA API response:\n{json.dumps(raw, indent=2)[:2000]}\n\n"
                f"Extract to this schema:\n{_FDA_SCHEMA}"
            )
            try:
                resp = await self._openai.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": _PARSE_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=300,
                )
                structured.append(json.loads(resp.choices[0].message.content))
            except Exception:
                structured.append({
                    "substance_name": raw.get("substance_name", ""),
                    "_error": "parse_failed",
                })

        self._persist("fda_structured.json", structured)
        return structured

    # ── STEP 1c: Merge all sources → harmonized MaterialRecord list ──────────

    async def merge(
        self,
        db_records: list[MaterialRecord],
        csv_structured: list[dict] | None = None,
        fda_structured: list[dict] | None = None,
    ) -> list[MaterialRecord]:
        """
        Merge strategy:
        - DB record is canonical.
        - CSV/FDA data enriches fields that are None/Unknown in DB record.
        - FDA data has highest compliance confidence → can override cached data.
        Persists final merged list to harmonized/harmonized_materials.json.
        """
        index: dict[str, MaterialRecord] = {r.name.lower(): r for r in db_records}

        # Apply CSV structured data
        for item in (csv_structured or []):
            if item.get("_error") or not item.get("name"):
                continue
            key = item["name"].lower().strip()
            supplier = item.get("_supplier", "")
            fclass = item.get("functional_class", "other")

            if key in index:
                rec = index[key]
                merged_suppliers = list(set(
                    rec.supplier_ids + ([supplier] if supplier else [])
                ))
                # CSV only updates supplier list and allergens (if CSV explicitly lists them)
                # Never overwrite vegan/non_gmo with CSV-inferred values — requires certificates
                index[key] = rec.model_copy(update={
                    "supplier_ids": merged_suppliers,
                    "supplier_count": len(merged_suppliers),
                    "allergens": list(set(rec.allergens + item.get("allergens", []))),
                })
            else:
                # New material from CSV only — allergens from LLM only if explicitly stated
                s_ids = [supplier] if supplier else []
                prop65 = get_prop65_warning(item.get("name", ""))
                index[key] = MaterialRecord(
                    material_id=str(uuid.uuid4()),
                    name=item.get("name", key),
                    functional_class=fclass,
                    supplier_ids=s_ids,
                    supplier_count=len(s_ids),
                    allergens=item.get("allergens", []),
                    hazard_level=_derive_hazard(None, prop65),
                    source=DataSource.CSV,
                    confidence=float(item.get("confidence", 0.5)),
                )

        # Apply FDA structured data (highest priority for compliance fields)
        for item in (fda_structured or []):
            if item.get("_error"):
                continue
            key = item.get("substance_name", "").lower().strip()
            if not key:
                continue
            prop65_substances = [] if not item.get("prop65_concern") else get_prop65_warning(key)
            gras = item.get("fda_gras_status")
            hazard = _derive_hazard(gras, prop65_substances)

            if key in index:
                rec = index[key]
                # FDA API data updates gras_status, hazard, allergens (if stated).
                # is_fda_approved is DERIVED from gras_status — not taken from LLM output.
                # vegan/halal/non_gmo: NOT updated from FDA responses (require supplier certs).
                derived_approved = gras in ("GRAS_Affirmed", "Approved_Food_Additive", "Approved_SOI")
                index[key] = rec.model_copy(update={
                    "is_fda_approved": derived_approved if gras else rec.is_fda_approved,
                    "fda_gras_status": gras or rec.fda_gras_status,
                    "hazard_level": hazard if hazard != HazardLevel.UNKNOWN else rec.hazard_level,
                    "allergens": list(set(rec.allergens + item.get("allergens", []))),
                    "source": DataSource.FDA_API,
                    "confidence": max(rec.confidence, 0.85),
                })

        merged = list(index.values())
        self._persist("harmonized_materials.json", [r.model_dump() for r in merged])
        return merged

    # ── Full pipeline entry point ────────────────────────────────────────────

    async def run(
        self,
        csv_path: Path | None = None,
        fda_responses: list[dict] | None = None,
    ) -> list[MaterialRecord]:
        """
        Complete Phase 1 harmonization:
        1. Load DB → harmonized/db_materials.json
        2. Structure CSV via LLM → harmonized/csv_structured.json
        3. Structure FDA responses via LLM → harmonized/fda_structured.json
        4. Merge all → harmonized/harmonized_materials.json
        Returns final list[MaterialRecord] ready for the logic pipeline.
        """
        db_records = await self.from_db()

        csv_structured = None
        if csv_path and csv_path.exists():
            csv_structured = await self.structure_csv(csv_path)

        fda_structured = None
        if fda_responses:
            fda_structured = await self.structure_fda_responses(fda_responses)

        return await self.merge(db_records, csv_structured, fda_structured)
