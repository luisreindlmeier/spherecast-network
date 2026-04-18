import logging
import re
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

_EXCEL_PATH = Path(__file__).parent.parent / "data" / "CPG_Supplier_Rating_Analysis.xlsx"

_CERT_SCORES = {
    "fssc 22000": 1.0,
    "brc": 0.9,
    "sqf": 0.9,
    "usp": 0.85,
    "fcc": 0.85,
    "iso 9001": 0.7,
    "non-gmo": 0.6,
    "kosher": 0.5,
    "halal": 0.5,
}


def _normalize_name(name: str) -> str:
    name = name.lower()
    for suffix in [", incorporated", ", inc.", " inc.", " inc", " llc", " corp.", " corp",
                   " plc", " sa", " se", " ag", " (adm)", " group", " frères"]:
        name = name.replace(suffix, "")
    # strip parenthetical HQ info like "(US HQ: ...)"
    name = re.sub(r"\s*\(.*?\)", "", name)
    return name.strip()


def load_supplier_ratings(path: str | Path | None = None) -> dict[str, dict]:
    path = Path(path or _EXCEL_PATH)
    df = pd.read_excel(path, sheet_name="Supplier Overview", header=None)
    # Header row is at index 2, data starts at index 3
    ratings: dict[str, dict] = {}
    for _, row in df.iloc[3:].iterrows():
        if pd.isna(row.iloc[1]):
            continue
        raw_name = str(row.iloc[1])
        certs_raw = str(row.iloc[6]) if not pd.isna(row.iloc[6]) else ""
        certs = [c.strip() for c in certs_raw.split(",") if c.strip()]
        materials_raw = str(row.iloc[8]) if not pd.isna(row.iloc[8]) else ""
        materials = [m.strip() for m in materials_raw.split(",") if m.strip()]
        entry = {
            "rank": int(row.iloc[0]) if not pd.isna(row.iloc[0]) else 99,
            "name": raw_name,
            "certifications": certs,
            "materials": materials,
            "revenue_bn": str(row.iloc[5]) if not pd.isna(row.iloc[5]) else "",
            "segment": str(row.iloc[4]) if not pd.isna(row.iloc[4]) else "",
        }
        ratings[_normalize_name(raw_name)] = entry
        # Also index abbreviated names inside parentheses e.g. "ADM" from "(ADM)"
        abbr = re.search(r"\(([A-Z]{2,})\)", raw_name)
        if abbr:
            ratings[abbr.group(1).lower()] = entry
    return ratings


def load_fda_standards(path: str | Path | None = None) -> dict[str, dict]:
    path = Path(path or _EXCEL_PATH)
    df = pd.read_excel(path, sheet_name="FDA Minimum Standards", header=None)
    # Header at row 1, data starts at row 2
    standards: dict[str, dict] = {}
    for _, row in df.iloc[2:].iterrows():
        if pd.isna(row.iloc[0]):
            continue
        raw_material = str(row.iloc[0])
        # Build searchable keys from material name
        # "Vitamin C (L-Ascorbic Acid)" → ["vitamin c", "l-ascorbic acid", "vitamin c (l-ascorbic acid)"]
        keys = _extract_keys(raw_material)
        entry = {
            "material": raw_material,
            "cfr_citation": str(row.iloc[1]) if not pd.isna(row.iloc[1]) else "",
            "gras_status": str(row.iloc[2]) if not pd.isna(row.iloc[2]) else "",
            "key_requirement": str(row.iloc[3]) if not pd.isna(row.iloc[3]) else "",
            "contaminant_limits": str(row.iloc[4]) if not pd.isna(row.iloc[4]) else "",
            "compliance_notes": str(row.iloc[5]) if not pd.isna(row.iloc[5]) else "",
        }
        for key in keys:
            standards[key] = entry
    return standards


def _extract_keys(material: str) -> list[str]:
    keys = [material.lower()]
    # Extract parenthetical alternative name: "Vitamin C (L-Ascorbic Acid)" → "l-ascorbic acid"
    parens = re.findall(r"\(([^)]+)\)", material)
    for p in parens:
        keys.append(p.lower())
    # Strip parenthetical to get base name: "Vitamin C"
    base = re.sub(r"\s*\(.*?\)", "", material).strip().lower()
    if base:
        keys.append(base)
    # Strip qualifiers like "— Natural", "— Dutched", "(10–22% fat)"
    simple = re.sub(r"\s*[—–-].*$", "", base).strip()
    if simple and simple != base:
        keys.append(simple)
    return list(dict.fromkeys(keys))


def get_supplier_score(supplier_name: str, ratings: dict) -> float:
    key = _normalize_name(supplier_name)
    # Exact match
    entry = ratings.get(key)
    if not entry:
        # Partial match: check if any known supplier name is contained in the DB name or vice versa
        for k, v in ratings.items():
            if k in key or key in k:
                entry = v
                break
    if not entry:
        return 0.5  # neutral — unknown supplier

    certs_lower = [c.lower() for c in entry["certifications"]]
    score = 0.3  # baseline
    for cert, cert_score in _CERT_SCORES.items():
        if any(cert in c for c in certs_lower):
            score = max(score, cert_score)
    return round(score, 2)


def get_fda_status(ingredient_name: str, standards: dict) -> dict | None:
    name_lower = ingredient_name.lower()
    # Direct match
    if name_lower in standards:
        return standards[name_lower]
    # Partial match: ingredient name contained in standard key or vice versa
    for key, entry in standards.items():
        if name_lower in key or key in name_lower:
            return entry
    return None


_ratings_cache: dict | None = None
_standards_cache: dict | None = None


def get_ratings() -> dict:
    global _ratings_cache
    if _ratings_cache is None:
        try:
            _ratings_cache = load_supplier_ratings()
        except Exception as exc:
            logger.warning("Failed to load supplier ratings from Excel: %s", exc)
            _ratings_cache = {}
    return _ratings_cache


def get_standards() -> dict:
    global _standards_cache
    if _standards_cache is None:
        try:
            _standards_cache = load_fda_standards()
        except Exception as exc:
            logger.warning("Failed to load FDA standards from Excel: %s", exc)
            _standards_cache = {}
    return _standards_cache
