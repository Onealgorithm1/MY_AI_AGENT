-- Migration: Final Schema Cleanup and Verification
-- Purpose: Ensure all critical tables exist and schema is complete
-- All user_id columns should now be INTEGER (matching users.id SERIAL)
-- This migration is idempotent and safe to run multiple times

-- ============================================
-- Ensure capability_gaps table exists
-- ============================================
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

-- ============================================
-- Ensure user_ai_agents table exists
-- ============================================
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
-- Ensure system_performance_metrics columns
-- ============================================
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'value'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN value NUMERIC NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'unit'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'ms';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'metric_name'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN metric_name VARCHAR(100) NOT NULL DEFAULT 'unknown';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- ============================================
-- Final Verification
-- ============================================
DO $$
DECLARE
  table_count INTEGER;
  missing_tables TEXT;
BEGIN
  -- Count tables to verify schema is complete
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  RAISE NOTICE 'Schema cleanup complete. Total tables: %', table_count;
  
  -- Check for any remaining UUID user_id columns (should be none)
  SELECT STRING_AGG(table_name || '.' || column_name, ', ')
  INTO missing_tables
  FROM information_schema.columns
  WHERE data_type = 'uuid' AND column_name LIKE '%user%'
  AND table_schema = 'public';
  
  IF missing_tables IS NOT NULL THEN
    RAISE WARNING 'Found UUID columns for user references (expected to be INTEGER): %', missing_tables;
  ELSE
    RAISE NOTICE 'Schema type consistency verified: No UUID user/user_id columns found';
  END IF;
END $$;
