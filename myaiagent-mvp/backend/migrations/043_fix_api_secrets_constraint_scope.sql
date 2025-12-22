-- ============================================
-- Migration: Fix API Secrets Unique Constraint Scope
-- ============================================
-- This migration fixes the issue where keys with the same label
-- could not exist in different organizations because the unique constraint
-- was global (service_name, key_label) instead of scoped by organization.

DO $$
BEGIN
  -- Drop the incorrect global constraint if it exists
  IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'api_secrets'::regclass
      AND conname = 'api_secrets_service_name_key_label_key'
  ) THEN
    ALTER TABLE api_secrets DROP CONSTRAINT api_secrets_service_name_key_label_key;
    RAISE NOTICE 'Dropped incorrect global constraint api_secrets_service_name_key_label_key';
  END IF;

  -- Create scoped unique index for Organization keys
  IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'api_secrets' AND indexname = 'idx_api_secrets_org_scope'
  ) THEN
    CREATE UNIQUE INDEX idx_api_secrets_org_scope 
    ON api_secrets (service_name, key_label, organization_id) 
    WHERE organization_id IS NOT NULL;
    RAISE NOTICE 'Created scoped index idx_api_secrets_org_scope';
  END IF;

  -- Create scoped unique index for System keys (where organization_id is NULL)
  IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'api_secrets' AND indexname = 'idx_api_secrets_system_scope'
  ) THEN
    CREATE UNIQUE INDEX idx_api_secrets_system_scope 
    ON api_secrets (service_name, key_label) 
    WHERE organization_id IS NULL;
    RAISE NOTICE 'Created scoped index idx_api_secrets_system_scope';
  END IF;
END $$;
