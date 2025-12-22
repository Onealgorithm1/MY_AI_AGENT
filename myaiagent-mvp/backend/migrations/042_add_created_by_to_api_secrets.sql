-- Migration 042: Add created_by to api_secrets
-- Purpose: Add created_by column to track who added the API key

DO $$
BEGIN
  -- Check if created_by column exists in api_secrets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_secrets' AND column_name = 'created_by'
  ) THEN
    -- Add the column
    ALTER TABLE api_secrets ADD COLUMN created_by INTEGER;
    
    -- Add foreign key constraint
    ALTER TABLE api_secrets ADD CONSTRAINT fk_api_secrets_created_by 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
      
    RAISE NOTICE 'Added created_by column to api_secrets table';
  ELSE
    RAISE NOTICE 'created_by column already exists on api_secrets table';
  END IF;
END $$;
