-- Supplier facilities: actual manufacturing/distribution locations from FDA registration
-- More accurate than company HQ for supply chain visualization

CREATE TABLE IF NOT EXISTS supplier_facility (
  id                SERIAL PRIMARY KEY,
  supplier_id       INTEGER NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
  facility_name     TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  country           TEXT NOT NULL DEFAULT 'USA',
  fda_reg_number    TEXT,
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_facility_supplier
  ON supplier_facility (supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_facility_coords
  ON supplier_facility (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

ALTER TABLE supplier_facility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_supplier_facility"
  ON supplier_facility FOR SELECT USING (true);
