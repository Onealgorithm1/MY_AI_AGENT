-- Migration 039: Update Organization User Roles
-- Purpose: Ensure organization_users.role constraint is properly set for role-based access control

DO $$
BEGIN
  -- Check if organization_users table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_users') THEN
    -- Drop existing role constraint if present
    BEGIN
      ALTER TABLE organization_users DROP CONSTRAINT IF EXISTS organization_users_role_check;
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;

    -- Add constraint with all required roles: owner, admin, member
    ALTER TABLE organization_users ADD CONSTRAINT organization_users_role_check 
      CHECK (role IN ('owner', 'admin', 'member'));

    -- Create indexes for role-based queries
    CREATE INDEX IF NOT EXISTS idx_org_users_role_admin ON organization_users(organization_id, role)
      WHERE role IN ('admin', 'owner');

    RAISE NOTICE 'Successfully updated organization_users table role constraints';
  ELSE
    RAISE NOTICE 'organization_users table does not exist yet';
  END IF;
END $$;

-- Role Hierarchy:
-- - owner: Created automatically when user creates organization
-- - admin: Can manage org users, API keys, settings
-- - member: Regular user with access to org features only
