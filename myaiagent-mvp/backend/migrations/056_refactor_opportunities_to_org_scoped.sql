-- Migration 056: Refactor Opportunities to Organization-Scoped (Many-to-Many)
-- Allows multiple organizations to track the same SAM.gov opportunity independently.

-- 1. Remove the existing unique constraints
-- We previously had notice_id UNIQUE, then changed it to (notice_id, created_by)
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_notice_id_key;
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_notice_id_created_by_key;

-- 2. Ensure organization_id has a default or is NOT NULL if possible
-- For existing rows, we'll try to populate organization_id from created_by's organization if it's null
UPDATE opportunities o
SET organization_id = (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = o.created_by 
    LIMIT 1
)
WHERE organization_id IS NULL;

-- 3. Add the new composite unique constraint (notice_id, organization_id)
-- This ensures an organization can only have one tracking record for a specific opportunity
-- but different organizations can each have their own.
ALTER TABLE opportunities ADD CONSTRAINT opportunities_notice_id_organization_id_key UNIQUE (notice_id, organization_id);

-- 4. Ensure opportunity_activity has organization_id for better auditing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'opportunity_activity' AND column_name = 'organization_id') THEN
        ALTER TABLE opportunity_activity ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
        CREATE INDEX idx_opportunity_activity_org ON opportunity_activity(organization_id);
    END IF;
END $$;

-- 5. Backfill organization_id in activity logs
UPDATE opportunity_activity oa
SET organization_id = (
    SELECT organization_id 
    FROM opportunities 
    WHERE id = oa.opportunity_id
)
WHERE organization_id IS NULL;

COMMENT ON CONSTRAINT opportunities_notice_id_organization_id_key ON opportunities IS 'Ensures unique opportunity per organization for many-to-many pipeline support';
