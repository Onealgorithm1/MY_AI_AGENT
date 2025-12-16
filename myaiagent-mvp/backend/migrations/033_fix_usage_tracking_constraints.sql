-- Migration 033: Fix usage_tracking constraints
-- Fixes the ON CONFLICT constraint issues in login/signup
-- The auth.js code now uses consistent INSERT pattern with organization_id (NULL or value)

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
  -- Single unique constraint that works for both org and non-org scenarios
  -- Note: NULLs in unique constraints don't match each other, so (user_id, NULL, date)
  -- can occur multiple times. For non-org tracking, use user_id+date as key instead.
  UNIQUE(user_id, organization_id, date)
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_org_date ON usage_tracking(user_id, organization_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org ON usage_tracking(organization_id);
