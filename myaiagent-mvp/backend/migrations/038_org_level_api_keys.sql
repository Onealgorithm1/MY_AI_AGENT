-- Migration 038: Link API Keys to Organizations
-- Purpose: Allow each organization to have their own API keys while maintaining backward compatibility
-- Existing keys (organization_id = NULL) are treated as global system keys

DO $$
BEGIN
  -- Check if api_secrets table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_secrets') THEN
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'api_secrets' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE api_secrets ADD COLUMN organization_id INTEGER;
      
      -- Add foreign key constraint
      ALTER TABLE api_secrets ADD CONSTRAINT fk_api_secrets_org_id
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
      
      RAISE NOTICE 'Added organization_id column to api_secrets table';
    ELSE
      RAISE NOTICE 'organization_id column already exists on api_secrets table';
    END IF;

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_api_secrets_org ON api_secrets(organization_id);
    CREATE INDEX IF NOT EXISTS idx_api_secrets_org_service ON api_secrets(organization_id, service_name);
    CREATE INDEX IF NOT EXISTS idx_api_secrets_active_org ON api_secrets(is_active, organization_id);

  ELSE
    RAISE NOTICE 'api_secrets table does not exist yet';
  END IF;
END $$;

-- Document the migration:
-- - Existing API keys have organization_id = NULL (system/global keys)
-- - New keys created by org admins will have organization_id set
-- - API key resolution: try org key first, then fall back to global key
-- - This maintains backward compatibility with existing system
