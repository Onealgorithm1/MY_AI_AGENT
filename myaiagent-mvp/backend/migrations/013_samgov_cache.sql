-- Migration 013: SAM.gov Opportunities Cache
-- DISABLED - This migration has UUID/INTEGER type mismatches and is superseded by migration 030
-- See migration 030_fix_schema_dependencies.sql for the corrected version

-- Marker to skip this migration: migration is disabled
-- CREATE TABLE IF NOT EXISTS samgov_opportunities_cache (
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

  -- migration is disabled
  -- opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
  -- created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  -- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- Superseded by migration 030
