import sqlite3
import re

from config import DB_PATH as _DB_PATH

def _normalize_name(name: str) -> str:
    name = name.lower()
    for suffix in [", incorporated", ", inc.", " inc.", " inc", " llc", " corp.", " corp",
                   " plc", " sa", " se", " ag", " (adm)", " group", " frères"]:
        name = name.replace(suffix, "")
    name = re.sub(r"\s*\(.*?\)", "", name)
    return name.strip()

def _parse_name_from_sku(sku: str) -> str:
    m = re.match(r"RM-C\d+-(.+)-[0-9a-f]{8}$", sku)
    if m:
        return m.group(1).replace("-", " ")
    return sku

def main():
    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()

    # Create mapping tables (does NOT alter existing main tables)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS Map_Product_FdaStandard (
        ProductId INTEGER PRIMARY KEY,
        FdaStandardId INTEGER,
        FOREIGN KEY(ProductId) REFERENCES Product(Id),
        FOREIGN KEY(FdaStandardId) REFERENCES FdaStandard(Id)
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS Map_Supplier_SupplierRating (
        SupplierId INTEGER PRIMARY KEY,
        SupplierRatingId INTEGER,
        FOREIGN KEY(SupplierId) REFERENCES Supplier(Id),
        FOREIGN KEY(SupplierRatingId) REFERENCES SupplierRating(Id)
    )
    """)
    
    cur.execute("DELETE FROM Map_Product_FdaStandard")
    cur.execute("DELETE FROM Map_Supplier_SupplierRating")

    # 1. Map Suppliers
    cur.execute("SELECT Id, Name FROM Supplier")
    suppliers = cur.fetchall()
    
    supplier_mappings = 0
    for sid, sname in suppliers:
        key = _normalize_name(sname)
        
        cur.execute("SELECT Id FROM SupplierRating WHERE NormalizedName = ?", (key,))
        row = cur.fetchone()
        
        if not row:
            abbr = re.search(r"\(([A-Z]{2,})\)", sname)
            if abbr:
                cur.execute("SELECT Id FROM SupplierRating WHERE Abbreviation = ?", (abbr.group(1).lower(),))
                row = cur.fetchone()
                
        if not row:
            cur.execute("SELECT Id FROM SupplierRating WHERE NormalizedName LIKE ? OR RawName LIKE ? LIMIT 1", (f"%{key}%", f"%{sname}%"))
            row = cur.fetchone()
            
        if row:
            cur.execute("INSERT INTO Map_Supplier_SupplierRating (SupplierId, SupplierRatingId) VALUES (?, ?)", (sid, row[0]))
            supplier_mappings += 1

    # 2. Map Raw Materials
    cur.execute("SELECT Id, SKU FROM Product WHERE Type = 'raw-material'")
    products = cur.fetchall()
    
    product_mappings = 0
    for pid, sku in products:
        ingredient_name = _parse_name_from_sku(sku)
        name_lower = ingredient_name.lower().strip()
        
        cur.execute("SELECT Id FROM FdaStandard WHERE SearchKey = ?", (name_lower,))
        row = cur.fetchone()
        
        if not row:
            cur.execute("SELECT Id FROM FdaStandard WHERE SearchKey LIKE ? OR Material LIKE ? LIMIT 1", (f"%{name_lower}%", f"%{name_lower}%"))
            row = cur.fetchone()
            
        if row:
            cur.execute("INSERT INTO Map_Product_FdaStandard (ProductId, FdaStandardId) VALUES (?, ?)", (pid, row[0]))
            product_mappings += 1

    conn.commit()
    conn.close()
    
    print(f"Mapped {supplier_mappings} Suppliers to Ratings.")
    print(f"Mapped {product_mappings} Raw Materials to FDA Standards.")

if __name__ == "__main__":
    main()
