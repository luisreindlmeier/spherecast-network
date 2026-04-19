import sqlite3
import pandas as pd
from pathlib import Path
import re

from config import DB_PATH as _DB_PATH

_DATA_DIR = Path(__file__).parent.parent / "data"

def clean_columns(df):
    df.columns = [str(c).replace('\n', ' ').strip() for c in df.columns]
    return df

def import_l1(conn):
    file_path = _DATA_DIR / "FDA_Sourcing_Framework_GMO - L1 – Eligibility Gate.csv"
    if not file_path.exists():
        return
    # First row is empty
    df = pd.read_csv(file_path, skiprows=1)
    df = df.dropna(how='all')
    df = clean_columns(df)
    
    # Add a normalized search key for SQL lookup
    def make_key(mat):
        if pd.isna(mat): return None
        base = re.sub(r"\s*\(.*?\)", "", str(mat)).strip().lower()
        return base
        
    df['SearchKey'] = df['Material'].apply(make_key)
    df.to_sql("Framework_L1_Eligibility", conn, if_exists="replace", index=False)
    print(f"Imported {len(df)} rows to Framework_L1_Eligibility")

def import_l2(conn):
    file_path = _DATA_DIR / "FDA_Sourcing_Framework_GMO - L2 – Specification Floors.csv"
    if not file_path.exists():
        return
    df = pd.read_csv(file_path)
    df = df.dropna(subset=["Material", "Quality / GMO Parameter"], how='all')
    df = clean_columns(df)
    
    def make_key(mat):
        if pd.isna(mat): return None
        base = re.sub(r"\s*\(.*?\)", "", str(mat)).strip().lower()
        return base
        
    df['SearchKey'] = df['Material'].apply(make_key)
    df.to_sql("Framework_L2_Specs", conn, if_exists="replace", index=False)
    print(f"Imported {len(df)} rows to Framework_L2_Specs")

def import_gmo(conn):
    file_path = _DATA_DIR / "FDA_Sourcing_Framework_GMO - GMO – BE Disclosure Framework.csv"
    if not file_path.exists():
        return
    # First row is a section title
    df = pd.read_csv(file_path, skiprows=1)
    df = df.dropna(subset=["Crop / Substance", "Common Use in CPG"], how='all')
    df = clean_columns(df)
    
    def make_key(mat):
        if pd.isna(mat): return None
        base = re.sub(r"\s*\(.*?\)", "", str(mat)).strip().lower()
        return base
        
    df['SearchKey'] = df['Crop / Substance'].apply(make_key)
    df.to_sql("Framework_GmoDisclosure", conn, if_exists="replace", index=False)
    print(f"Imported {len(df)} rows to Framework_GmoDisclosure")

def main():
    conn = sqlite3.connect(_DB_PATH)
    import_l1(conn)
    import_l2(conn)
    import_gmo(conn)
    
    cur = conn.cursor()
    cur.execute("CREATE INDEX IF NOT EXISTS idx_l1_key ON Framework_L1_Eligibility(SearchKey)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_l2_key ON Framework_L2_Specs(SearchKey)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gmo_key ON Framework_GmoDisclosure(SearchKey)")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()
