-- Comprehensive database consistency and cleanup migration
-- This ensures all required tables, columns, and indexes exist

-- Step 1: Ensure all critical tables exist with proper columns
-- This is a safety net in case previous migrations didn't run correctly

-- Users table - verify structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      full_name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      email_verified BOOLEAN DEFAULT FALSE,
      avatar_url TEXT,
      profile_data JSONB DEFAULT '{}',
      preferences JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP
    );
    CREATE INDEX idx_users_email ON users(email);
    RAISE NOTICE 'Created users table';
  END IF;
END $$;

-- Conversations table - verify structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'conversations') THEN
    CREATE TABLE conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      description TEXT,
      model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
      system_prompt TEXT,
      is_archived BOOLEAN DEFAULT FALSE,
      is_public BOOLEAN DEFAULT FALSE,
      tags TEXT[],
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_conversations_user ON conversations(user_id);
    RAISE NOTICE 'Created conversations table';
  END IF;
END $$;

-- Messages table - verify structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'messages') THEN
    CREATE TABLE messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      message_type VARCHAR(50) DEFAULT 'text',
      attachments JSONB DEFAULT '[]',
      function_calls JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_messages_conversation ON messages(conversation_id);
    RAISE NOTICE 'Created messages table';
  END IF;
END $$;

-- API Secrets table - verify structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'api_secrets') THEN
    CREATE TABLE api_secrets (
      id SERIAL PRIMARY KEY,
      key_name VARCHAR(255) UNIQUE NOT NULL,
      key_label VARCHAR(255),
      key_value TEXT NOT NULL,
      key_type VARCHAR(50) DEFAULT 'api_key',
      service_name VARCHAR(255),
      description TEXT,
      docs_url TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      is_default BOOLEAN DEFAULT FALSE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP
    );
    CREATE INDEX idx_api_secrets_name ON api_secrets(key_name);
    RAISE NOTICE 'Created api_secrets table';
  END IF;
END $$;

-- Step 2: Verify system_performance_metrics has all required columns
ALTER TABLE IF EXISTS system_performance_metrics
ADD COLUMN IF NOT EXISTS value NUMERIC,
ADD COLUMN IF NOT EXISTS unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Step 3: Ensure all required indexes exist
DO $$
BEGIN
  -- Performance metrics indexes
  PERFORM 1 FROM pg_indexes WHERE indexname = 'idx_perf_metrics_timestamp';
  IF NOT FOUND THEN
    CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON system_performance_metrics(timestamp DESC);
  END IF;
  
  PERFORM 1 FROM pg_indexes WHERE indexname = 'idx_perf_metrics_name';
  IF NOT FOUND THEN
    CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON system_performance_metrics(metric_name);
  END IF;
  
  PERFORM 1 FROM pg_indexes WHERE indexname = 'idx_perf_metrics_tags';
  IF NOT FOUND THEN
    CREATE INDEX IF NOT EXISTS idx_perf_metrics_tags ON system_performance_metrics USING GIN (tags);
  END IF;
END $$;

-- Step 4: Verify all required AI Agent tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_ai_agents') THEN
    CREATE TABLE user_ai_agents (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_name VARCHAR(100) NOT NULL,
      agent_name VARCHAR(255) NOT NULL,
      model VARCHAR(255) NOT NULL,
      api_key_id INTEGER REFERENCES api_secrets(id) ON DELETE SET NULL,
      oauth_token TEXT,
      auth_type VARCHAR(50) NOT NULL DEFAULT 'api_key',
      config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE,
      is_default BOOLEAN DEFAULT FALSE,
      status VARCHAR(50) DEFAULT 'active',
      error_message TEXT,
      last_tested_at TIMESTAMP,
      last_used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, provider_name, agent_name)
    );
    RAISE NOTICE 'Created user_ai_agents table';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ai_agent_providers') THEN
    CREATE TABLE ai_agent_providers (
      id SERIAL PRIMARY KEY,
      provider_name VARCHAR(100) UNIQUE NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      logo_url TEXT,
      docs_url TEXT,
      base_url VARCHAR(500),
      auth_type VARCHAR(50) NOT NULL DEFAULT 'api_key',
      oauth_auth_url VARCHAR(500),
      oauth_token_url VARCHAR(500),
      oauth_scopes TEXT[],
      supported_models JSONB DEFAULT '[]',
      config_schema JSONB DEFAULT '{}',
      rate_limit_info JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    RAISE NOTICE 'Created ai_agent_providers table';
  END IF;
END $$;

-- Step 5: Verify performance anomalies and baselines tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'performance_anomalies') THEN
    CREATE TABLE performance_anomalies (
      id SERIAL PRIMARY KEY,
      metric_name VARCHAR(100) NOT NULL,
      anomaly_type VARCHAR(50),
      severity VARCHAR(20) NOT NULL,
      detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      baseline_value NUMERIC,
      anomaly_value NUMERIC,
      deviation_percentage NUMERIC,
      description TEXT NOT NULL,
      tags JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'active',
      resolved_at TIMESTAMP,
      resolution_notes TEXT
    );
    RAISE NOTICE 'Created performance_anomalies table';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'performance_baselines') THEN
    CREATE TABLE performance_baselines (
      id SERIAL PRIMARY KEY,
      metric_name VARCHAR(100) NOT NULL UNIQUE,
      avg_value NUMERIC NOT NULL,
      p50_value NUMERIC NOT NULL,
      p95_value NUMERIC NOT NULL,
      p99_value NUMERIC NOT NULL,
      min_value NUMERIC NOT NULL,
      max_value NUMERIC NOT NULL,
      std_deviation NUMERIC NOT NULL,
      sample_size INTEGER NOT NULL,
      calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      valid_until TIMESTAMP,
      tags JSONB DEFAULT '{}'
    );
    RAISE NOTICE 'Created performance_baselines table';
  END IF;
END $$;

-- Completion message
DO $$
BEGIN
  RAISE NOTICE 'Database consistency check completed successfully';
END $$;
