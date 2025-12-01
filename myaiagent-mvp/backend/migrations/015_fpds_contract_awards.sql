-- Migration: FPDS Contract Awards and Incumbent Tracking
-- This migration adds tables for tracking federal contract awards via FPDS
-- to identify incumbents and past performance

-- Contract Awards from FPDS
CREATE TABLE IF NOT EXISTS fpds_contract_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contract Identifiers
  piid VARCHAR(255) NOT NULL, -- Procurement Instrument Identifier
  modification_number VARCHAR(50),
  reference_idv_piid VARCHAR(255), -- Parent IDIQ/BPA
  award_id_piid VARCHAR(255), -- Unique award identifier

  -- Award Details
  contract_award_unique_key VARCHAR(255) UNIQUE,
  award_date DATE,
  signed_date DATE,
  effective_date DATE,
  current_completion_date DATE,
  ultimate_completion_date DATE,

  -- Financial Information
  base_and_exercised_options_value DECIMAL(15, 2),
  base_and_all_options_value DECIMAL(15, 2),
  current_contract_value DECIMAL(15, 2),
  potential_total_value DECIMAL(15, 2),
  dollars_obligated DECIMAL(15, 2),

  -- Contract Type
  contract_type VARCHAR(100),
  pricing_type VARCHAR(100),
  award_type VARCHAR(100),
  idv_type VARCHAR(100),

  -- Vendor Information (Incumbent)
  vendor_name VARCHAR(500),
  vendor_duns VARCHAR(50),
  vendor_uei VARCHAR(50),
  vendor_cage_code VARCHAR(50),
  vendor_location_city VARCHAR(200),
  vendor_location_state VARCHAR(50),
  vendor_location_country VARCHAR(100),

  -- Small Business Information
  small_business_competitive BOOLEAN,
  emerging_small_business BOOLEAN,
  women_owned_small_business BOOLEAN,
  service_disabled_veteran_owned BOOLEAN,
  hubzone_business BOOLEAN,
  eight_a_program_participant BOOLEAN,

  -- Agency Information
  contracting_agency_name VARCHAR(500),
  contracting_agency_id VARCHAR(100),
  contracting_office_name VARCHAR(500),
  funding_agency_name VARCHAR(500),

  -- Product/Service Information
  naics_code VARCHAR(10),
  naics_description TEXT,
  psc_code VARCHAR(10), -- Product/Service Code
  psc_description TEXT,

  -- Description
  description_of_requirement TEXT,

  -- Competition & Set-Aside
  extent_competed VARCHAR(100),
  solicitation_procedures VARCHAR(100),
  type_of_set_aside VARCHAR(100),
  number_of_offers_received INTEGER,

  -- Performance Information
  performance_based_service_acquisition VARCHAR(50),
  pop_country VARCHAR(100), -- Place of Performance
  pop_state VARCHAR(50),
  pop_city VARCHAR(200),

  -- Metadata
  fpds_last_modified TIMESTAMP,
  data_source VARCHAR(50) DEFAULT 'FPDS',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexing for fast lookups
  CONSTRAINT fpds_awards_piid_mod_unique UNIQUE(piid, modification_number)
);

-- Contract Modifications History
CREATE TABLE IF NOT EXISTS fpds_contract_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_award_id UUID REFERENCES fpds_contract_awards(id) ON DELETE CASCADE,

  modification_number VARCHAR(50),
  modification_date DATE,
  effective_date DATE,

  -- Modification Details
  description TEXT,
  reason_for_modification VARCHAR(200),

  -- Financial Changes
  change_in_dollars_obligated DECIMAL(15, 2),
  new_total_contract_value DECIMAL(15, 2),

  -- Schedule Changes
  new_completion_date DATE,
  days_extended INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_contract_modification UNIQUE(contract_award_id, modification_number)
);

-- Incumbent Analysis (Aggregated Performance)
CREATE TABLE IF NOT EXISTS incumbent_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vendor Identification
  vendor_uei VARCHAR(50),
  vendor_name VARCHAR(500),
  vendor_duns VARCHAR(50),
  vendor_cage_code VARCHAR(50),

  -- Performance Metrics
  total_contracts_won INTEGER DEFAULT 0,
  total_contract_value DECIMAL(15, 2) DEFAULT 0,
  average_contract_value DECIMAL(15, 2),

  -- Agency Relationships
  primary_agencies JSONB, -- Array of top agencies they work with
  agency_count INTEGER DEFAULT 0,

  -- Industry Focus
  primary_naics_codes JSONB, -- Top NAICS codes
  primary_psc_codes JSONB, -- Top PSC codes

  -- Set-Aside Performance
  small_business_contracts INTEGER DEFAULT 0,
  eight_a_contracts INTEGER DEFAULT 0,
  hubzone_contracts INTEGER DEFAULT 0,
  wosb_contracts INTEGER DEFAULT 0,
  sdvosb_contracts INTEGER DEFAULT 0,
  unrestricted_contracts INTEGER DEFAULT 0,

  -- Time Analysis
  first_contract_date DATE,
  latest_contract_date DATE,
  active_years INTEGER,

  -- Competition Metrics
  avg_competitors_faced DECIMAL(5, 2),
  win_rate DECIMAL(5, 4), -- Percentage as decimal (0.75 = 75%)

  -- Modification Metrics
  total_modifications INTEGER DEFAULT 0,
  avg_modifications_per_contract DECIMAL(5, 2),
  total_modification_value DECIMAL(15, 2),

  -- Analysis Metadata
  last_analyzed TIMESTAMP DEFAULT NOW(),
  data_completeness_score INTEGER, -- 0-100

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_vendor_uei UNIQUE(vendor_uei)
);

-- Competitive Intelligence Tracking
CREATE TABLE IF NOT EXISTS competitive_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Opportunity Link
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
  notice_id VARCHAR(255),

  -- Incumbent Information
  incumbent_vendor_uei VARCHAR(50),
  incumbent_vendor_name VARCHAR(500),
  incumbent_contract_piid VARCHAR(255),
  incumbent_contract_value DECIMAL(15, 2),
  incumbent_performance_rating INTEGER, -- 1-5 stars

  -- Historical Context
  recompete BOOLEAN DEFAULT FALSE,
  incumbent_years_held INTEGER,
  previous_modifications INTEGER,
  contract_performance_issues JSONB, -- Array of known issues

  -- Competition Analysis
  estimated_bidders INTEGER,
  known_competitors JSONB, -- Array of competitor UEIs/names
  market_saturation_level VARCHAR(50), -- High, Medium, Low

  -- Strategic Assessment
  win_probability DECIMAL(5, 4), -- 0-1 (calculated)
  strategic_importance INTEGER, -- 1-10
  recommended_action VARCHAR(100), -- Bid, No-Bid, Partner, etc.

  -- Intelligence Sources
  data_sources JSONB, -- Array of source types
  confidence_score INTEGER, -- 0-100

  -- Notes and Analysis
  analyst_notes TEXT,
  ai_analysis TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_fpds_awards_vendor_uei ON fpds_contract_awards(vendor_uei);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_piid ON fpds_contract_awards(piid);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_award_date ON fpds_contract_awards(award_date DESC);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_naics ON fpds_contract_awards(naics_code);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_psc ON fpds_contract_awards(psc_code);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_agency ON fpds_contract_awards(contracting_agency_id);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_value ON fpds_contract_awards(current_contract_value DESC);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_setaside ON fpds_contract_awards(type_of_set_aside);

CREATE INDEX IF NOT EXISTS idx_fpds_mods_contract_id ON fpds_contract_modifications(contract_award_id);
CREATE INDEX IF NOT EXISTS idx_fpds_mods_date ON fpds_contract_modifications(modification_date DESC);

CREATE INDEX IF NOT EXISTS idx_incumbent_vendor_uei ON incumbent_analysis(vendor_uei);
CREATE INDEX IF NOT EXISTS idx_incumbent_total_value ON incumbent_analysis(total_contract_value DESC);
CREATE INDEX IF NOT EXISTS idx_incumbent_contracts_won ON incumbent_analysis(total_contracts_won DESC);

CREATE INDEX IF NOT EXISTS idx_competitive_intel_opp ON competitive_intelligence(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_competitive_intel_incumbent ON competitive_intelligence(incumbent_vendor_uei);
CREATE INDEX IF NOT EXISTS idx_competitive_intel_win_prob ON competitive_intelligence(win_probability DESC);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_fpds_awards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fpds_awards_updated_at_trigger
  BEFORE UPDATE ON fpds_contract_awards
  FOR EACH ROW
  EXECUTE FUNCTION update_fpds_awards_updated_at();

CREATE TRIGGER incumbent_analysis_updated_at_trigger
  BEFORE UPDATE ON incumbent_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_fpds_awards_updated_at();

CREATE TRIGGER competitive_intelligence_updated_at_trigger
  BEFORE UPDATE ON competitive_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION update_fpds_awards_updated_at();

-- Comments for documentation
COMMENT ON TABLE fpds_contract_awards IS 'Stores federal contract award data from FPDS for incumbent identification';
COMMENT ON TABLE fpds_contract_modifications IS 'Tracks modifications to federal contracts over time';
COMMENT ON TABLE incumbent_analysis IS 'Aggregated performance metrics for vendors (incumbents)';
COMMENT ON TABLE competitive_intelligence IS 'Strategic analysis linking opportunities to incumbent performance';
