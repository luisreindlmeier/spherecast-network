import logging
import re
import sqlite3

from config import DB_PATH as _DB_PATH

logger = logging.getLogger(__name__)

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


def get_supplier_score(supplier_name: str, ratings: dict | None = None) -> float:
    """Calculates supplier certification score using hard SQL mapping table."""
    try:
        conn = sqlite3.connect(_DB_PATH)
        cur = conn.cursor()
        
        # 1. Exact match to get SupplierId
        cur.execute("SELECT Id FROM Supplier WHERE Name = ?", (supplier_name,))
        s_row = cur.fetchone()
        
        if s_row:
            supplier_id = s_row[0]
            # 2. Hard relation lookup
            cur.execute("""
                SELECT sr.Certifications 
                FROM Map_Supplier_SupplierRating map
                JOIN SupplierRating sr ON map.SupplierRatingId = sr.Id
                WHERE map.SupplierId = ?
            """, (supplier_id,))
            row = cur.fetchone()
        else:
            row = None
            
        conn.close()
    except Exception as exc:
        logger.error(f"Error querying SupplierRating mapping: {exc}")
        row = None

    if not row:
        return 0.5  # neutral — unknown supplier

    certs_raw = row[0] or ""
    certs_lower = [c.lower().strip() for c in certs_raw.split(",")]
    
    score = 0.3  # baseline
    for cert, cert_score in _CERT_SCORES.items():
        if any(cert in c for c in certs_lower):
            score = max(score, cert_score)
    return round(score, 2)


def get_fda_status(sku: str, standards: dict | None = None) -> dict | None:
    """Fetches FDA minimum standard details using hard SQL mapping table via SKU."""
    try:
        conn = sqlite3.connect(_DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # 1. Get ProductId from SKU
        cur.execute("SELECT Id FROM Product WHERE SKU = ?", (sku,))
        p_row = cur.fetchone()
        
        if p_row:
            product_id = p_row[0]
            # 2. Hard relation lookup
            cur.execute("""
                SELECT fda.* 
                FROM Map_Product_FdaStandard map
                JOIN FdaStandard fda ON map.FdaStandardId = fda.Id
                WHERE map.ProductId = ?
            """, (product_id,))
            row = cur.fetchone()
        else:
            row = None
            
        if row:
            res = dict(row)
            conn.close()
            return {
                "material": res["Material"],
                "cfr_citation": res["CfrCitation"],
                "gras_status": res["GrasStatus"],
                "key_requirement": res["KeyRequirement"],
                "contaminant_limits": res["ContaminantLimits"],
                "compliance_notes": res["ComplianceNotes"],
            }
        
        conn.close()
    except Exception as exc:
        logger.error(f"Error querying FdaStandard mapping: {exc}")
        
    return None


def get_ratings() -> dict:
    """Dummy to prevent breaking existing imports."""
    return {}


def get_standards() -> dict:
    """Dummy to prevent breaking existing imports."""
    return {}
