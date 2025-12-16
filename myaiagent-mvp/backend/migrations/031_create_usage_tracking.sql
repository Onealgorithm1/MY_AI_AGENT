-- Migration 031: Create usage_tracking table and add missing columns
-- Fixes login errors by creating the usage_tracking table

-- ============================================
-- Add settings column to users table
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'settings'
  ) THEN
    ALTER TABLE users ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ============================================
-- Create usage_tracking table
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER DEFAULT 0,
  voice_minutes_used FLOAT DEFAULT 0.0,
  tokens_consumed INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, organization_id, date),
  UNIQUE(user_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_org_date ON usage_tracking(user_id, organization_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org ON usage_tracking(organization_id);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 031 completed - created usage_tracking table and added settings column';
END $$;
