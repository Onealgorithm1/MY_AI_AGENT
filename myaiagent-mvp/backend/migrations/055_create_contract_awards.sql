-- Migration: Create contract_awards table
CREATE TABLE IF NOT EXISTS contract_awards (
  contract_award_unique_key VARCHAR(255) PRIMARY KEY,
  award_id_piid VARCHAR(255),
  modification_number VARCHAR(50),
  transaction_number VARCHAR(50),
  parent_award_id_piid VARCHAR(255),
  
  -- Awardee Info
  awardee_name VARCHAR(255),
  awardee_uei VARCHAR(12),
  awardee_cage VARCHAR(10),
  
  -- Financial
  total_dollars_obligated NUMERIC(20, 2),
  base_and_exercised_options_value NUMERIC(20, 2),
  base_and_all_options_value NUMERIC(20, 2),
  
  -- Dates
  date_signed DATE,
  period_of_performance_start_date DATE,
  period_of_performance_current_end_date DATE,
  
  -- Classification
  naics_code VARCHAR(10),
  psc_code VARCHAR(10),
  awarding_agency_name VARCHAR(255),
  awarding_sub_agency_name VARCHAR(255),
  
  -- Full Data Storage
  full_data JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_awards_piid ON contract_awards(award_id_piid);
CREATE INDEX IF NOT EXISTS idx_contract_awards_date_signed ON contract_awards(date_signed);
CREATE INDEX IF NOT EXISTS idx_contract_awards_uei ON contract_awards(awardee_uei);
