#!/usr/bin/env python3
"""
Spherecast — Facility Locator
================================
For every supplier in Supabase, finds actual manufacturing / processing /
distribution facilities using Google Places Text Search with facility-specific
search terms (e.g. "ADM manufacturing facility", "ADM processing plant").

This produces far more accurate supply-chain geography than a simple company
name lookup, which only returns the corporate HQ.

Strategy
--------
Run up to 4 search queries per supplier:
  1. "{name} manufacturing facility"
  2. "{name} processing plant"
  3. "{name} production facility"
  4. "{name} distribution center"

Deduplicate by location (facilities within ~1 km are merged).
Store geocoded results in the `supplier_facility` Supabase table.

Install
-------
    pip install requests
    (No playwright or LLM key required)

Run
---
    python3 scripts/scrape-fda-facilities.py [--dry-run] [--supplier "ADM"] [--reset "ADM"]
"""

import argparse
import json
import math
import os
import sys
import time
import urllib.parse
from pathlib import Path


# ── 1. Load .env.local ───────────────────────────────────────────────────────

def _load_env_file(path: str) -> None:
    try:
        for line in Path(path).read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            val = val.strip().strip('"').strip("'")
            os.environ.setdefault(key.strip(), val)
    except FileNotFoundError:
        pass

_load_env_file(".env.local")
_load_env_file(str(Path(__file__).parent.parent / ".env.local"))


# ── 2. Env validation ────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
GOOGLE_KEY   = os.environ.get("GOOGLE_MAPS_API_KEY", "")

_missing = [k for k, v in {
    "NEXT_PUBLIC_SUPABASE_URL": SUPABASE_URL,
    "SUPABASE_SERVICE_ROLE_KEY": SUPABASE_KEY,
    "GOOGLE_MAPS_API_KEY": GOOGLE_KEY,
}.items() if not v]

if _missing:
    print(f"[error] Missing env vars: {', '.join(_missing)}")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("[error] Run: pip install requests")
    sys.exit(1)


# ── 3. Supabase REST mini-client ─────────────────────────────────────────────

class DB:
    def __init__(self, url: str, key: str) -> None:
        self._base = url.rstrip("/") + "/rest/v1"
        self._h = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def select(self, table: str, cols: str = "*", **filters) -> list[dict]:
        params = {"select": cols, **filters}
        r = requests.get(f"{self._base}/{table}", headers=self._h, params=params)
        r.raise_for_status()
        return r.json()

    def count(self, table: str, **filters) -> int:
        h = {**self._h, "Prefer": "count=exact"}
        params = {"select": "id", **filters}
        r = requests.get(f"{self._base}/{table}", headers=h, params=params)
        r.raise_for_status()
        total = r.headers.get("Content-Range", "*/0").split("/")[-1]
        return int(total) if total.isdigit() else 0

    def insert(self, table: str, rows: list[dict]) -> None:
        if not rows:
            return
        r = requests.post(
            f"{self._base}/{table}",
            headers={**self._h, "Prefer": "return=minimal"},
            json=rows,
        )
        if not r.ok:
            print(f"    [db error] {r.status_code}: {r.text[:300]}")
        r.raise_for_status()

    def delete(self, table: str, **filters) -> None:
        r = requests.delete(f"{self._base}/{table}", headers=self._h, params=filters)
        r.raise_for_status()


db = DB(SUPABASE_URL, SUPABASE_KEY)


# ── 4. Google Places Text Search ─────────────────────────────────────────────

_PLACES_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"

# Place types that indicate actual operational facilities (not offices/HQs)
_FACILITY_KEYWORDS = [
    "manufacturing facility",
    "processing plant",
    "production facility",
    "distribution center",
]

# Place types to EXCLUDE — these are usually HQs or offices
_EXCLUDE_TYPES = {
    "lodging", "restaurant", "food", "bar", "store", "shopping_mall",
    "school", "hospital", "doctor", "dentist", "bank", "finance",
    "insurance", "real_estate_agency",
}


def _places_search(query: str) -> list[dict]:
    """Single Google Places Text Search call → list of result dicts."""
    r = requests.get(
        _PLACES_URL,
        params={"query": query, "key": GOOGLE_KEY},
        timeout=10,
    )
    data = r.json()
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        print(f"    [places] {data.get('status')}: {data.get('error_message', '')}")
    return data.get("results", [])


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Approximate distance in km between two lat/lng points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _is_duplicate(
    lat: float, lng: float, seen: list[tuple[float, float]], threshold_km: float = 1.0
) -> bool:
    return any(_haversine_km(lat, lng, s[0], s[1]) < threshold_km for s in seen)


def _is_likely_hq(place: dict, supplier_name: str) -> bool:
    """
    Heuristic: skip results that look like a corporate HQ rather than a facility.
    HQs often have types like 'point_of_interest', 'establishment' only, and
    their name exactly matches the company name without facility keywords.
    """
    types = set(place.get("types", []))
    if types & _EXCLUDE_TYPES:
        return True

    name: str = place.get("name", "").lower()
    facility_words = {"plant", "factory", "mill", "refinery", "facility",
                      "processing", "manufacturing", "production", "terminal",
                      "warehouse", "distribution", "center", "depot", "works"}
    # If the result name contains any facility word → keep it
    if any(w in name for w in facility_words):
        return False

    # If the name is just the company name with no qualifier → likely HQ
    company_lower = supplier_name.lower()
    if name.strip() == company_lower or name.strip().startswith(company_lower + " "):
        # Check address for clues
        address: str = place.get("formatted_address", "").lower()
        if not any(w in address for w in {"rd", "hwy", "county", "industrial", "plant"}):
            return True

    return False


def find_facilities(supplier_name: str, max_results: int = 8) -> list[dict]:
    """
    Search Google Places for actual manufacturing / processing facilities of
    a supplier. Returns a deduplicated list of facility dicts with lat/lng.
    """
    seen_coords: list[tuple[float, float]] = []
    facilities: list[dict] = []

    for keyword in _FACILITY_KEYWORDS:
        if len(facilities) >= max_results:
            break

        query = f"{supplier_name} {keyword}"
        results = _places_search(query)
        time.sleep(0.15)  # respect rate limit

        for place in results:
            if len(facilities) >= max_results:
                break

            loc = place.get("geometry", {}).get("location", {})
            lat = loc.get("lat")
            lng = loc.get("lng")
            if lat is None or lng is None:
                continue

            # Deduplicate by distance
            if _is_duplicate(lat, lng, seen_coords):
                continue

            # Skip obvious HQs/non-facilities
            if _is_likely_hq(place, supplier_name):
                continue

            seen_coords.append((lat, lng))

            # Parse address components
            address = place.get("formatted_address", "")
            parts = [p.strip() for p in address.split(",")]
            city = parts[1] if len(parts) > 2 else ""
            # Last part is usually country, second-to-last is "State ZIP"
            state = ""
            if len(parts) >= 3:
                state_zip = parts[-2].strip()
                state = state_zip.split()[0] if state_zip else ""
            country = parts[-1].strip() if parts else "USA"

            facilities.append({
                "facility_name": place.get("name", supplier_name),
                "address": parts[0] if parts else address,
                "city": city,
                "state": state,
                "country": country if country else "USA",
                "lat": lat,
                "lng": lng,
                "place_id": place.get("place_id", ""),
                "types": ", ".join(place.get("types", [])),
            })

    return facilities


# ── 5. Main ───────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Find & store facility locations for Spherecast suppliers")
    parser.add_argument("--dry-run", action="store_true", help="Print results, skip DB writes")
    parser.add_argument("--supplier", default="", help="Filter by supplier name (partial match)")
    parser.add_argument("--reset", default="", help="Delete existing facilities for this supplier, then re-scrape")
    args = parser.parse_args()

    print("\n🏭  Spherecast Facility Locator  (Google Places)\n" + "=" * 50)

    suppliers: list[dict] = db.select("supplier", "id,name")
    print(f"Found {len(suppliers)} suppliers in Supabase\n")

    if args.supplier:
        suppliers = [s for s in suppliers if args.supplier.lower() in s["name"].lower()]
        print(f'Filtered to {len(suppliers)} supplier(s) matching "{args.supplier}"\n')

    if args.reset and not args.dry_run:
        for s in suppliers:
            if args.reset.lower() in s["name"].lower():
                db.delete("supplier_facility", supplier_id=f"eq.{s['id']}")
                print(f"  🗑  Deleted existing facilities for {s['name']}")

    total_facilities = 0
    total_geocoded   = 0

    for supplier in suppliers:
        sid  = supplier["id"]
        name = supplier["name"]

        if not args.reset or args.reset.lower() not in name.lower():
            existing = db.count("supplier_facility", supplier_id=f"eq.{sid}")
            if existing > 0:
                print(f"  ↷  [{sid:>3}] {name}: {existing} facilities already stored — skip")
                continue

        print(f"\n🔍  [{sid:>3}] {name}")

        facilities = find_facilities(name)
        print(f"       → {len(facilities)} facilit{'y' if len(facilities) == 1 else 'ies'} found")

        if not facilities:
            print("       No facilities found — skipping")
            continue

        rows: list[dict] = []
        for fac in facilities:
            lat, lng = fac["lat"], fac["lng"]
            city_s  = fac.get("city", "")
            state_s = fac.get("state", "")
            label   = fac.get("facility_name", name)
            print(f"       • {label} — {city_s}, {state_s}  [{lat:.4f}, {lng:.4f}]")

            rows.append({
                "supplier_id":    sid,
                "facility_name":  label,
                "address":        fac.get("address", ""),
                "city":           city_s,
                "state":          state_s,
                "country":        fac.get("country", "USA"),
                "fda_reg_number": "",
                "lat":            lat,
                "lng":            lng,
            })
            total_geocoded += 1

        if args.dry_run:
            print(f"       [dry-run] would insert {len(rows)} rows")
        else:
            db.insert("supplier_facility", rows)
            print(f"       ✓ Stored {len(rows)} facilities")

        total_facilities += len(rows)
        time.sleep(0.2)  # be polite between suppliers

    print("\n" + "=" * 50)
    print(f"✅  Done!")
    print(f"   Facilities found+geocoded : {total_geocoded}")
    print(f"   Total rows stored         : {total_facilities}")
    if args.dry_run:
        print("   (dry-run — nothing written to DB)")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    main()
