-- Create company_profile_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_profile_cache (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  website_url TEXT,
  capabilities JSONB DEFAULT '{}'::jsonb,
  certifications JSONB DEFAULT '{}'::jsonb,
  naics_codes TEXT[] DEFAULT '{}',
  psc_codes TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_org_profile UNIQUE (organization_id)
);

-- Add index on organization_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_profile_org ON company_profile_cache(organization_id);
