-- Migration 053: Add UEI and Cage Code to Organizations for Award Linking
-- Links internal organizations to external award data (FPDS)

-- Add uei and cage_code columns to organizations table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'uei') THEN
      ALTER TABLE organizations ADD COLUMN uei VARCHAR(50);
      CREATE INDEX idx_organizations_uei ON organizations(uei);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'cage_code') THEN
      ALTER TABLE organizations ADD COLUMN cage_code VARCHAR(50);
      CREATE INDEX idx_organizations_cage_code ON organizations(cage_code);
    END IF;

  END IF;
END $$;

-- Ensure fpds_contract_awards has index on vendor_uei (should already exist from migration 030, but safe to check)
CREATE INDEX IF NOT EXISTS idx_fpds_awards_vendor_uei ON fpds_contract_awards(vendor_uei);
