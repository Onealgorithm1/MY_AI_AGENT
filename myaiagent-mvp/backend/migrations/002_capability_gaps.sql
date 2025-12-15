-- Migration: Add Capability Gaps table for AI learning system
-- This table tracks when the AI encounters limitations or missing capabilities
-- Enables continuous improvement by logging what users request that the AI cannot do

CREATE TABLE IF NOT EXISTS capability_gaps (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  requested_capability TEXT NOT NULL,
  gap_type TEXT NOT NULL CHECK (gap_type IN ('missing_function', 'missing_access', 'missing_integration', 'missing_data')),
  description TEXT,
  suggested_solution TEXT,
  occurrence_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_capability_gaps_user ON capability_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_capability_gaps_type ON capability_gaps(gap_type);
CREATE INDEX IF NOT EXISTS idx_capability_gaps_resolved ON capability_gaps(resolved);
CREATE INDEX IF NOT EXISTS idx_capability_gaps_occurrence ON capability_gaps(occurrence_count DESC);

-- Comments for documentation
COMMENT ON TABLE capability_gaps IS 'Tracks AI capability limitations and missing features for continuous improvement';
COMMENT ON COLUMN capability_gaps.gap_type IS 'Type of gap: missing_function, missing_access, missing_integration, or missing_data';
COMMENT ON COLUMN capability_gaps.occurrence_count IS 'Number of times this gap has been encountered';
COMMENT ON COLUMN capability_gaps.resolved IS 'Whether this gap has been addressed/implemented';
