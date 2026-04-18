"""
FDA Live API — real-time compliance checks for Layer 2.

Sources:
- OpenFDA (api.fda.gov) — recall history, adverse events
- eCFR (ecfr.gov) — 21 CFR GRAS/food additive status
- USDA NOP (apps.ams.usda.gov/organic-integrity) — organic certificate status

All results cached 24h in memory to avoid hammering rate limits.
"""
import logging
import re
import time
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_OPENFDA_BASE = "https://api.fda.gov"
_ECFR_BASE = "https://www.ecfr.gov/api/versioner/v1"
_USDA_NOP_BASE = "https://apps.ams.usda.gov/organic-integrity/api"

# Simple 24h in-memory cache: key → (result, expires_at)
_cache: dict[str, tuple[Any, float]] = {}
_TTL = 86_400  # 24 hours


def _cached(key: str, fn):
    now = time.time()
    if key in _cache:
        result, expires = _cache[key]
        if now < expires:
            return result
    result = fn()
    _cache[key] = (result, now + _TTL)
    return result


def _get(url: str, params: dict | None = None, timeout: int = 8) -> dict | None:
    try:
        r = httpx.get(url, params=params, timeout=timeout, follow_redirects=True)
        if r.status_code == 200:
            return r.json()
    except Exception as exc:
        logger.warning("FDA live API call failed for %s: %s", url, exc)
    return None


# ---------------------------------------------------------------------------
# OpenFDA — Recall History
# ---------------------------------------------------------------------------

def get_supplier_recalls(supplier_name: str, years_back: int = 3) -> dict:
    """
    Returns recall count and latest recall reason for a supplier.
    Uses openFDA /food/enforcement endpoint.
    """
    key = f"recalls:{supplier_name.lower()}:{years_back}"

    def _fetch():
        cutoff = (datetime.now() - timedelta(days=365 * years_back)).strftime("%Y%m%d")
        query = f'recalling_firm:"{supplier_name}" AND report_date:[{cutoff} TO 99991231]'
        data = _get(
            f"{_OPENFDA_BASE}/food/enforcement.json",
            params={"search": query, "limit": 10},
        )
        if not data or "results" not in data:
            return {"recall_count": 0, "recalls": [], "source": "openfda", "found": False}

        recalls = []
        for r in data["results"]:
            recalls.append({
                "date": r.get("report_date", ""),
                "product": r.get("product_description", "")[:120],
                "reason": r.get("reason_for_recall", "")[:200],
                "classification": r.get("classification", ""),  # Class I/II/III
                "status": r.get("status", ""),
            })
        return {
            "recall_count": data.get("meta", {}).get("results", {}).get("total", len(recalls)),
            "recalls": recalls[:5],
            "source": "openfda",
            "found": True,
        }

    return _cached(key, _fetch)


def get_ingredient_adverse_events(ingredient_name: str, limit: int = 5) -> dict:
    """CFSAN Adverse Event Reporting System (CAERS) — adverse events for an ingredient."""
    key = f"caers:{ingredient_name.lower()}"

    def _fetch():
        data = _get(
            f"{_OPENFDA_BASE}/food/event.json",
            params={"search": f'products.name_brand:"{ingredient_name}"', "limit": limit},
        )
        if not data or "results" not in data:
            return {"event_count": 0, "events": [], "source": "openfda_caers"}

        events = []
        for e in data["results"]:
            events.append({
                "date": e.get("date_started_suspect", ""),
                "outcomes": e.get("outcomes", []),
                "reactions": [r.get("name", "") for r in e.get("reactions", [])[:3]],
            })
        return {
            "event_count": data.get("meta", {}).get("results", {}).get("total", 0),
            "events": events,
            "source": "openfda_caers",
        }

    return _cached(key, _fetch)


# ---------------------------------------------------------------------------
# eCFR — GRAS / Food Additive Status (21 CFR Parts 182, 184, 172–178)
# ---------------------------------------------------------------------------

_GRAS_PARTS = {
    "182": "GRAS_Affirmed",
    "184": "GRAS_Affirmed",
    "172": "Approved_Food_Additive",
    "173": "Approved_Food_Additive",
    "174": "Approved_Food_Additive",
    "175": "Approved_Food_Additive",
    "176": "Approved_Food_Additive",
    "177": "Approved_Food_Additive",
    "178": "Approved_Food_Additive",
    "100": "Approved_SOI",
    "169": "Approved_SOI",
}


def get_cfr_status(ingredient_name: str) -> dict:
    """
    Searches eCFR for ingredient in 21 CFR Parts 182/184 (GRAS) and 172-178 (food additives).
    Returns gras_status, cfr_citation, and regulatory_text snippet.
    """
    key = f"ecfr:{ingredient_name.lower()}"

    def _fetch():
        clean = re.sub(r"[^a-z0-9 ]", "", ingredient_name.lower()).strip()
        data = _get(
            f"{_ECFR_BASE}/search",
            params={
                "query": clean,
                "per_page": 10,
                "title": 21,
            },
        )
        if not data:
            return {"gras_status": "Unknown", "cfr_citation": None, "source": "ecfr", "found": False}

        results = data.get("results", [])
        best_match = None
        best_status = "Unknown"
        best_citation = None

        for r in results:
            hierarchy = r.get("hierarchy", [])
            part = None
            for h in hierarchy:
                m = re.search(r"part[_\s](\d+)", str(h).lower())
                if m:
                    part = m.group(1)
                    break

            if part and part in _GRAS_PARTS:
                status = _GRAS_PARTS[part]
                # Prefer GRAS over other statuses
                if best_status == "Unknown" or status == "GRAS_Affirmed":
                    best_status = status
                    section = r.get("section", "")
                    best_citation = f"21 CFR Part {part}" + (f" §{section}" if section else "")
                    best_match = r.get("headline", "")[:200]

        return {
            "gras_status": best_status,
            "cfr_citation": best_citation,
            "regulatory_text": best_match,
            "source": "ecfr_live",
            "found": best_match is not None,
        }

    return _cached(key, _fetch)


# ---------------------------------------------------------------------------
# USDA NOP — Organic Certificate Verification
# ---------------------------------------------------------------------------

def get_usda_organic_status(supplier_name: str) -> dict:
    """
    Checks if a supplier holds a valid USDA NOP organic certificate.
    Source: USDA Organic Integrity Database.
    """
    key = f"usda_nop:{supplier_name.lower()}"

    def _fetch():
        data = _get(
            f"{_USDA_NOP_BASE}/certificate",
            params={"company": supplier_name, "status": "C", "pageSize": 5},
        )
        if not data:
            return {"organic_certified": None, "certificates": [], "source": "usda_nop"}

        items = data.get("items", data.get("results", []))
        if not items:
            return {"organic_certified": False, "certificates": [], "source": "usda_nop"}

        certs = []
        for c in items[:3]:
            certs.append({
                "certifier": c.get("certificationBody", c.get("certifier", "")),
                "expiry": c.get("effectiveDate", c.get("expiry", "")),
                "operation_type": c.get("operationType", ""),
            })

        return {
            "organic_certified": True,
            "certificates": certs,
            "source": "usda_nop",
        }

    return _cached(key, _fetch)


# ---------------------------------------------------------------------------
# Layer 2 — Composite Check
# ---------------------------------------------------------------------------

def layer2_check(ingredient_name: str, supplier_name: str | None = None) -> dict:
    """
    Full Layer 2 compliance snapshot for a material + optional supplier.
    Combines eCFR GRAS status + supplier recall history + USDA organic status.
    """
    cfr = get_cfr_status(ingredient_name)

    result: dict = {
        "ingredient": ingredient_name,
        "gras_status": cfr.get("gras_status", "Unknown"),
        "cfr_citation": cfr.get("cfr_citation"),
        "cfr_regulatory_text": cfr.get("regulatory_text"),
        "adverse_events": get_ingredient_adverse_events(ingredient_name).get("event_count", 0),
        "source": "fda_live",
        "checked_at": datetime.utcnow().isoformat() + "Z",
    }

    if supplier_name:
        recalls = get_supplier_recalls(supplier_name)
        usda = get_usda_organic_status(supplier_name)
        result["supplier"] = supplier_name
        result["supplier_recalls_3y"] = recalls.get("recall_count", 0)
        result["supplier_recall_detail"] = recalls.get("recalls", [])
        result["supplier_organic_certified"] = usda.get("organic_certified")

        # Derived compliance score contribution
        recall_penalty = min(1.0, recalls.get("recall_count", 0) * 0.15)
        result["recall_risk_score"] = round(1.0 - recall_penalty, 2)

    # Hard reject check
    if cfr.get("gras_status") in ("Prohibited", "Restricted", "Not Approved"):
        result["layer2_decision"] = "REJECT"
        result["reject_reason"] = f"FDA status: {cfr['gras_status']}"
    else:
        result["layer2_decision"] = "PASS"

    return result
