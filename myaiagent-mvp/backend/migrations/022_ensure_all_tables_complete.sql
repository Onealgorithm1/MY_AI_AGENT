-- Migration: Ensure All Tables Are Complete
-- This migration ensures that all required tables exist with correct structure
-- Safe to run multiple times - only creates if missing

-- ============================================
-- Ensure system_performance_metrics has all columns
-- ============================================
DO $$
BEGIN
  -- Add value column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'value'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN value NUMERIC NOT NULL DEFAULT 0;
  END IF;
  
  -- Add unit column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'unit'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'ms';
  END IF;
  
  -- Add metric_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'metric_name'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN metric_name VARCHAR(100) NOT NULL DEFAULT 'unknown';
  END IF;
  
  -- Add timestamp column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
END $$;

-- ============================================
-- Ensure error_logs table exists
-- ============================================
CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  error_type VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  request_url VARCHAR(500),
  request_method VARCHAR(10),
  status_code INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);

-- ============================================
-- Ensure conversations table has correct structure
-- ============================================
DO $$
BEGIN
  -- Ensure model column has default value
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'model'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE conversations ALTER COLUMN model SET DEFAULT 'gemini-2.5-flash';
  END IF;
END $$;

-- ============================================
-- Ensure api_secrets table is properly configured
-- ============================================
DO $$
BEGIN
  -- Add is_default column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_secrets' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE api_secrets ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add last_used_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_secrets' AND column_name = 'last_used_at'
  ) THEN
    ALTER TABLE api_secrets ADD COLUMN last_used_at TIMESTAMP;
  END IF;
END $$;

-- ============================================
-- Ensure memory_facts table constraint exists
-- ============================================
DO $$
BEGIN
  -- Ensure fact_text is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'fact_text'
    AND is_nullable = 'YES'
  ) THEN
    -- Only update if column exists and is nullable
    ALTER TABLE memory_facts ALTER COLUMN fact_text SET NOT NULL;
  END IF;
END $$;

-- ============================================
-- Ensure user_preferences uses correct user_id type
-- ============================================
DO $$
BEGIN
  -- If user_preferences.user_id is UUID, convert to INTEGER
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'user_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE user_preferences 
    DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
    
    ALTER TABLE user_preferences 
    ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
    
    ALTER TABLE user_preferences 
    ADD CONSTRAINT user_preferences_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- Ensure all critical indexes exist
-- ============================================
CREATE INDEX IF NOT EXISTS idx_api_secrets_active ON api_secrets(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- Update migration tracking (if it exists)
-- ============================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description VARCHAR(500)
);

-- Log this migration execution
INSERT INTO schema_migrations (version, description) 
VALUES (22, 'Ensure all tables complete - add missing columns')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- Final verification queries (for logging)
-- ============================================
DO $$
DECLARE
  tables_count INTEGER;
  indexes_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO tables_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  -- Count indexes
  SELECT COUNT(*) INTO indexes_count FROM pg_indexes 
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'Database check complete: % tables, % indexes',  tables_count, indexes_count;
END $$;
