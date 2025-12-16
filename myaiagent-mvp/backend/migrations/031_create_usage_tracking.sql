-- Migration 031: Usage Tracking Table
-- Tracks daily usage metrics per user for rate limiting and analytics

CREATE TABLE IF NOT EXISTS usage_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  voice_minutes_used NUMERIC NOT NULL DEFAULT 0,
  tokens_consumed BIGINT NOT NULL DEFAULT 0,
  files_uploaded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date);

-- Trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_usage_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_usage_tracking_updated_at ON usage_tracking;

CREATE TRIGGER trg_update_usage_tracking_updated_at
BEFORE UPDATE ON usage_tracking
FOR EACH ROW
EXECUTE FUNCTION update_usage_tracking_updated_at();

COMMENT ON TABLE usage_tracking IS 'Daily usage metrics per user for rate limiting and analytics';
COMMENT ON COLUMN usage_tracking.messages_sent IS 'Number of messages sent today';
COMMENT ON COLUMN usage_tracking.voice_minutes_used IS 'Minutes of voice input/output used today';
COMMENT ON COLUMN usage_tracking.tokens_consumed IS 'Total API tokens consumed today';
COMMENT ON COLUMN usage_tracking.files_uploaded IS 'Number of files uploaded today';
