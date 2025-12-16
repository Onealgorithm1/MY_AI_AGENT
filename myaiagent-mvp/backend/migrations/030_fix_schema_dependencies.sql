-- Migration 030: Fix Schema Dependencies and Type Mismatches
-- Addresses: missing attachments table, UUID/INTEGER mismatches, and orphaned table references

-- ============================================
-- 1. Create missing attachments table
-- ============================================
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'analyzed', 'failed')),
  analysis_result JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_user ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_conversation ON attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created ON attachments(created_at DESC);

-- ============================================
-- 2. Fix samgov_opportunities_cache - change UUID to INTEGER
-- ============================================
-- Drop old table if it exists with problematic UUID
DO $$
DECLARE
  v_has_uuid_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'samgov_opportunities_cache'
      AND column_name = 'created_by'
      AND data_type = 'uuid'
  ) INTO v_has_uuid_column;

  IF v_has_uuid_column THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_samgov_cache_timestamp ON samgov_opportunities_cache';
    EXECUTE 'DROP FUNCTION IF EXISTS update_samgov_cache_timestamp()';
    EXECUTE 'DROP TABLE IF EXISTS samgov_opportunities_cache CASCADE';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS samgov_opportunities_cache (
  id SERIAL PRIMARY KEY,
  notice_id VARCHAR(255) UNIQUE NOT NULL,
  solicitation_number VARCHAR(255),
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
  raw_data JSONB NOT NULL,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  seen_count INTEGER DEFAULT 1 NOT NULL,
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_samgov_cache_notice_id ON samgov_opportunities_cache(notice_id);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_posted_date ON samgov_opportunities_cache(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_deadline ON samgov_opportunities_cache(response_deadline);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_first_seen ON samgov_opportunities_cache(first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_last_seen ON samgov_opportunities_cache(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_opportunity_id ON samgov_opportunities_cache(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_naics ON samgov_opportunities_cache(naics_code);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_raw_data ON samgov_opportunities_cache USING GIN (raw_data);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_org ON samgov_opportunities_cache(organization_id);

CREATE OR REPLACE FUNCTION update_samgov_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_samgov_cache_timestamp ON samgov_opportunities_cache;

CREATE TRIGGER update_samgov_cache_timestamp
BEFORE UPDATE ON samgov_opportunities_cache
FOR EACH ROW
EXECUTE FUNCTION update_samgov_cache_timestamp();

-- ============================================
-- 3. Fix samgov_search_history - ensure correct user reference
-- ============================================
CREATE TABLE IF NOT EXISTS samgov_search_history (
  id SERIAL PRIMARY KEY,
  keyword TEXT,
  posted_from DATE,
  posted_to DATE,
  naics_code VARCHAR(50),
  total_records INTEGER,
  new_records INTEGER,
  existing_records INTEGER,
  searched_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  search_params JSONB,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_samgov_search_user ON samgov_search_history(searched_by);
CREATE INDEX IF NOT EXISTS idx_samgov_search_date ON samgov_search_history(searched_at DESC);

-- ============================================
-- 4. Ensure samgov_documents table exists with correct references
-- ============================================
CREATE TABLE IF NOT EXISTS samgov_documents (
  id SERIAL PRIMARY KEY,
  opportunity_cache_id INTEGER REFERENCES samgov_opportunities_cache(id) ON DELETE CASCADE,
  notice_id VARCHAR(255) NOT NULL,
  document_url TEXT NOT NULL,
  document_type VARCHAR(100),
  file_name VARCHAR(500),
  file_size BIGINT,
  raw_text TEXT,
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  analyzed BOOLEAN DEFAULT FALSE,
  analysis_completed_at TIMESTAMP,
  key_requirements JSONB,
  evaluation_criteria JSONB,
  deadlines JSONB,
  technical_specifications JSONB,
  contact_info JSONB,
  pricing_info JSONB,
  executive_summary TEXT,
  requirements_summary TEXT,
  technical_summary TEXT,
  compliance_requirements TEXT,
  risk_assessment TEXT,
  bid_recommendation TEXT,
  win_probability DECIMAL(5,2),
  fetch_status VARCHAR(50) DEFAULT 'pending',
  fetch_error TEXT,
  fetch_attempts INTEGER DEFAULT 0,
  last_fetch_attempt TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(opportunity_cache_id, document_url)
);

CREATE INDEX IF NOT EXISTS idx_samgov_documents_notice_id ON samgov_documents(notice_id);
CREATE INDEX IF NOT EXISTS idx_samgov_documents_status ON samgov_documents(fetch_status);
CREATE INDEX IF NOT EXISTS idx_samgov_documents_analyzed ON samgov_documents(analyzed);
CREATE INDEX IF NOT EXISTS idx_samgov_documents_opportunity ON samgov_documents(opportunity_cache_id);

-- ============================================
-- 5. Ensure samgov_document_analysis_queue table exists
-- ============================================
CREATE TABLE IF NOT EXISTS samgov_document_analysis_queue (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES samgov_documents(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON samgov_document_analysis_queue(status, priority DESC);

-- ============================================
-- 6. Ensure fpds_contract_awards uses INTEGER for user references
-- ============================================
CREATE TABLE IF NOT EXISTS fpds_contract_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piid VARCHAR(255) NOT NULL,
  modification_number VARCHAR(50),
  reference_idv_piid VARCHAR(255),
  award_id_piid VARCHAR(255),
  contract_award_unique_key VARCHAR(255) UNIQUE,
  award_date DATE,
  signed_date DATE,
  effective_date DATE,
  current_completion_date DATE,
  ultimate_completion_date DATE,
  base_and_exercised_options_value DECIMAL(15, 2),
  base_and_all_options_value DECIMAL(15, 2),
  current_contract_value DECIMAL(15, 2),
  potential_total_value DECIMAL(15, 2),
  dollars_obligated DECIMAL(15, 2),
  contract_type VARCHAR(100),
  pricing_type VARCHAR(100),
  award_type VARCHAR(100),
  idv_type VARCHAR(100),
  vendor_name VARCHAR(500),
  vendor_duns VARCHAR(50),
  vendor_uei VARCHAR(50),
  vendor_cage_code VARCHAR(50),
  vendor_location_city VARCHAR(200),
  vendor_location_state VARCHAR(50),
  vendor_location_country VARCHAR(100),
  small_business_competitive BOOLEAN,
  emerging_small_business BOOLEAN,
  women_owned_small_business BOOLEAN,
  service_disabled_veteran_owned BOOLEAN,
  hubzone_business BOOLEAN,
  eight_a_program_participant BOOLEAN,
  contracting_agency_name VARCHAR(500),
  contracting_agency_id VARCHAR(100),
  contracting_office_name VARCHAR(500),
  funding_agency_name VARCHAR(500),
  naics_code VARCHAR(10),
  naics_description TEXT,
  psc_code VARCHAR(10),
  psc_description TEXT,
  description_of_requirement TEXT,
  extent_competed VARCHAR(100),
  solicitation_procedures VARCHAR(100),
  type_of_set_aside VARCHAR(100),
  number_of_offers_received INTEGER,
  performance_based_service_acquisition VARCHAR(50),
  pop_country VARCHAR(100),
  pop_state VARCHAR(50),
  pop_city VARCHAR(200),
  fpds_last_modified TIMESTAMP,
  data_source VARCHAR(50) DEFAULT 'FPDS',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fpds_awards_piid_mod_unique UNIQUE(piid, modification_number)
);

CREATE INDEX IF NOT EXISTS idx_fpds_awards_vendor_uei ON fpds_contract_awards(vendor_uei);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_piid ON fpds_contract_awards(piid);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_award_date ON fpds_contract_awards(award_date DESC);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_naics ON fpds_contract_awards(naics_code);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_psc ON fpds_contract_awards(psc_code);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_agency ON fpds_contract_awards(contracting_agency_id);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_value ON fpds_contract_awards(current_contract_value DESC);
CREATE INDEX IF NOT EXISTS idx_fpds_awards_setaside ON fpds_contract_awards(type_of_set_aside);

-- ============================================
-- 7. Ensure fpds_contract_modifications exists
-- ============================================
CREATE TABLE IF NOT EXISTS fpds_contract_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_award_id UUID REFERENCES fpds_contract_awards(id) ON DELETE CASCADE,
  modification_number VARCHAR(50),
  modification_date DATE,
  effective_date DATE,
  description TEXT,
  reason_for_modification VARCHAR(200),
  change_in_dollars_obligated DECIMAL(15, 2),
  new_total_contract_value DECIMAL(15, 2),
  new_completion_date DATE,
  days_extended INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_contract_modification UNIQUE(contract_award_id, modification_number)
);

CREATE INDEX IF NOT EXISTS idx_fpds_mods_contract_id ON fpds_contract_modifications(contract_award_id);
CREATE INDEX IF NOT EXISTS idx_fpds_mods_date ON fpds_contract_modifications(modification_date DESC);

-- ============================================
-- 8. Ensure incumbent_analysis exists
-- ============================================
CREATE TABLE IF NOT EXISTS incumbent_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_uei VARCHAR(50),
  vendor_name VARCHAR(500),
  vendor_duns VARCHAR(50),
  vendor_cage_code VARCHAR(50),
  total_contracts_won INTEGER DEFAULT 0,
  total_contract_value DECIMAL(15, 2) DEFAULT 0,
  average_contract_value DECIMAL(15, 2),
  primary_agencies JSONB,
  agency_count INTEGER DEFAULT 0,
  primary_naics_codes JSONB,
  primary_psc_codes JSONB,
  small_business_contracts INTEGER DEFAULT 0,
  eight_a_contracts INTEGER DEFAULT 0,
  hubzone_contracts INTEGER DEFAULT 0,
  wosb_contracts INTEGER DEFAULT 0,
  sdvosb_contracts INTEGER DEFAULT 0,
  unrestricted_contracts INTEGER DEFAULT 0,
  first_contract_date DATE,
  latest_contract_date DATE,
  active_years INTEGER,
  avg_competitors_faced DECIMAL(5, 2),
  win_rate DECIMAL(5, 4),
  total_modifications INTEGER DEFAULT 0,
  avg_modifications_per_contract DECIMAL(5, 2),
  total_modification_value DECIMAL(15, 2),
  last_analyzed TIMESTAMP DEFAULT NOW(),
  data_completeness_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_vendor_uei UNIQUE(vendor_uei)
);

CREATE INDEX IF NOT EXISTS idx_incumbent_vendor_uei ON incumbent_analysis(vendor_uei);
CREATE INDEX IF NOT EXISTS idx_incumbent_total_value ON incumbent_analysis(total_contract_value DESC);
CREATE INDEX IF NOT EXISTS idx_incumbent_contracts_won ON incumbent_analysis(total_contracts_won DESC);

-- ============================================
-- 9. Ensure competitive_intelligence exists with INTEGER user reference
-- ============================================
CREATE TABLE IF NOT EXISTS competitive_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
  notice_id VARCHAR(255),
  incumbent_vendor_uei VARCHAR(50),
  incumbent_vendor_name VARCHAR(500),
  incumbent_contract_piid VARCHAR(255),
  incumbent_contract_value DECIMAL(15, 2),
  incumbent_performance_rating INTEGER,
  recompete BOOLEAN DEFAULT FALSE,
  incumbent_years_held INTEGER,
  previous_modifications INTEGER,
  contract_performance_issues JSONB,
  estimated_bidders INTEGER,
  known_competitors JSONB,
  market_saturation_level VARCHAR(50),
  win_probability DECIMAL(5, 4),
  strategic_importance INTEGER,
  recommended_action VARCHAR(100),
  data_sources JSONB,
  confidence_score INTEGER,
  analyst_notes TEXT,
  ai_analysis TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_competitive_intel_opp ON competitive_intelligence(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_competitive_intel_incumbent ON competitive_intelligence(incumbent_vendor_uei);
CREATE INDEX IF NOT EXISTS idx_competitive_intel_win_prob ON competitive_intelligence(win_probability DESC);

-- ============================================
-- 10. Ensure evm_projects exists with INTEGER user reference
-- ============================================
CREATE TABLE IF NOT EXISTS evm_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(500) NOT NULL,
  project_number VARCHAR(100) UNIQUE,
  opportunity_id INTEGER REFERENCES opportunities(id),
  contract_award_id UUID REFERENCES fpds_contract_awards(id),
  contract_piid VARCHAR(255),
  description TEXT,
  project_manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  project_status VARCHAR(50) DEFAULT 'Planning',
  total_budget DECIMAL(15, 2) NOT NULL,
  budget_at_completion DECIMAL(15, 2),
  planned_start_date DATE NOT NULL,
  planned_end_date DATE NOT NULL,
  actual_start_date DATE,
  actual_end_date DATE,
  cpi_threshold DECIMAL(5, 4) DEFAULT 0.9,
  spi_threshold DECIMAL(5, 4) DEFAULT 0.9,
  current_cpi DECIMAL(5, 4),
  current_spi DECIMAL(5, 4),
  current_cv DECIMAL(15, 2),
  current_sv DECIMAL(15, 2),
  estimate_at_completion DECIMAL(15, 2),
  estimate_to_complete DECIMAL(15, 2),
  variance_at_completion DECIMAL(15, 2),
  tcpi DECIMAL(5, 4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_evm_projects_status ON evm_projects(project_status);
CREATE INDEX IF NOT EXISTS idx_evm_projects_manager ON evm_projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_evm_projects_contract ON evm_projects(contract_award_id);

-- ============================================
-- 11. Ensure evm_reporting_periods exists with INTEGER user reference
-- ============================================
CREATE TABLE IF NOT EXISTS evm_reporting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES evm_projects(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  period_name VARCHAR(100),
  planned_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  earned_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  actual_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cumulative_pv DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cumulative_ev DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cumulative_ac DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cost_performance_index DECIMAL(5, 4),
  schedule_performance_index DECIMAL(5, 4),
  cost_variance DECIMAL(15, 2),
  schedule_variance DECIMAL(15, 2),
  percent_planned DECIMAL(5, 4),
  percent_complete DECIMAL(5, 4),
  percent_spent DECIMAL(5, 4),
  performance_summary TEXT,
  issues_identified TEXT,
  corrective_actions TEXT,
  reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reported_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_project_period UNIQUE(project_id, period_end_date)
);

CREATE INDEX IF NOT EXISTS idx_evm_periods_project ON evm_reporting_periods(project_id);
CREATE INDEX IF NOT EXISTS idx_evm_periods_date ON evm_reporting_periods(period_end_date DESC);
CREATE INDEX IF NOT EXISTS idx_evm_periods_cpi ON evm_reporting_periods(cost_performance_index);
CREATE INDEX IF NOT EXISTS idx_evm_periods_spi ON evm_reporting_periods(schedule_performance_index);

-- ============================================
-- 12. Ensure evm_wbs exists with INTEGER user reference
-- ============================================
CREATE TABLE IF NOT EXISTS evm_wbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES evm_projects(id) ON DELETE CASCADE,
  wbs_code VARCHAR(50) NOT NULL,
  wbs_name VARCHAR(500) NOT NULL,
  parent_wbs_id UUID REFERENCES evm_wbs(id),
  level INTEGER NOT NULL,
  baseline_budget DECIMAL(15, 2),
  baseline_start_date DATE,
  baseline_end_date DATE,
  planned_value DECIMAL(15, 2) DEFAULT 0,
  earned_value DECIMAL(15, 2) DEFAULT 0,
  actual_cost DECIMAL(15, 2) DEFAULT 0,
  responsible_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'Not Started',
  percent_complete INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_wbs_code UNIQUE(project_id, wbs_code)
);

CREATE INDEX IF NOT EXISTS idx_evm_wbs_project ON evm_wbs(project_id);
CREATE INDEX IF NOT EXISTS idx_evm_wbs_parent ON evm_wbs(parent_wbs_id);
CREATE INDEX IF NOT EXISTS idx_evm_wbs_code ON evm_wbs(wbs_code);

-- ============================================
-- 13. Ensure evm_performance_alerts exists with INTEGER user reference
-- ============================================
CREATE TABLE IF NOT EXISTS evm_performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES evm_projects(id) ON DELETE CASCADE,
  reporting_period_id UUID REFERENCES evm_reporting_periods(id),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  metric_name VARCHAR(50),
  metric_value DECIMAL(15, 2),
  threshold_value DECIMAL(15, 2),
  alert_title VARCHAR(200),
  alert_message TEXT,
  status VARCHAR(50) DEFAULT 'Active',
  acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evm_alerts_project ON evm_performance_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_evm_alerts_status ON evm_performance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_evm_alerts_severity ON evm_performance_alerts(severity);

-- ============================================
-- 14. Ensure evm_forecasts exists with INTEGER user reference
-- ============================================
CREATE TABLE IF NOT EXISTS evm_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES evm_projects(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  eac_method VARCHAR(100),
  estimate_at_completion DECIMAL(15, 2),
  estimate_to_complete DECIMAL(15, 2),
  variance_at_completion DECIMAL(15, 2),
  tcpi_bac DECIMAL(5, 4),
  tcpi_eac DECIMAL(5, 4),
  estimated_completion_date DATE,
  schedule_variance_days INTEGER,
  confidence_level VARCHAR(20),
  assumptions TEXT,
  risks TEXT,
  trend_analysis TEXT,
  recommendations TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_evm_forecasts_project ON evm_forecasts(project_id);
CREATE INDEX IF NOT EXISTS idx_evm_forecasts_date ON evm_forecasts(forecast_date DESC);

-- ============================================
-- 15. Recreate triggers for automatic timestamp updates
-- ============================================
CREATE OR REPLACE FUNCTION update_fpds_awards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fpds_awards_updated_at_trigger ON fpds_contract_awards;
CREATE TRIGGER fpds_awards_updated_at_trigger
  BEFORE UPDATE ON fpds_contract_awards
  FOR EACH ROW
  EXECUTE FUNCTION update_fpds_awards_updated_at();

DROP TRIGGER IF EXISTS incumbent_analysis_updated_at_trigger ON incumbent_analysis;
CREATE TRIGGER incumbent_analysis_updated_at_trigger
  BEFORE UPDATE ON incumbent_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_fpds_awards_updated_at();

DROP TRIGGER IF EXISTS competitive_intelligence_updated_at_trigger ON competitive_intelligence;
CREATE TRIGGER competitive_intelligence_updated_at_trigger
  BEFORE UPDATE ON competitive_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION update_fpds_awards_updated_at();

CREATE OR REPLACE FUNCTION update_evm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS evm_projects_updated_at_trigger ON evm_projects;
CREATE TRIGGER evm_projects_updated_at_trigger
  BEFORE UPDATE ON evm_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

DROP TRIGGER IF EXISTS evm_wbs_updated_at_trigger ON evm_wbs;
CREATE TRIGGER evm_wbs_updated_at_trigger
  BEFORE UPDATE ON evm_wbs
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE OR REPLACE FUNCTION update_samgov_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS samgov_documents_updated_at ON samgov_documents;
CREATE TRIGGER samgov_documents_updated_at
  BEFORE UPDATE ON samgov_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_samgov_documents_updated_at();

DROP TRIGGER IF EXISTS samgov_analysis_queue_updated_at ON samgov_document_analysis_queue;
CREATE TRIGGER samgov_analysis_queue_updated_at
  BEFORE UPDATE ON samgov_document_analysis_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_samgov_documents_updated_at();

CREATE OR REPLACE FUNCTION calculate_evm_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_cost > 0 THEN
    NEW.cost_performance_index = NEW.earned_value / NEW.actual_cost;
  ELSE
    NEW.cost_performance_index = NULL;
  END IF;

  IF NEW.planned_value > 0 THEN
    NEW.schedule_performance_index = NEW.earned_value / NEW.planned_value;
  ELSE
    NEW.schedule_performance_index = NULL;
  END IF;

  NEW.cost_variance = NEW.earned_value - NEW.actual_cost;
  NEW.schedule_variance = NEW.earned_value - NEW.planned_value;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS evm_periods_calculate_metrics ON evm_reporting_periods;
CREATE TRIGGER evm_periods_calculate_metrics
  BEFORE INSERT OR UPDATE ON evm_reporting_periods
  FOR EACH ROW
  EXECUTE FUNCTION calculate_evm_metrics();

CREATE OR REPLACE FUNCTION update_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS attachments_updated_at_trigger ON attachments;
CREATE TRIGGER attachments_updated_at_trigger
  BEFORE UPDATE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_attachments_updated_at();

COMMENT ON TABLE attachments IS 'File attachments uploaded by users for conversations and messages';
COMMENT ON TABLE samgov_opportunities_cache IS 'Automatic cache of all SAM.gov opportunities seen in searches';
COMMENT ON TABLE samgov_documents IS 'Fetched and analyzed documents from SAM.gov opportunities';
COMMENT ON TABLE fpds_contract_awards IS 'Federal contract award data from FPDS for incumbent identification';
COMMENT ON TABLE competitive_intelligence IS 'Strategic analysis linking opportunities to incumbent performance';
COMMENT ON TABLE evm_projects IS 'EVM project tracking for awarded contracts';
