-- Migration 013: SAM.gov Opportunities Cache
-- Automatically cache all SAM.gov opportunities from searches to track new vs existing

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

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_samgov_cache_notice_id ON samgov_opportunities_cache(notice_id);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_posted_date ON samgov_opportunities_cache(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_deadline ON samgov_opportunities_cache(response_deadline);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_first_seen ON samgov_opportunities_cache(first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_last_seen ON samgov_opportunities_cache(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_opportunity_id ON samgov_opportunities_cache(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_naics ON samgov_opportunities_cache(naics_code);

-- GIN index for JSONB search
CREATE INDEX IF NOT EXISTS idx_samgov_cache_raw_data ON samgov_opportunities_cache USING GIN (raw_data);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_samgov_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_samgov_cache_timestamp
BEFORE UPDATE ON samgov_opportunities_cache
FOR EACH ROW
EXECUTE FUNCTION update_samgov_cache_timestamp();

-- Table for tracking SAM.gov search queries
CREATE TABLE IF NOT EXISTS samgov_search_history (
  id SERIAL PRIMARY KEY,

  -- Search parameters
  keyword TEXT,
  posted_from DATE,
  posted_to DATE,
  naics_code VARCHAR(50),

  -- Search results metadata
  total_records INTEGER,
  new_records INTEGER, -- How many were new in this search
  existing_records INTEGER, -- How many were already in cache

  -- Tracking
  searched_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Store full search params as JSONB for flexibility
  search_params JSONB
);

CREATE INDEX IF NOT EXISTS idx_samgov_search_user ON samgov_search_history(searched_by);
CREATE INDEX IF NOT EXISTS idx_samgov_search_date ON samgov_search_history(searched_at DESC);

COMMENT ON TABLE samgov_opportunities_cache IS 'Automatic cache of all SAM.gov opportunities seen in searches';
COMMENT ON COLUMN samgov_opportunities_cache.notice_id IS 'Unique notice ID from SAM.gov';
COMMENT ON COLUMN samgov_opportunities_cache.first_seen_at IS 'When this opportunity was first discovered';
COMMENT ON COLUMN samgov_opportunities_cache.last_seen_at IS 'When this opportunity was last seen in a search';
COMMENT ON COLUMN samgov_opportunities_cache.seen_count IS 'Number of times this opportunity appeared in searches';
COMMENT ON COLUMN samgov_opportunities_cache.opportunity_id IS 'Link to manually tracked opportunity if user saved it';

COMMENT ON TABLE samgov_search_history IS 'History of SAM.gov searches performed';
COMMENT ON COLUMN samgov_search_history.new_records IS 'Count of new opportunities discovered in this search';
COMMENT ON COLUMN samgov_search_history.existing_records IS 'Count of opportunities already in cache';
