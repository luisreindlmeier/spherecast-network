"""
One-time migration: copies Supabase-only data into SQLite.

Adds to SQLite:
  - Company.Lat, Company.Lng
  - Supplier.Lat, Supplier.Lng
  - SupplierFacility table (entire)

Run once before deleting Supabase:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python scripts/migrate_supabase_to_sqlite.py
"""
import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

DB_PATH = Path(os.getenv("DB_PATH", str(Path(__file__).parent.parent / "data" / "db.sqlite")))
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def main() -> None:
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # ── 1. Add lat/lng columns to Company and Supplier ──────────────────────
    for table, col in [("Company", "Lat"), ("Company", "Lng"), ("Supplier", "Lat"), ("Supplier", "Lng")]:
        try:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} REAL")
            print(f"Added {table}.{col}")
        except sqlite3.OperationalError:
            print(f"{table}.{col} already exists — skipping")

    # ── 2. Create SupplierFacility table ────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS SupplierFacility (
            Id            INTEGER PRIMARY KEY,
            SupplierId    INTEGER NOT NULL REFERENCES Supplier(Id),
            FacilityName  TEXT,
            Address       TEXT,
            City          TEXT,
            State         TEXT,
            Country       TEXT DEFAULT 'USA',
            FdaRegNumber  TEXT,
            Lat           REAL,
            Lng           REAL,
            CreatedAt     TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sf_supplier ON SupplierFacility(SupplierId)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sf_coords ON SupplierFacility(Lat, Lng)")
    print("SupplierFacility table ready")

    # ── 3. Copy company geocoords ────────────────────────────────────────────
    all_companies = sb.table("company").select("id,lat,lng").execute().data
    companies = [r for r in all_companies if r.get("lat") is not None]
    updated = 0
    for row in companies:
        cur.execute("UPDATE Company SET Lat=?, Lng=? WHERE Id=?", (row["lat"], row["lng"], row["id"]))
        updated += cur.rowcount
    print(f"Company geocoords updated: {updated}/{len(companies)}")

    # ── 4. Copy supplier geocoords ───────────────────────────────────────────
    all_suppliers = sb.table("supplier").select("id,lat,lng").execute().data
    suppliers = [r for r in all_suppliers if r.get("lat") is not None]
    updated = 0
    for row in suppliers:
        cur.execute("UPDATE Supplier SET Lat=?, Lng=? WHERE Id=?", (row["lat"], row["lng"], row["id"]))
        updated += cur.rowcount
    print(f"Supplier geocoords updated: {updated}/{len(suppliers)}")

    # ── 5. Copy supplier_facility rows ───────────────────────────────────────
    facilities = sb.table("supplier_facility").select("*").execute().data
    cur.execute("DELETE FROM SupplierFacility")
    for f in facilities:
        cur.execute("""
            INSERT INTO SupplierFacility
              (Id, SupplierId, FacilityName, Address, City, State, Country, FdaRegNumber, Lat, Lng, CreatedAt)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (
            f["id"], f["supplier_id"], f.get("facility_name"), f.get("address"),
            f.get("city"), f.get("state"), f.get("country", "USA"),
            f.get("fda_reg_number"), f.get("lat"), f.get("lng"),
            f.get("created_at"),
        ))
    print(f"SupplierFacility rows inserted: {len(facilities)}")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    main()
