-- Migration: Market Analytics
-- This migration adds tables for market intelligence, trends analysis,
-- and external API data for competitive insights

-- External Market Data Sources Configuration
CREATE TABLE IF NOT EXISTS market_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source Details
  source_name VARCHAR(255) NOT NULL UNIQUE, -- USASpending, GovTribe, etc.
  source_type VARCHAR(100), -- Government, Commercial, Aggregator
  source_url VARCHAR(500),

  -- API Configuration
  api_endpoint VARCHAR(500),
  api_version VARCHAR(50),
  requires_authentication BOOLEAN DEFAULT FALSE,
  api_key_reference VARCHAR(255), -- Reference to api_secrets table

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sync TIMESTAMP,
  sync_frequency_hours INTEGER DEFAULT 24,

  -- Rate Limiting
  rate_limit_per_hour INTEGER,
  rate_limit_per_day INTEGER,

  -- Data Quality
  reliability_score INTEGER, -- 0-100
  data_freshness_days INTEGER, -- How often they update

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agency IT Spending Trends
CREATE TABLE IF NOT EXISTS agency_spending_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agency Identification
  agency_name VARCHAR(500) NOT NULL,
  agency_code VARCHAR(100),
  sub_agency_name VARCHAR(500),
  sub_agency_code VARCHAR(100),

  -- Time Period
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER, -- 1-4
  fiscal_month INTEGER, -- 1-12

  -- Spending Categories
  category VARCHAR(100), -- IT, Professional Services, R&D, etc.
  subcategory VARCHAR(200),

  -- IT-Specific Breakdown
  it_software_spending DECIMAL(15, 2),
  it_hardware_spending DECIMAL(15, 2),
  it_services_spending DECIMAL(15, 2),
  cloud_spending DECIMAL(15, 2),
  cybersecurity_spending DECIMAL(15, 2),

  -- Total Spending
  total_obligated DECIMAL(15, 2),
  total_contracts_count INTEGER,

  -- Trends
  yoy_change_percent DECIMAL(5, 2), -- Year-over-Year change
  qoq_change_percent DECIMAL(5, 2), -- Quarter-over-Quarter change

  -- Small Business
  small_business_dollars DECIMAL(15, 2),
  small_business_percent DECIMAL(5, 2),

  -- Data Source
  data_source_id UUID REFERENCES market_data_sources(id),
  external_reference_id VARCHAR(255),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_agency_period UNIQUE(agency_code, fiscal_year, fiscal_quarter, category)
);

-- Contract Value Analytics (Aggregated)
CREATE TABLE IF NOT EXISTS contract_value_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Aggregation Dimensions
  aggregation_type VARCHAR(50) NOT NULL, -- by_agency, by_naics, by_setaside, by_psc
  aggregation_key VARCHAR(255) NOT NULL, -- The actual value (agency code, NAICS, etc.)
  aggregation_label VARCHAR(500), -- Human-readable label

  -- Time Period
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER,

  -- Contract Statistics
  total_contracts INTEGER DEFAULT 0,
  total_value DECIMAL(15, 2) DEFAULT 0,
  average_value DECIMAL(15, 2),
  median_value DECIMAL(15, 2),
  min_value DECIMAL(15, 2),
  max_value DECIMAL(15, 2),

  -- Value Distribution
  under_100k_count INTEGER DEFAULT 0,
  between_100k_1m_count INTEGER DEFAULT 0,
  between_1m_10m_count INTEGER DEFAULT 0,
  over_10m_count INTEGER DEFAULT 0,

  -- Competition Metrics
  competed_contracts INTEGER DEFAULT 0,
  competed_value DECIMAL(15, 2),
  sole_source_contracts INTEGER DEFAULT 0,
  sole_source_value DECIMAL(15, 2),

  -- Set-Aside Breakdown
  small_business_value DECIMAL(15, 2),
  eight_a_value DECIMAL(15, 2),
  hubzone_value DECIMAL(15, 2),
  sdvosb_value DECIMAL(15, 2),
  wosb_value DECIMAL(15, 2),
  unrestricted_value DECIMAL(15, 2),

  -- Trend Indicators
  trend_direction VARCHAR(20), -- Up, Down, Stable
  growth_rate DECIMAL(5, 2), -- Percent change from previous period

  -- Data Source
  data_source_id UUID REFERENCES market_data_sources(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_contract_analytics UNIQUE(aggregation_type, aggregation_key, fiscal_year, fiscal_quarter)
);

-- Set-Aside Intelligence
CREATE TABLE IF NOT EXISTS setaside_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Set-Aside Type
  setaside_type VARCHAR(100) NOT NULL, -- 8(a), HUBZone, SDVOSB, WOSB, Small Business, Unrestricted

  -- Industry Focus
  naics_code VARCHAR(10),
  naics_description TEXT,
  psc_code VARCHAR(10),
  psc_description TEXT,

  -- Time Period
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER,

  -- Competition Metrics
  total_opportunities INTEGER DEFAULT 0,
  average_bidders DECIMAL(5, 2),
  competition_intensity VARCHAR(20), -- Low, Medium, High, Very High

  -- Award Statistics
  total_awards INTEGER DEFAULT 0,
  total_award_value DECIMAL(15, 2),
  average_award_value DECIMAL(15, 2),

  -- Win Rate Analysis
  estimated_bidders_total INTEGER,
  winners_identified INTEGER,
  win_rate DECIMAL(5, 4), -- Winners / Total Bidders

  -- Business Type Performance
  small_business_wins INTEGER DEFAULT 0,
  large_business_wins INTEGER DEFAULT 0,
  small_business_win_rate DECIMAL(5, 4),

  -- Incumbent Advantage
  recompete_count INTEGER DEFAULT 0,
  incumbent_retained_count INTEGER DEFAULT 0,
  incumbent_retention_rate DECIMAL(5, 4),

  -- Protest Activity
  protests_filed INTEGER DEFAULT 0,
  protests_sustained INTEGER DEFAULT 0,

  -- Market Dynamics
  new_entrants INTEGER DEFAULT 0,
  market_concentration_index DECIMAL(5, 4), -- Herfindahl-Hirschman Index

  -- Data Source
  data_source_id UUID REFERENCES market_data_sources(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_setaside_analysis UNIQUE(setaside_type, naics_code, fiscal_year, fiscal_quarter)
);

-- Market Opportunity Forecasts
CREATE TABLE IF NOT EXISTS market_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Forecast Target
  forecast_type VARCHAR(100), -- agency_spending, naics_opportunities, setaside_volume
  target_identifier VARCHAR(255), -- Agency code, NAICS code, etc.
  target_label VARCHAR(500),

  -- Time Period
  forecast_for_year INTEGER NOT NULL,
  forecast_for_quarter INTEGER,

  -- Forecast Values
  forecasted_value DECIMAL(15, 2),
  forecasted_count INTEGER,

  -- Confidence
  confidence_level VARCHAR(20), -- Low, Medium, High
  confidence_score INTEGER, -- 0-100
  prediction_interval_low DECIMAL(15, 2),
  prediction_interval_high DECIMAL(15, 2),

  -- Model Details
  model_type VARCHAR(100), -- Time Series, Regression, ML, Expert Opinion
  model_version VARCHAR(50),
  features_used JSONB,

  -- Historical Accuracy
  previous_forecast_value DECIMAL(15, 2),
  actual_value DECIMAL(15, 2),
  forecast_error DECIMAL(5, 2), -- Percentage error

  -- Assumptions
  assumptions TEXT,
  risk_factors TEXT,

  -- Data Source
  data_source_id UUID REFERENCES market_data_sources(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Competitive Landscape Analysis
CREATE TABLE IF NOT EXISTS competitive_landscape (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Market Segment
  market_segment VARCHAR(255), -- e.g., "DOD Cloud Services", "HHS IT Modernization"
  naics_code VARCHAR(10),
  psc_code VARCHAR(10),

  -- Time Period
  analysis_period_start DATE,
  analysis_period_end DATE,
  fiscal_year INTEGER,

  -- Market Size
  total_market_value DECIMAL(15, 2),
  total_contracts_awarded INTEGER,
  market_growth_rate DECIMAL(5, 2),

  -- Top Players
  top_vendors JSONB, -- Array of {vendor_uei, vendor_name, market_share, revenue}
  market_leader_uei VARCHAR(50),
  market_leader_share DECIMAL(5, 4),

  -- Market Concentration
  hhi_index DECIMAL(8, 4), -- Herfindahl-Hirschman Index
  market_structure VARCHAR(50), -- Monopoly, Oligopoly, Competitive, Fragmented
  top_4_concentration DECIMAL(5, 4), -- CR4 ratio

  -- Barriers to Entry
  entry_difficulty VARCHAR(20), -- Low, Medium, High, Very High
  key_barriers JSONB, -- Array of barrier types

  -- Opportunities
  white_space_opportunities INTEGER, -- Areas with low competition
  emerging_sub_markets JSONB,

  -- Trends
  key_trends JSONB,
  disruptive_technologies JSONB,

  -- Strategic Recommendations
  recommendations TEXT,

  -- Data Source
  data_source_id UUID REFERENCES market_data_sources(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  analyzed_by UUID REFERENCES users(id)
);

-- External API Response Cache
CREATE TABLE IF NOT EXISTS market_api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- API Call Details
  data_source_id UUID REFERENCES market_data_sources(id),
  endpoint VARCHAR(500),
  query_parameters JSONB,
  query_hash VARCHAR(64) UNIQUE, -- SHA-256 hash of endpoint + params

  -- Response Data
  response_data JSONB,
  response_status INTEGER,
  response_headers JSONB,

  -- Cache Control
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  cache_hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT NOW(),

  -- Data Quality
  is_valid BOOLEAN DEFAULT TRUE,
  validation_errors JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Market Insights (AI-Generated)
CREATE TABLE IF NOT EXISTS market_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Insight Details
  insight_type VARCHAR(100), -- Trend, Opportunity, Risk, Recommendation
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  detailed_analysis TEXT,

  -- Relevance
  relevant_to_naics JSONB, -- Array of NAICS codes
  relevant_to_agencies JSONB, -- Array of agency codes
  relevant_to_setasides JSONB,

  -- Impact Assessment
  impact_level VARCHAR(20), -- Low, Medium, High, Critical
  urgency VARCHAR(20), -- Low, Medium, High
  opportunity_value_range VARCHAR(100), -- e.g., "$1M-$5M"

  -- Confidence
  confidence_score INTEGER, -- 0-100
  data_sources JSONB, -- Array of source references

  -- Actions
  recommended_actions JSONB, -- Array of action items
  assigned_to UUID REFERENCES users(id),

  -- Status
  status VARCHAR(50) DEFAULT 'New', -- New, Reviewing, Actioned, Dismissed
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id), -- NULL if AI-generated
  is_ai_generated BOOLEAN DEFAULT TRUE
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_agency_spending_agency ON agency_spending_trends(agency_code);
CREATE INDEX IF NOT EXISTS idx_agency_spending_year ON agency_spending_trends(fiscal_year DESC);
CREATE INDEX IF NOT EXISTS idx_agency_spending_category ON agency_spending_trends(category);

CREATE INDEX IF NOT EXISTS idx_contract_analytics_type ON contract_value_analytics(aggregation_type);
CREATE INDEX IF NOT EXISTS idx_contract_analytics_key ON contract_value_analytics(aggregation_key);
CREATE INDEX IF NOT EXISTS idx_contract_analytics_year ON contract_value_analytics(fiscal_year DESC);

CREATE INDEX IF NOT EXISTS idx_setaside_type ON setaside_intelligence(setaside_type);
CREATE INDEX IF NOT EXISTS idx_setaside_naics ON setaside_intelligence(naics_code);
CREATE INDEX IF NOT EXISTS idx_setaside_year ON setaside_intelligence(fiscal_year DESC);

CREATE INDEX IF NOT EXISTS idx_forecasts_type ON market_forecasts(forecast_type);
CREATE INDEX IF NOT EXISTS idx_forecasts_target ON market_forecasts(target_identifier);
CREATE INDEX IF NOT EXISTS idx_forecasts_year ON market_forecasts(forecast_for_year);

CREATE INDEX IF NOT EXISTS idx_competitive_segment ON competitive_landscape(market_segment);
CREATE INDEX IF NOT EXISTS idx_competitive_naics ON competitive_landscape(naics_code);

CREATE INDEX IF NOT EXISTS idx_api_cache_hash ON market_api_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON market_api_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_insights_type ON market_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_impact ON market_insights(impact_level);
CREATE INDEX IF NOT EXISTS idx_insights_status ON market_insights(status);

-- Triggers for automatic updates
-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_evm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER market_data_sources_updated_at_trigger
  BEFORE UPDATE ON market_data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER agency_spending_updated_at_trigger
  BEFORE UPDATE ON agency_spending_trends
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER contract_analytics_updated_at_trigger
  BEFORE UPDATE ON contract_value_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER setaside_intel_updated_at_trigger
  BEFORE UPDATE ON setaside_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER forecasts_updated_at_trigger
  BEFORE UPDATE ON market_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER competitive_landscape_updated_at_trigger
  BEFORE UPDATE ON competitive_landscape
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

-- Function to update cache hit count
CREATE OR REPLACE FUNCTION update_cache_hit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.cache_hit_count = OLD.cache_hit_count + 1;
  NEW.last_accessed = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE market_data_sources IS 'External API sources for market intelligence';
COMMENT ON TABLE agency_spending_trends IS 'Historical and current agency IT spending patterns';
COMMENT ON TABLE contract_value_analytics IS 'Aggregated contract value statistics by various dimensions';
COMMENT ON TABLE setaside_intelligence IS 'Competition and win rate analysis by set-aside type';
COMMENT ON TABLE market_forecasts IS 'Predictive analytics for market opportunities';
COMMENT ON TABLE competitive_landscape IS 'Market structure and competitive dynamics analysis';
COMMENT ON TABLE market_api_cache IS 'Cache for external market API responses';
COMMENT ON TABLE market_insights IS 'AI-generated market intelligence and recommendations';
