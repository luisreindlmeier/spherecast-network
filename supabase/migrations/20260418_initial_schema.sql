-- Spherecast Supply Chain Schema
-- Migrated from SQLite → PostgreSQL (Supabase)
-- Convention: lowercase snake_case (PostgreSQL idiomatic)

-- ────────────────────────────────────────────
-- Companies
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

-- ────────────────────────────────────────────
-- Products (finished-good | raw-material)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product (
  id         INTEGER PRIMARY KEY,
  sku        TEXT NOT NULL,
  company_id INTEGER NOT NULL REFERENCES company (id),
  type       TEXT NOT NULL CHECK (type IN ('finished-good', 'raw-material'))
);

CREATE INDEX IF NOT EXISTS idx_product_company ON product (company_id);
CREATE INDEX IF NOT EXISTS idx_product_type    ON product (type);

-- ────────────────────────────────────────────
-- Bill of Materials (1 BOM per finished-good)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bom (
  id                  INTEGER PRIMARY KEY,
  produced_product_id INTEGER NOT NULL UNIQUE REFERENCES product (id)
);

-- ────────────────────────────────────────────
-- BOM Components (BOM → many Products)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bom_component (
  bom_id              INTEGER NOT NULL REFERENCES bom (id),
  consumed_product_id INTEGER NOT NULL REFERENCES product (id),
  PRIMARY KEY (bom_id, consumed_product_id)
);

CREATE INDEX IF NOT EXISTS idx_bom_component_consumed ON bom_component (consumed_product_id);

-- ────────────────────────────────────────────
-- Suppliers
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

-- ────────────────────────────────────────────
-- Supplier ↔ Product (n:m)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_product (
  supplier_id INTEGER NOT NULL REFERENCES supplier (id),
  product_id  INTEGER NOT NULL REFERENCES product (id),
  PRIMARY KEY (supplier_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_product_product ON supplier_product (product_id);

-- ────────────────────────────────────────────
-- Row Level Security (anon read-only)
-- ────────────────────────────────────────────
ALTER TABLE company          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_component    ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier         ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_product ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_company"          ON company          FOR SELECT USING (true);
CREATE POLICY "anon_read_product"          ON product          FOR SELECT USING (true);
CREATE POLICY "anon_read_bom"              ON bom              FOR SELECT USING (true);
CREATE POLICY "anon_read_bom_component"    ON bom_component    FOR SELECT USING (true);
CREATE POLICY "anon_read_supplier"         ON supplier         FOR SELECT USING (true);
CREATE POLICY "anon_read_supplier_product" ON supplier_product FOR SELECT USING (true);
