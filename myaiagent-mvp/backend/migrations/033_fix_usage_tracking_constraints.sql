-- Migration 033: Fix usage_tracking constraints
-- The table needs to support both ON CONFLICT patterns used in auth.js

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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the unique constraints for both patterns in auth.js:
-- Pattern 1: INSERT ... ON CONFLICT (user_id, organization_id, date) DO NOTHING
-- Pattern 2: INSERT ... ON CONFLICT (user_id, date) DO NOTHING
-- We use a single composite constraint that covers both
ALTER TABLE usage_tracking 
ADD CONSTRAINT usage_tracking_user_org_date_unique UNIQUE(user_id, organization_id, date);

-- This constraint handles the case where organization_id is NULL
ALTER TABLE usage_tracking 
ADD CONSTRAINT usage_tracking_user_date_null_org_unique UNIQUE(user_id, date) 
WHERE organization_id IS NULL;

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_org_date ON usage_tracking(user_id, organization_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org ON usage_tracking(organization_id);
