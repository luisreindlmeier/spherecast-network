import logging
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

load_dotenv(Path(__file__).parent.parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("agnes")

from ingestion.db_reader import build_ingredient_df, get_unique_ingredients
from ingestion.fda_ratings import get_fda_status, get_standards
from ingestion.fda_live import layer2_check
from optimization.carbon import estimate_co2, get_prop65_warning
from optimization.substitution import find_substitutes, get_all_functional_classes, get_consolidation_proposal
from optimization.substitution_matrix import find_known_substitutes
from optimization.embeddings import collection_exists
from reasoning.explainer import explain_consolidation, explain_substitution

app = FastAPI(
    title="Agnes – AI Supply Chain Manager",
    description="CPG raw material substitution and supplier consolidation API",
    version="1.0.0",
)

_FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_FRONTEND_URL, "http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)

_DB_PATH = Path(__file__).parent.parent / "data" / "db.sqlite"
_API_KEY = os.getenv("AGNES_API_KEY", "")

_SKU_RE = re.compile(r"^[\w\s\-./()]+$")


def _require_key(x_api_key: str = Header(default="", alias="X-API-Key")) -> None:
    if _API_KEY and x_api_key != _API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing X-API-Key header")


_auth = Depends(_require_key)


class RecommendRequest(BaseModel):
    ingredient_sku: str = Field(..., min_length=1, max_length=200)
    top_k: int = Field(default=5, ge=1, le=20)
    explain: bool = True

    @field_validator("ingredient_sku")
    @classmethod
    def validate_sku(cls, v: str) -> str:
        if not _SKU_RE.match(v):
            raise ValueError("SKU contains invalid characters")
        return v


@app.get("/")
def root():
    return {"service": "Agnes", "status": "ok", "index_ready": collection_exists()}


@app.get("/ingredients", dependencies=[_auth])
def list_ingredients(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    all_ing = get_unique_ingredients(_DB_PATH)
    return {
        "total": len(all_ing),
        "offset": offset,
        "limit": limit,
        "items": all_ing[offset : offset + limit],
    }


@app.get("/ingredients/{sku:path}", dependencies=[_auth])
def get_ingredient(sku: str):
    if not _SKU_RE.match(sku):
        raise HTTPException(status_code=400, detail="SKU contains invalid characters")

    from extraction.cache import get_cached
    from ingestion.db_reader import parse_name_from_sku

    name = parse_name_from_sku(sku)
    cached = get_cached(name)
    if not cached:
        raise HTTPException(status_code=404, detail=f"Profile not found for {sku}. Run build_index.py first.")

    df = build_ingredient_df(_DB_PATH)
    rows = df[df["ingredient_sku"] == sku]
    supplier_info: list[str] = []
    bom_count = 0
    company_names: list[str] = []
    if not rows.empty:
        row = rows.iloc[0]
        supplier_info = row["supplier_names"]
        bom_count = len(row["bom_ids"])
        company_names = list(set(row["company_names"]))

    fda_info = get_fda_status(name, get_standards())
    functional_class = cached.get("functional_class", "other")
    live_compliance = layer2_check(name, supplier_info[0] if supplier_info else None)
    matrix_alts = find_known_substitutes(name)

    return {
        "sku": sku,
        "suppliers": supplier_info,
        "single_source_risk": len(supplier_info) == 1,
        "used_in_boms": bom_count,
        "used_by_companies": company_names,
        "fda_status": fda_info,
        "live_compliance": live_compliance,
        "matrix_validated_alternatives": matrix_alts,
        "co2_footprint_kg_per_kg": round(estimate_co2(name, functional_class), 2),
        "prop65_warning": get_prop65_warning(name),
        **cached,
    }


@app.post("/recommend", dependencies=[_auth])
def recommend(req: RecommendRequest):
    if not collection_exists():
        raise HTTPException(
            status_code=503,
            detail="Index not built yet. Run: python scripts/build_index.py",
        )

    result = find_substitutes(req.ingredient_sku, top_k=req.top_k)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    if req.explain and result["substitutes"]:
        top = result["substitutes"][0]
        result["explanation"] = explain_substitution(
            result["original"], top, top["violations"]
        )
        result["evidence_trail"] = ["embedding_similarity", "rules_engine", "llm_knowledge"]
    else:
        result["explanation"] = None
        result["evidence_trail"] = []

    return result


@app.get("/consolidate/{functional_class}", dependencies=[_auth])
def consolidate(functional_class: str, explain: bool = True):
    proposal = get_consolidation_proposal(functional_class)
    if not proposal["top_suppliers"]:
        raise HTTPException(
            status_code=404,
            detail=f"No indexed ingredients found for functional class '{functional_class}'",
        )
    if explain and proposal["top_suppliers"]:
        proposal["explanation"] = explain_consolidation(
            functional_class,
            proposal["top_suppliers"][0],
            proposal["total_ingredients"],
        )
    return proposal


@app.get("/consolidate", dependencies=[_auth])
def list_functional_classes():
    return {"functional_classes": get_all_functional_classes()}


@app.get("/risk/single-supplier", dependencies=[_auth])
def single_supplier_risk(min_boms: int = Query(default=1, ge=0, le=1000)):
    from extraction.cache import get_cached
    df = build_ingredient_df(_DB_PATH)

    at_risk = []
    for _, row in df.iterrows():
        suppliers = row["supplier_names"]
        bom_count = len(row["bom_ids"])
        if len(suppliers) == 1 and bom_count >= min_boms:
            cached = get_cached(row["ingredient_name"]) or {}
            at_risk.append({
                "sku": row["ingredient_sku"],
                "name": row["ingredient_name"],
                "sole_supplier": suppliers[0],
                "used_in_boms": bom_count,
                "used_by_companies": list(set(row["company_names"])),
                "functional_class": cached.get("functional_class", "unknown"),
                "risk_level": "high" if bom_count >= 5 else "medium" if bom_count >= 2 else "low",
            })

    at_risk.sort(key=lambda x: -x["used_in_boms"])
    return {
        "total_at_risk": len(at_risk),
        "summary": f"{len(at_risk)} ingredients sourced from a single supplier",
        "ingredients": at_risk,
    }


@app.get("/companies/{company_id}/sourcing", dependencies=[_auth])
def company_sourcing(company_id: int):
    df = build_ingredient_df(_DB_PATH)
    mask = df["company_ids"].apply(lambda ids: company_id in ids)
    company_df = df[mask]

    if company_df.empty:
        raise HTTPException(status_code=404, detail=f"No BOM data found for company {company_id}")

    from extraction.cache import get_cached

    ingredients = []
    for _, row in company_df.iterrows():
        cached = get_cached(row["ingredient_name"]) or {}
        ingredients.append(
            {
                "sku": row["ingredient_sku"],
                "name": row["ingredient_name"],
                "functional_class": cached.get("functional_class", "unknown"),
                "suppliers": row["supplier_names"],
                "compliance_flags": {
                    "allergens": cached.get("allergens", []),
                    "vegan": cached.get("vegan"),
                },
            }
        )

    all_suppliers: list[str] = []
    for ing in ingredients:
        all_suppliers.extend(ing["suppliers"])
    from collections import Counter
    supplier_summary = Counter(all_suppliers).most_common(10)

    return {
        "company_id": company_id,
        "total_raw_materials": len(ingredients),
        "ingredients": ingredients,
        "top_suppliers": [{"name": s, "ingredient_count": c} for s, c in supplier_summary],
    }


@app.get("/roadmap")
def roadmap():
    return {
        "product": "Agnes — AI Supply Chain Manager",
        "powered_by": "Spherecast",
        "current_capabilities": [
            "Raw material substitution with compliance scoring (FDA GRAS, allergens, vegan, non-GMO)",
            "Prop 65 risk flagging for California compliance",
            "Supplier consolidation proposals by functional class",
            "FDA supplier certification scoring (FSSC 22000, ISO 9001, USP)",
            "21 CFR citation and GRAS status per ingredient",
            "FG-level vegan inference from Bill of Materials",
            "Semantic ingredient search with synonym expansion (876 ingredients, 61 companies)",
        ],
        "roadmap": {
            "2026": {
                "title": "CO₂ Footprint Intelligence",
                "description": (
                    "Per-ingredient carbon footprint tracking (kg CO₂e/kg) based on "
                    "verified LCA data. Sourcing decisions optimised for lowest Scope 3 "
                    "emissions. Agnes will flag when a compliant substitute also reduces "
                    "your supply chain carbon footprint."
                ),
                "pillars": [
                    "Scope 1, 2 & 3 emissions per ingredient SKU",
                    "Carbon-optimised substitute ranking",
                    "ESG reporting data feeds (GRI, CSRD, SEC climate disclosure)",
                ],
                "data_sources": ["Ecoinvent LCA database", "Our World in Data", "supplier EPDs"],
                "note": "CO₂ estimates are already available in /ingredients and /recommend as LLM-based approximations.",
            },
            "2027": {
                "title": "Raw Materials Brokerage",
                "description": (
                    "Agnes moves from recommendation to execution. Extended payment term "
                    "structuring, commodity contract brokerage, and direct access to "
                    "Spherecast's vetted supplier network with pre-negotiated benchmarks."
                ),
                "pillars": [
                    "Extended Payment Terms (EPT) deal structuring",
                    "Spot and forward contract brokerage",
                    "Supplier network with pre-qualified pricing benchmarks",
                ],
            },
            "2030": {
                "title": "EU Digital Product Passport (DPP)",
                "description": (
                    "EU ESPR regulation mandates a Digital Product Passport for CPG products "
                    "by 2030. Agnes will build the ingredient-level data infrastructure now "
                    "so clients are DPP-ready before the deadline — provenance, materials, "
                    "sustainability data, and lifecycle traceability from raw material to shelf."
                ),
                "pillars": [
                    "EU DPP data architecture (ESPR-compliant)",
                    "Full lifecycle traceability per SKU",
                    "W3C Verifiable Credentials for supplier certifications",
                    "GS1 Digital Link integration",
                ],
                "regulatory_basis": "EU Regulation 2024/1781 (ESPR), mandatory from 2030",
            },
        },
    }
