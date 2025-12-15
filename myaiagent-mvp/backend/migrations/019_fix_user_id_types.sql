-- Migration: Fix user_id column types to UUID
-- This migration fixes type mismatches between user_id columns and the users table id (UUID)
-- It's safe to run even if columns don't exist

-- Helper: Drop foreign keys before altering column types
DO $$
BEGIN
  -- Drop foreign key constraints if they exist
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversations_user_id_fkey') THEN
    ALTER TABLE conversations DROP CONSTRAINT conversations_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'activity_logs_user_id_fkey') THEN
    ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'search_history_user_id_fkey') THEN
    ALTER TABLE search_history DROP CONSTRAINT search_history_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'memory_facts_user_id_fkey') THEN
    ALTER TABLE memory_facts DROP CONSTRAINT memory_facts_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'memory_facts_approved_by_fkey') THEN
    ALTER TABLE memory_facts DROP CONSTRAINT memory_facts_approved_by_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'system_config_updated_by_fkey') THEN
    ALTER TABLE system_config DROP CONSTRAINT system_config_updated_by_fkey;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'capability_gaps_user_id_fkey') THEN
    ALTER TABLE capability_gaps DROP CONSTRAINT capability_gaps_user_id_fkey;
  END IF;
END $$;

-- Alter column types from INTEGER to UUID
DO $$
BEGIN
  -- conversations.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'user_id' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE conversations ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
  END IF;
  
  -- activity_logs.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_logs' AND column_name = 'user_id' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE activity_logs ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
  END IF;
  
  -- search_history.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_history' AND column_name = 'user_id' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE search_history ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
  END IF;
  
  -- memory_facts.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'user_id' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE memory_facts ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
  END IF;
  
  -- memory_facts.approved_by
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'approved_by' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE memory_facts ALTER COLUMN approved_by TYPE UUID USING approved_by::UUID;
  END IF;
  
  -- system_config.updated_by
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_config' AND column_name = 'updated_by' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE system_config ALTER COLUMN updated_by TYPE UUID USING updated_by::UUID;
  END IF;
  
  -- capability_gaps.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'capability_gaps' AND column_name = 'user_id' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE capability_gaps ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
  END IF;
END $$;

-- Re-add foreign key constraints
DO $$
BEGIN
  -- conversations_user_id_fkey
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'conversations' AND constraint_name = 'conversations_user_id_fkey'
  ) THEN
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  -- activity_logs_user_id_fkey
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'activity_logs' AND constraint_name = 'activity_logs_user_id_fkey'
  ) THEN
    ALTER TABLE activity_logs 
    ADD CONSTRAINT activity_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  -- search_history_user_id_fkey
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'search_history' AND constraint_name = 'search_history_user_id_fkey'
  ) THEN
    ALTER TABLE search_history 
    ADD CONSTRAINT search_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  -- memory_facts_user_id_fkey
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'memory_facts' AND constraint_name = 'memory_facts_user_id_fkey'
  ) THEN
    ALTER TABLE memory_facts 
    ADD CONSTRAINT memory_facts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  -- memory_facts_approved_by_fkey
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'memory_facts' AND constraint_name = 'memory_facts_approved_by_fkey'
  ) THEN
    ALTER TABLE memory_facts 
    ADD CONSTRAINT memory_facts_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  -- system_config_updated_by_fkey
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'system_config' AND constraint_name = 'system_config_updated_by_fkey'
  ) THEN
    ALTER TABLE system_config 
    ADD CONSTRAINT system_config_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  -- capability_gaps_user_id_fkey
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'capability_gaps' AND constraint_name = 'capability_gaps_user_id_fkey'
  ) THEN
    ALTER TABLE capability_gaps 
    ADD CONSTRAINT capability_gaps_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure system_performance_metrics has all required columns
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'value'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN value NUMERIC;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'unit'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN unit VARCHAR(20);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'tags'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN tags JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
