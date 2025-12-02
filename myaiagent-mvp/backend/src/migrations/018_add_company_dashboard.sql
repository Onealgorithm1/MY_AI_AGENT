-- Migration: Add Company Dashboard Tables
-- Description: Store company opportunity match analysis and history
-- Date: 2025-12-02

-- ============================================
-- Company Opportunity Matches Table
-- ============================================
CREATE TABLE IF NOT EXISTS company_opportunity_matches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_analyzed INTEGER NOT NULL,
  matched_count INTEGER NOT NULL,
  near_match_count INTEGER NOT NULL,
  stretch_count INTEGER NOT NULL,
  analysis_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_company_matches_user ON company_opportunity_matches(user_id);
CREATE INDEX idx_company_matches_created ON company_opportunity_matches(created_at DESC);

COMMENT ON TABLE company_opportunity_matches IS 'Historical record of company opportunity matching analysis';

-- ============================================
-- Company Profile Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS company_profile_cache (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  website_url VARCHAR(500),
  capabilities JSONB,
  certifications JSONB,
  naics_codes TEXT[],
  psc_codes TEXT[],
  keywords TEXT[],
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name)
);

CREATE INDEX idx_company_profile_name ON company_profile_cache(company_name);

COMMENT ON TABLE company_profile_cache IS 'Cached company profile data from website scraping';

-- ============================================
-- Opportunity Bookmarks Table
-- ============================================
CREATE TABLE IF NOT EXISTS opportunity_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id INTEGER REFERENCES sam_gov_opportunities(id) ON DELETE CASCADE,
  notice_id VARCHAR(255),
  match_score NUMERIC(5, 2),
  bookmark_type VARCHAR(50) DEFAULT 'matched', -- matched, near_match, stretch, manual
  notes TEXT,
  status VARCHAR(50) DEFAULT 'reviewing', -- reviewing, pursuing, bid_submitted, declined
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX idx_bookmarks_user ON opportunity_bookmarks(user_id);
CREATE INDEX idx_bookmarks_type ON opportunity_bookmarks(bookmark_type);
CREATE INDEX idx_bookmarks_status ON opportunity_bookmarks(status);

COMMENT ON TABLE opportunity_bookmarks IS 'User bookmarks for opportunities with match scores and status';

-- ============================================
-- Recommendations Tracking Table
-- ============================================
CREATE TABLE IF NOT EXISTS improvement_recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(100) NOT NULL, -- certification, naics, capability, etc.
  recommendation_text TEXT NOT NULL,
  priority VARCHAR(20), -- High, Medium, Low
  opportunities_count INTEGER,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, dismissed
  completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recommendations_user ON improvement_recommendations(user_id);
CREATE INDEX idx_recommendations_type ON improvement_recommendations(recommendation_type);
CREATE INDEX idx_recommendations_status ON improvement_recommendations(status);

COMMENT ON TABLE improvement_recommendations IS 'Track recommendations for improving federal contracting readiness';

-- ============================================
-- Update Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_company_dashboard_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_matches_timestamp
  BEFORE UPDATE ON company_opportunity_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_company_dashboard_timestamp();

CREATE TRIGGER update_bookmarks_timestamp
  BEFORE UPDATE ON opportunity_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_company_dashboard_timestamp();

CREATE TRIGGER update_recommendations_timestamp
  BEFORE UPDATE ON improvement_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_company_dashboard_timestamp();

-- ============================================
-- Insert initial OneAlgorithm company profile
-- ============================================
INSERT INTO company_profile_cache (
  company_name,
  website_url,
  capabilities,
  certifications,
  naics_codes,
  psc_codes,
  keywords
) VALUES (
  'OneAlgorithm',
  'https://onealgorithm.com',
  '{"IT Consulting": {"naicsCodes": ["541512", "541513"], "maturity": "High"}, "Website Development": {"naicsCodes": ["541511", "541512"], "maturity": "High"}, "Operations Technology": {"naicsCodes": ["541512", "541330", "541618"], "maturity": "Medium"}, "Marketing Services": {"naicsCodes": ["541613", "541810", "541820"], "maturity": "Medium"}, "Staff Augmentation": {"naicsCodes": ["541511", "541512", "541519"], "maturity": "High"}}'::jsonb,
  '{"smallBusiness": true, "veteran": false, "womanOwned": false, "8a": false, "hubzone": false, "sdvosb": false}'::jsonb,
  ARRAY['541511', '541512', '541513', '541330', '541618', '541613', '541810', '541820', '541519'],
  ARRAY['D302', 'D307', 'D310', '7030', 'D399', 'R408', 'R499', 'R608', 'R425'],
  ARRAY['website', 'web development', 'software development', 'IT consulting', 'operations technology', 'marketing', 'staff augmentation', 'digital services', 'custom software', 'web applications', 'IT services', 'consulting', 'technology consulting', 'digital transformation', 'e-commerce', 'construction tech']
) ON CONFLICT (company_name) DO UPDATE SET
  capabilities = EXCLUDED.capabilities,
  certifications = EXCLUDED.certifications,
  naics_codes = EXCLUDED.naics_codes,
  psc_codes = EXCLUDED.psc_codes,
  keywords = EXCLUDED.keywords,
  last_updated = CURRENT_TIMESTAMP;

-- ============================================
-- Cleanup function
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_company_data()
RETURNS void AS $$
BEGIN
  -- Clean up old match history (keep last 90 days)
  DELETE FROM company_opportunity_matches WHERE created_at < NOW() - INTERVAL '90 days';

  -- Clean up dismissed recommendations older than 180 days
  DELETE FROM improvement_recommendations
  WHERE status = 'dismissed' AND updated_at < NOW() - INTERVAL '180 days';

  -- Clean up old bookmarks for declined opportunities (keep 1 year)
  DELETE FROM opportunity_bookmarks
  WHERE status = 'declined' AND updated_at < NOW() - INTERVAL '1 year';

  RAISE NOTICE 'Old company dashboard data cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_company_data() IS 'Cleanup function to remove old company dashboard data';

-- ============================================
-- Grant Permissions
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
