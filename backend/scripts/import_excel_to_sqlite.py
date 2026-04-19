import sqlite3
import pandas as pd
from pathlib import Path
import re

from config import DB_PATH as _DB_PATH

_EXCEL_PATH = Path(__file__).parent.parent / "data" / "CPG_Supplier_Rating_Analysis.xlsx"

def _normalize_name(name: str) -> str:
    name = name.lower()
    for suffix in [", incorporated", ", inc.", " inc.", " inc", " llc", " corp.", " corp",
                   " plc", " sa", " se", " ag", " (adm)", " group", " frères"]:
        name = name.replace(suffix, "")
    # strip parenthetical HQ info like "(US HQ: ...)"
    name = re.sub(r"\s*\(.*?\)", "", name)
    return name.strip()

def _extract_keys(material: str) -> list[str]:
    keys = [material.lower()]
    parens = re.findall(r"\(([^)]+)\)", material)
    for p in parens:
        keys.append(p.lower())
    base = re.sub(r"\s*\(.*?\)", "", material).strip().lower()
    if base:
        keys.append(base)
    simple = re.sub(r"\s*[—–-].*$", "", base).strip()
    if simple and simple != base:
        keys.append(simple)
    return list(dict.fromkeys(keys))

def main():
    if not _EXCEL_PATH.exists():
        print(f"Excel file not found at {_EXCEL_PATH}")
        return

    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()

    # Create tables
    cur.execute("""
    CREATE TABLE IF NOT EXISTS SupplierRating (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        RawName TEXT,
        NormalizedName TEXT,
        Abbreviation TEXT,
        Rank INTEGER,
        Segment TEXT,
        RevenueBn TEXT,
        Certifications TEXT,
        Materials TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS FdaStandard (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Material TEXT,
        SearchKey TEXT,
        CfrCitation TEXT,
        GrasStatus TEXT,
        KeyRequirement TEXT,
        ContaminantLimits TEXT,
        ComplianceNotes TEXT
    )
    """)

    cur.execute("DELETE FROM SupplierRating")
    cur.execute("DELETE FROM FdaStandard")

    print("Importing Supplier Ratings...")
    df_suppliers = pd.read_excel(_EXCEL_PATH, sheet_name="Supplier Overview", header=None)
    for _, row in df_suppliers.iloc[3:].iterrows():
        if pd.isna(row.iloc[1]):
            continue
        raw_name = str(row.iloc[1])
        normalized = _normalize_name(raw_name)
        
        abbr = re.search(r"\(([A-Z]{2,})\)", raw_name)
        abbreviation = abbr.group(1).lower() if abbr else None

        rank = int(row.iloc[0]) if not pd.isna(row.iloc[0]) else 99
        segment = str(row.iloc[4]) if not pd.isna(row.iloc[4]) else ""
        revenue = str(row.iloc[5]) if not pd.isna(row.iloc[5]) else ""
        
        certs_raw = str(row.iloc[6]) if not pd.isna(row.iloc[6]) else ""
        certs = ",".join([c.strip() for c in certs_raw.split(",") if c.strip()])
        
        materials_raw = str(row.iloc[8]) if not pd.isna(row.iloc[8]) else ""
        materials = ",".join([m.strip() for m in materials_raw.split(",") if m.strip()])

        cur.execute("""
            INSERT INTO SupplierRating (RawName, NormalizedName, Abbreviation, Rank, Segment, RevenueBn, Certifications, Materials)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (raw_name, normalized, abbreviation, rank, segment, revenue, certs, materials))


    print("Importing FDA Standards...")
    df_fda = pd.read_excel(_EXCEL_PATH, sheet_name="FDA Minimum Standards", header=None)
    for _, row in df_fda.iloc[2:].iterrows():
        if pd.isna(row.iloc[0]):
            continue
        raw_material = str(row.iloc[0])
        keys = _extract_keys(raw_material)
        
        cfr = str(row.iloc[1]) if not pd.isna(row.iloc[1]) else ""
        gras = str(row.iloc[2]) if not pd.isna(row.iloc[2]) else ""
        key_req = str(row.iloc[3]) if not pd.isna(row.iloc[3]) else ""
        contam = str(row.iloc[4]) if not pd.isna(row.iloc[4]) else ""
        notes = str(row.iloc[5]) if not pd.isna(row.iloc[5]) else ""

        for key in keys:
            cur.execute("""
                INSERT INTO FdaStandard (Material, SearchKey, CfrCitation, GrasStatus, KeyRequirement, ContaminantLimits, ComplianceNotes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (raw_material, key, cfr, gras, key_req, contam, notes))

    conn.commit()
    
    cur.execute("CREATE INDEX IF NOT EXISTS idx_supplier_norm ON SupplierRating(NormalizedName)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_supplier_abbr ON SupplierRating(Abbreviation)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_fda_key ON FdaStandard(SearchKey)")

    cur.execute("SELECT COUNT(*) FROM SupplierRating")
    print(f"Imported {cur.fetchone()[0]} suppliers.")
    
    cur.execute("SELECT COUNT(*) FROM FdaStandard")
    print(f"Imported {cur.fetchone()[0]} FDA standard keys.")

    conn.close()

if __name__ == "__main__":
    main()
