-- Migration 051: Add Saved Searches, Reminders, and Notifications

-- 1. Saved Searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMP,
  frequency VARCHAR(50) DEFAULT 'daily', -- 'daily', 'weekly', 'realtime' (future)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON saved_searches(is_active) WHERE is_active = TRUE;

-- 2. Opportunity Reminders
CREATE TABLE IF NOT EXISTS opportunity_reminders (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_date TIMESTAMP NOT NULL,
  note TEXT,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_date ON opportunity_reminders(user_id, reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON opportunity_reminders(reminder_date) WHERE is_sent = FALSE;

-- 3. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'reminder', 'new_match', 'system', 'assignment'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb, -- deep link info, related IDs
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Trigger for updated_at on saved_searches
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_searches_updated_at
BEFORE UPDATE ON saved_searches
FOR EACH ROW
EXECUTE FUNCTION update_saved_searches_updated_at();

-- Comments
COMMENT ON TABLE saved_searches IS 'User-defined search criteria for SAM.gov opportunities';
COMMENT ON TABLE opportunity_reminders IS 'Scheduled reminders for specific opportunities';
COMMENT ON TABLE notifications IS 'In-app notifications history';
