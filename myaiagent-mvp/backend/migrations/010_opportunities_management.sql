-- Migration 010: Internal Opportunities Management System
-- Tracks SAM.gov opportunities through internal workflow pipeline

CREATE TABLE IF NOT EXISTS opportunities (
  id SERIAL PRIMARY KEY,

  -- External SAM.gov Data (from public API)
  notice_id VARCHAR(255) UNIQUE NOT NULL,
  solicitation_number VARCHAR(255),
  title TEXT NOT NULL,
  type VARCHAR(100),
  posted_date TIMESTAMP,
  response_deadline TIMESTAMP,
  naics_code VARCHAR(50),
  set_aside_type VARCHAR(100),
  contracting_office TEXT,
  place_of_performance TEXT,
  description TEXT,

  -- Raw SAM.gov JSON (for reference)
  raw_data JSONB,

  -- Internal Workflow Fields
  internal_status VARCHAR(50) NOT NULL DEFAULT 'New',
  -- Status values: New, Qualified, In Progress, Submitted, Won, Lost, Archived

  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  internal_score INTEGER CHECK (internal_score >= 0 AND internal_score <= 100),
  internal_notes TEXT,

  -- Tracking
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_sync_at TIMESTAMP,

  -- Indexes for performance
  CONSTRAINT valid_status CHECK (internal_status IN ('New', 'Qualified', 'In Progress', 'Submitted', 'Won', 'Lost', 'Archived'))
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(internal_status);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned ON opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_posted_date ON opportunities(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(response_deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_notice_id ON opportunities(notice_id);

-- Activity log for tracking status changes and assignments
CREATE TABLE IF NOT EXISTS opportunity_activity (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL,
  -- Activity types: status_change, assignment, note_added, score_updated
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_opportunity ON opportunity_activity(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON opportunity_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON opportunity_activity(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_opportunities_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_opportunities_timestamp
BEFORE UPDATE ON opportunities
FOR EACH ROW
EXECUTE FUNCTION update_opportunities_timestamp();

COMMENT ON TABLE opportunities IS 'Internal tracking of SAM.gov contract opportunities through workflow pipeline';
COMMENT ON COLUMN opportunities.notice_id IS 'Unique ID from SAM.gov (external system)';
COMMENT ON COLUMN opportunities.internal_status IS 'Current stage in internal workflow: New, Qualified, In Progress, Submitted, Won, Lost, Archived';
COMMENT ON COLUMN opportunities.internal_score IS 'Internal qualification score (0-100) for prioritization';
