-- Migration: 041_add_org_id_to_activity_logs.sql
-- Description: Adds organization_id to activity_logs for multitenant audit trails

ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON activity_logs(organization_id);
