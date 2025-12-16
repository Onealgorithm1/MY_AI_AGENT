-- Migration 037: Expand Role System
-- Purpose: Add master_admin and superadmin roles to support hierarchical access control
-- This migration is backward compatible - existing 'admin' role remains unchanged

DO $$
BEGIN
  -- Check if users table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Drop existing role constraint
    BEGIN
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;

    -- Add new constraint with expanded roles
    ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('user', 'admin', 'moderator', 'master_admin', 'superadmin'));

    -- Migrate existing admin@myaiagent.com to master_admin role
    UPDATE users SET role = 'master_admin' 
    WHERE email = 'admin@myaiagent.com' AND role = 'admin';

    RAISE NOTICE 'Successfully updated users table with expanded role system';
  ELSE
    RAISE NOTICE 'Users table does not exist yet';
  END IF;
END $$;

-- Create indexes for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role_master ON users(role) 
  WHERE role IN ('master_admin', 'superadmin');
