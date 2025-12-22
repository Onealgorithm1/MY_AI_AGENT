-- Migration 045: Isolate SAM.gov Opportunities Cache per Organization
-- Changes the unique constraint from (notice_id) to (notice_id, organization_id)
-- allowing strictly isolated caches for different organizations.

BEGIN;

-- Drop the existing unique constraint on notice_id
-- Note: The constraint name is typically samgov_opportunities_cache_notice_id_key
-- We use IF EXISTS to be safe
ALTER TABLE samgov_opportunities_cache DROP CONSTRAINT IF EXISTS samgov_opportunities_cache_notice_id_key;

-- We also need to drop the index if it was created separately (though usually implicit with UNIQUE)
DROP INDEX IF EXISTS idx_samgov_cache_notice_id;

-- Create the new composite unique constraint. 
-- We handle NULL organization_id (system/public) by using COALESCE in a unique index 
-- or by using NULLS NOT DISTINCT (PG15+). 
-- Since we don't know the PG version, checking uniqueness via index on COALESCE is robust for older versions too.
-- Assuming organization_id is positive, -1 is safe.
CREATE UNIQUE INDEX idx_samgov_cache_unique_org 
ON samgov_opportunities_cache (notice_id, COALESCE(organization_id, -1));

-- Re-create the index for notice_id separately for performance if needed looking up by notice_id broadly
CREATE INDEX idx_samgov_cache_notice_id ON samgov_opportunities_cache(notice_id);

COMMIT;
