-- Migration: Final Schema Cleanup and Type Consistency
-- Purpose: Ensure all user_id columns are INTEGER to match users.id (SERIAL/INTEGER)
-- This is a safety migration that catches any remaining type mismatches
-- Safe to run multiple times - uses IF EXISTS checks

-- ============================================
-- Ensure all user_id columns are INTEGER
-- ============================================

-- Fix any remaining UUID user_id columns in core tables
DO $$
BEGIN
  -- conversations.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
    ALTER TABLE conversations ALTER COLUMN user_id TYPE INTEGER USING user_id::text::integer;
    ALTER TABLE conversations ADD CONSTRAINT conversations_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Fixed conversations.user_id: UUID -> INTEGER';
  END IF;

  -- memory_facts.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE memory_facts DROP CONSTRAINT IF EXISTS memory_facts_user_id_fkey;
    ALTER TABLE memory_facts ALTER COLUMN user_id TYPE INTEGER USING user_id::text::integer;
    ALTER TABLE memory_facts ADD CONSTRAINT memory_facts_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Fixed memory_facts.user_id: UUID -> INTEGER';
  END IF;

  -- memory_facts.approved_by
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'approved_by' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE memory_facts DROP CONSTRAINT IF EXISTS memory_facts_approved_by_fkey;
    ALTER TABLE memory_facts ALTER COLUMN approved_by TYPE INTEGER USING approved_by::text::integer;
    ALTER TABLE memory_facts ADD CONSTRAINT memory_facts_approved_by_fkey 
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Fixed memory_facts.approved_by: UUID -> INTEGER';
  END IF;

  -- activity_logs.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_logs' AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
    ALTER TABLE activity_logs ALTER COLUMN user_id TYPE INTEGER USING user_id::text::integer;
    ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Fixed activity_logs.user_id: UUID -> INTEGER';
  END IF;

  -- search_history.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_history' AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE search_history DROP CONSTRAINT IF EXISTS search_history_user_id_fkey;
    ALTER TABLE search_history ALTER COLUMN user_id TYPE INTEGER USING user_id::text::integer;
    ALTER TABLE search_history ADD CONSTRAINT search_history_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Fixed search_history.user_id: UUID -> INTEGER';
  END IF;

  -- system_config.updated_by
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_config' AND column_name = 'updated_by' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE system_config DROP CONSTRAINT IF EXISTS system_config_updated_by_fkey;
    ALTER TABLE system_config ALTER COLUMN updated_by TYPE INTEGER USING updated_by::text::integer;
    ALTER TABLE system_config ADD CONSTRAINT system_config_updated_by_fkey 
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Fixed system_config.updated_by: UUID -> INTEGER';
  END IF;

  -- capability_gaps.user_id (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'capability_gaps'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'capability_gaps' AND column_name = 'user_id' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE capability_gaps DROP CONSTRAINT IF EXISTS capability_gaps_user_id_fkey;
      ALTER TABLE capability_gaps ALTER COLUMN user_id TYPE INTEGER USING user_id::text::integer;
      ALTER TABLE capability_gaps ADD CONSTRAINT capability_gaps_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      RAISE NOTICE 'Fixed capability_gaps.user_id: UUID -> INTEGER';
    END IF;
  END IF;

END $$;

-- ============================================
-- Ensure critical tables exist
-- ============================================

-- Ensure capability_gaps table exists with correct schema
CREATE TABLE IF NOT EXISTS capability_gaps (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  gap_description TEXT NOT NULL,
  gap_category VARCHAR(100),
  gap_priority VARCHAR(50) DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_capability_gaps_user ON capability_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_capability_gaps_conversation ON capability_gaps(conversation_id);

-- Ensure user_ai_agents table exists
CREATE TABLE IF NOT EXISTS user_ai_agents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_name VARCHAR(255) NOT NULL,
  agent_type VARCHAR(100),
  description TEXT,
  configuration JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, agent_name)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_agents_user_id ON user_ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_agents_active ON user_ai_agents(is_active);

-- ============================================
-- Final Verification
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  -- Count tables to verify schema is complete
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  RAISE NOTICE 'Schema cleanup complete. Total tables: %', table_count;
END $$;
