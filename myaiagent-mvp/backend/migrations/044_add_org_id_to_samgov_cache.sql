-- Add organization_id to samgov_opportunities_cache for multi-tenant isolation
ALTER TABLE samgov_opportunities_cache 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_samgov_cache_org_id ON samgov_opportunities_cache(organization_id);

-- Update RLS or security policies would handle access, but we'll do it in application logic for now.
-- Optionally, backfill existing records to a default organization or NULL (System)
