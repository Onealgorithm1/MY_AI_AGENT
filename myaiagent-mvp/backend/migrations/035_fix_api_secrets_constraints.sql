-- ============================================
-- Migration: Fix API Secrets Constraints
-- ============================================
-- This migration fixes the api_secrets table to support UPSERT on (service_name, key_label)
-- Previously, the table had a UNIQUE constraint on key_name which conflicted with the design
-- of allowing multiple keys per service with different labels

DO $$
BEGIN
  -- Step 1: Check if the table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'api_secrets') THEN
    -- Step 2: Drop the old UNIQUE constraint on key_name if it exists
    BEGIN
      ALTER TABLE api_secrets DROP CONSTRAINT api_secrets_key_name_key;
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;

    -- Step 3: Add the new UNIQUE constraint on (service_name, key_label) if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'api_secrets'
      AND indexname = 'api_secrets_service_name_key_label_key'
    ) THEN
      ALTER TABLE api_secrets
      ADD CONSTRAINT api_secrets_service_name_key_label_key
      UNIQUE (service_name, key_label);
    END IF;

    -- Step 4: Verify the table has all required columns
    BEGIN
      ALTER TABLE api_secrets
      ADD COLUMN IF NOT EXISTS key_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS key_label VARCHAR(255),
      ADD COLUMN IF NOT EXISTS key_value TEXT NOT NULL,
      ADD COLUMN IF NOT EXISTS key_type VARCHAR(50) DEFAULT 'api_key',
      ADD COLUMN IF NOT EXISTS service_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS docs_url TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

  END IF;
END $$;
