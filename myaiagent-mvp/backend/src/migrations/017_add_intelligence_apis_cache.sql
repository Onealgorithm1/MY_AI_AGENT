-- Migration: Add Intelligence APIs Cache Tables
-- Description: Cache tables for USAspending, CALC, Subaward, and Exclusions APIs
-- Date: 2025-12-02

-- ============================================
-- USAspending Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS agency_spending_cache (
  id SERIAL PRIMARY KEY,
  agency_code VARCHAR(10) NOT NULL,
  naics_code VARCHAR(10) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  total_spending NUMERIC(15, 2),
  award_count INTEGER,
  top_contractors JSONB,
  spending_trend JSONB,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agency_code, naics_code, fiscal_year)
);

CREATE INDEX idx_agency_spending_lookup ON agency_spending_cache(agency_code, naics_code, fiscal_year);
CREATE INDEX idx_agency_spending_cached_at ON agency_spending_cache(cached_at);

COMMENT ON TABLE agency_spending_cache IS 'Cache for USAspending API agency spending data (7-day cache)';

-- ============================================
-- Labor Rate Cache Table (CALC API)
-- ============================================
CREATE TABLE IF NOT EXISTS labor_rate_cache (
  id SERIAL PRIMARY KEY,
  labor_category VARCHAR(255) NOT NULL,
  education_level VARCHAR(100),
  min_experience INTEGER,
  rate_count INTEGER,
  min_rate NUMERIC(10, 2),
  max_rate NUMERIC(10, 2),
  average_rate NUMERIC(10, 2),
  median_rate NUMERIC(10, 2),
  percentile_25 NUMERIC(10, 2),
  percentile_75 NUMERIC(10, 2),
  percentile_90 NUMERIC(10, 2),
  distribution_data JSONB,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(labor_category, education_level, min_experience)
);

CREATE INDEX idx_labor_rate_category ON labor_rate_cache(labor_category);
CREATE INDEX idx_labor_rate_cached_at ON labor_rate_cache(cached_at);

COMMENT ON TABLE labor_rate_cache IS 'Cache for CALC API labor rate statistics (30-day cache)';

-- ============================================
-- Teaming Intelligence Cache (Subaward API)
-- ============================================
CREATE TABLE IF NOT EXISTS teaming_partners_cache (
  id SERIAL PRIMARY KEY,
  naics_code VARCHAR(10) NOT NULL,
  partner_count INTEGER,
  partners_data JSONB,
  total_analyzed INTEGER,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(naics_code)
);

CREATE INDEX idx_teaming_partners_naics ON teaming_partners_cache(naics_code);
CREATE INDEX idx_teaming_partners_cached_at ON teaming_partners_cache(cached_at);

COMMENT ON TABLE teaming_partners_cache IS 'Cache for teaming partner analysis by NAICS code (14-day cache)';

-- ============================================
-- Exclusion Check Cache
-- ============================================
CREATE TABLE IF NOT EXISTS exclusion_check_cache (
  id SERIAL PRIMARY KEY,
  entity_name VARCHAR(500) NOT NULL,
  uei_sam VARCHAR(50),
  is_excluded BOOLEAN,
  exclusion_count INTEGER,
  active_exclusions JSONB,
  risk_level VARCHAR(20),
  recommendation TEXT,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_name, uei_sam)
);

CREATE INDEX idx_exclusion_entity_name ON exclusion_check_cache(entity_name);
CREATE INDEX idx_exclusion_uei_sam ON exclusion_check_cache(uei_sam) WHERE uei_sam IS NOT NULL;
CREATE INDEX idx_exclusion_cached_at ON exclusion_check_cache(cached_at);
CREATE INDEX idx_exclusion_is_excluded ON exclusion_check_cache(is_excluded);

COMMENT ON TABLE exclusion_check_cache IS 'Cache for exclusion checks (1-day cache for compliance)';

-- ============================================
-- Audit Log for Intelligence API Usage
-- ============================================
CREATE TABLE IF NOT EXISTS intelligence_api_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  api_name VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_params JSONB,
  response_status INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_intelligence_usage_user ON intelligence_api_usage(user_id);
CREATE INDEX idx_intelligence_usage_api ON intelligence_api_usage(api_name);
CREATE INDEX idx_intelligence_usage_created ON intelligence_api_usage(created_at);

COMMENT ON TABLE intelligence_api_usage IS 'Audit log for all intelligence API calls';

-- ============================================
-- Update Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_intelligence_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agency_spending_cache_timestamp
  BEFORE UPDATE ON agency_spending_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_intelligence_cache_timestamp();

CREATE TRIGGER update_labor_rate_cache_timestamp
  BEFORE UPDATE ON labor_rate_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_intelligence_cache_timestamp();

CREATE TRIGGER update_teaming_partners_cache_timestamp
  BEFORE UPDATE ON teaming_partners_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_intelligence_cache_timestamp();

CREATE TRIGGER update_exclusion_check_cache_timestamp
  BEFORE UPDATE ON exclusion_check_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_intelligence_cache_timestamp();

-- ============================================
-- Cleanup Functions for Old Cache Data
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_cache_data()
RETURNS void AS $$
BEGIN
  -- Clean up agency spending cache (older than 30 days)
  DELETE FROM agency_spending_cache WHERE cached_at < NOW() - INTERVAL '30 days';

  -- Clean up labor rate cache (older than 60 days)
  DELETE FROM labor_rate_cache WHERE cached_at < NOW() - INTERVAL '60 days';

  -- Clean up teaming partners cache (older than 30 days)
  DELETE FROM teaming_partners_cache WHERE cached_at < NOW() - INTERVAL '30 days';

  -- Clean up exclusion check cache (older than 7 days - compliance data should be fresh)
  DELETE FROM exclusion_check_cache WHERE cached_at < NOW() - INTERVAL '7 days';

  -- Clean up old API usage logs (older than 90 days)
  DELETE FROM intelligence_api_usage WHERE created_at < NOW() - INTERVAL '90 days';

  RAISE NOTICE 'Old cache data cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_cache_data() IS 'Cleanup function to remove old cached intelligence API data';

-- ============================================
-- Grant Permissions (if using role-based access)
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
