-- Migration to add Full Text Search (FTS) and performance indexes to samgov_opportunities_cache

-- 1. Add tsvector column
ALTER TABLE samgov_opportunities_cache ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Update existing rows with generated tsvector
-- We weight title as 'A' (most important), solicitation_number as 'B', and description as 'C'
UPDATE samgov_opportunities_cache 
SET search_vector = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') || 
    setweight(to_tsvector('english', COALESCE(solicitation_number, '')), 'B') || 
    setweight(to_tsvector('english', COALESCE(description, '')), 'C');

-- 3. Create GIN index on the search vector
CREATE INDEX IF NOT EXISTS idx_samgov_search_vector ON samgov_opportunities_cache USING GIN (search_vector);

-- 4. Create trigger to automatically update the search vector on insert/update
CREATE OR REPLACE FUNCTION update_samgov_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') || 
    setweight(to_tsvector('english', COALESCE(NEW.solicitation_number, '')), 'B') || 
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to allow re-running this migration safely
DROP TRIGGER IF EXISTS trg_update_samgov_search_vector ON samgov_opportunities_cache;

CREATE TRIGGER trg_update_samgov_search_vector
BEFORE INSERT OR UPDATE ON samgov_opportunities_cache
FOR EACH ROW EXECUTE FUNCTION update_samgov_search_vector();

-- 5. Add B-Tree indexes for commonly filtered fields
CREATE INDEX IF NOT EXISTS idx_samgov_type ON samgov_opportunities_cache (type);
CREATE INDEX IF NOT EXISTS idx_samgov_naics ON samgov_opportunities_cache (naics_code);
CREATE INDEX IF NOT EXISTS idx_samgov_set_aside ON samgov_opportunities_cache (set_aside_type);
CREATE INDEX IF NOT EXISTS idx_samgov_posted_date ON samgov_opportunities_cache (posted_date);
CREATE INDEX IF NOT EXISTS idx_samgov_response_deadline ON samgov_opportunities_cache (response_deadline);

-- Wait for the UI fast load (ordering)
CREATE INDEX IF NOT EXISTS idx_samgov_last_seen ON samgov_opportunities_cache (last_seen_at DESC);
