-- Migration 033: Fix usage_tracking constraints
-- Fixes the ON CONFLICT constraint issues in login/signup
-- Simplifies tracking to use (user_id, date) as the unique key
-- organization_id is kept as optional denormalization for organizational analytics

-- Drop and recreate usage_tracking with proper constraints
DROP TABLE IF EXISTS usage_tracking CASCADE;

CREATE TABLE usage_tracking (
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
  -- Unique constraint: one record per user per day
  -- (organization_id is optional and not part of the key)
  UNIQUE(user_id, date)
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org ON usage_tracking(organization_id);
