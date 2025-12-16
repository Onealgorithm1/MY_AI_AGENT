-- ============================================
-- Migration: Properly Fix API Secrets Unique Constraint
-- ============================================
-- This migration fixes the critical issue where the api_secrets table
-- doesn't have the unique constraint on (service_name, key_label)
-- that the application code expects for UPSERT operations

DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  -- Check if the table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'api_secrets') THEN
    -- Check if the unique constraint on (service_name, key_label) exists
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'api_secrets'::regclass
      AND contype = 'u'
      AND conname = 'api_secrets_service_name_key_label_key'
    ) INTO v_constraint_exists;

    IF NOT v_constraint_exists THEN
      -- First, check if there's an old UNIQUE constraint on key_name and drop it
      BEGIN
        ALTER TABLE api_secrets DROP CONSTRAINT IF EXISTS api_secrets_key_name_key;
        RAISE NOTICE 'Dropped old unique constraint on key_name';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No old key_name constraint to drop';
      END;

      -- Remove any duplicate rows that would prevent adding the constraint
      -- Keep the most recently updated one for each (service_name, key_label) combination
      DELETE FROM api_secrets a WHERE id NOT IN (
        SELECT MAX(id) FROM api_secrets b
        WHERE a.service_name = b.service_name 
        AND a.key_label = b.key_label
        GROUP BY b.service_name, b.key_label
      );

      -- Now add the unique constraint
      ALTER TABLE api_secrets
      ADD CONSTRAINT api_secrets_service_name_key_label_key
      UNIQUE (service_name, key_label);
      
      RAISE NOTICE 'Added UNIQUE constraint on (service_name, key_label)';
    ELSE
      RAISE NOTICE 'UNIQUE constraint on (service_name, key_label) already exists';
    END IF;
  ELSE
    RAISE NOTICE 'api_secrets table does not exist';
  END IF;
END $$;

-- Create or verify indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_secrets_service_name ON api_secrets(service_name);
CREATE INDEX IF NOT EXISTS idx_api_secrets_is_active ON api_secrets(is_active);
CREATE INDEX IF NOT EXISTS idx_api_secrets_is_default ON api_secrets(is_default);
CREATE INDEX IF NOT EXISTS idx_api_secrets_key_type ON api_secrets(key_type);
