-- Migration 030: Fix Schema Dependencies
-- Aligns database schema with application code expectations
-- Adds missing columns and ensures tables are properly structured

-- ============================================
-- Fix memory_facts table schema
-- ============================================
DO $$
BEGIN
  -- Add 'fact' column if it doesn't exist (will use fact_text data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'fact'
  ) THEN
    ALTER TABLE memory_facts ADD COLUMN fact TEXT;
    
    -- Copy data from fact_text to fact if fact_text exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'memory_facts' AND column_name = 'fact_text'
    ) THEN
      UPDATE memory_facts SET fact = fact_text WHERE fact IS NULL;
    END IF;
  END IF;

  -- Add 'category' column if it doesn't exist (will use fact_type data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'category'
  ) THEN
    ALTER TABLE memory_facts ADD COLUMN category VARCHAR(100);
    
    -- Copy data from fact_type to category if fact_type exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'memory_facts' AND column_name = 'fact_type'
    ) THEN
      UPDATE memory_facts SET category = fact_type WHERE category IS NULL;
    END IF;
  END IF;

  -- Add 'confidence' column if it doesn't exist (will use relevance_score data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE memory_facts ADD COLUMN confidence NUMERIC DEFAULT 0.7;
    
    -- Copy data from relevance_score to confidence if relevance_score exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'memory_facts' AND column_name = 'relevance_score'
    ) THEN
      UPDATE memory_facts SET confidence = relevance_score WHERE confidence = 0.7;
    END IF;
  END IF;

  -- Add 'times_referenced' column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'times_referenced'
  ) THEN
    ALTER TABLE memory_facts ADD COLUMN times_referenced INTEGER DEFAULT 0;
  END IF;

  -- Add 'manually_added' column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'manually_added'
  ) THEN
    ALTER TABLE memory_facts ADD COLUMN manually_added BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add 'last_referenced_at' column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'last_referenced_at'
  ) THEN
    ALTER TABLE memory_facts ADD COLUMN last_referenced_at TIMESTAMP;
  END IF;

  -- Add 'source_conversation_id' column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'source_conversation_id'
  ) THEN
    ALTER TABLE memory_facts ADD COLUMN source_conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL;
  END IF;

  -- Rename conversation_id to source_conversation_id if needed (only if we just added source_conversation_id and conversation_id exists)
  -- This is handled by the previous condition - we only add source_conversation_id if it doesn't exist
  
END $$;

-- ============================================
-- Ensure samgov_opportunities_cache table exists
-- ============================================
CREATE TABLE IF NOT EXISTS samgov_opportunities_cache (
  id SERIAL PRIMARY KEY,

  -- SAM.gov Identifiers
  notice_id VARCHAR(255) UNIQUE NOT NULL,
  solicitation_number VARCHAR(255),

  -- Opportunity Details
  title TEXT NOT NULL,
  type VARCHAR(100),
  posted_date TIMESTAMP,
  response_deadline TIMESTAMP,
  archive_date TIMESTAMP,
  naics_code VARCHAR(50),
  set_aside_type VARCHAR(100),
  contracting_office TEXT,
  place_of_performance TEXT,
  description TEXT,

  -- Full SAM.gov response data
  raw_data JSONB NOT NULL,

  -- Cache tracking
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  seen_count INTEGER DEFAULT 1 NOT NULL,

  -- Link to manually tracked opportunity (if user saved it)
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,

  -- Metadata
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for samgov_opportunities_cache
CREATE INDEX IF NOT EXISTS idx_samgov_cache_notice_id ON samgov_opportunities_cache(notice_id);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_posted_date ON samgov_opportunities_cache(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_deadline ON samgov_opportunities_cache(response_deadline);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_first_seen ON samgov_opportunities_cache(first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_last_seen ON samgov_opportunities_cache(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_opportunity_id ON samgov_opportunities_cache(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_naics ON samgov_opportunities_cache(naics_code);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_raw_data ON samgov_opportunities_cache USING GIN (raw_data);

-- Create or replace trigger for updating timestamp
CREATE OR REPLACE FUNCTION update_samgov_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_samgov_cache_timestamp ON samgov_opportunities_cache;
CREATE TRIGGER update_samgov_cache_timestamp
BEFORE UPDATE ON samgov_opportunities_cache
FOR EACH ROW
EXECUTE FUNCTION update_samgov_cache_timestamp();

-- ============================================
-- Ensure samgov_search_history table exists
-- ============================================
CREATE TABLE IF NOT EXISTS samgov_search_history (
  id SERIAL PRIMARY KEY,

  -- Search parameters
  keyword TEXT,
  posted_from DATE,
  posted_to DATE,
  naics_code VARCHAR(50),

  -- Search results metadata
  total_records INTEGER,
  new_records INTEGER,
  existing_records INTEGER,

  -- Tracking
  searched_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Store full search params as JSONB for flexibility
  search_params JSONB
);

CREATE INDEX IF NOT EXISTS idx_samgov_search_user ON samgov_search_history(searched_by);
CREATE INDEX IF NOT EXISTS idx_samgov_search_date ON samgov_search_history(searched_at DESC);

-- ============================================
-- Ensure memory_facts indexes exist
-- ============================================
CREATE INDEX IF NOT EXISTS idx_memory_facts_user_approved_referenced 
ON memory_facts(user_id, approved, last_referenced_at DESC) 
WHERE approved = true;

CREATE INDEX IF NOT EXISTS idx_memory_facts_user_approved 
ON memory_facts(user_id, approved) 
WHERE approved = true;

CREATE INDEX IF NOT EXISTS idx_memory_facts_user_category
ON memory_facts(user_id, category);

-- ============================================
-- Ensure messages table has all required columns
-- ============================================
DO $$
BEGIN
  -- Add 'model' column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'model'
  ) THEN
    ALTER TABLE messages ADD COLUMN model VARCHAR(100);
  END IF;

  -- Add 'tokens_used' column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'tokens_used'
  ) THEN
    ALTER TABLE messages ADD COLUMN tokens_used INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- Ensure usage_tracking table exists
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  tokens_consumed INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  storage_used BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org ON usage_tracking(organization_id);

-- ============================================
-- Ensure opportunities table exists
-- ============================================
CREATE TABLE IF NOT EXISTS opportunities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  type VARCHAR(100),
  posted_date TIMESTAMP,
  deadline TIMESTAMP,
  description TEXT,
  source VARCHAR(100),
  source_id VARCHAR(500),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_opportunities_user ON opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_org ON opportunities(organization_id);

COMMENT ON TABLE memory_facts IS 'User memory facts extracted from conversations';
COMMENT ON TABLE samgov_opportunities_cache IS 'Cache of SAM.gov opportunities';
COMMENT ON TABLE usage_tracking IS 'Daily usage statistics and token consumption';
COMMENT ON TABLE opportunities IS 'User tracked opportunities';
