-- Add geocoded coordinates to company and supplier tables
-- Run this in the Supabase SQL Editor

ALTER TABLE company
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

ALTER TABLE supplier
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Indexes for map queries (only geocoded rows)
CREATE INDEX IF NOT EXISTS idx_company_geocoded  ON company  (id) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_geocoded ON supplier (id) WHERE lat IS NOT NULL AND lng IS NOT NULL;
