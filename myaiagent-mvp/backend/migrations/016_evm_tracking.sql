-- Migration: Earned Value Management (EVM) Tracking
-- This migration adds tables for tracking contract performance using EVM metrics
-- PV (Planned Value), EV (Earned Value), AC (Actual Cost), CPI, SPI, CV, SV

-- EVM Projects (Links to awarded contracts)
CREATE TABLE IF NOT EXISTS evm_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Identification
  project_name VARCHAR(500) NOT NULL,
  project_number VARCHAR(100) UNIQUE,

  -- Contract Links
  opportunity_id INTEGER REFERENCES opportunities(id),
  contract_award_id UUID REFERENCES fpds_contract_awards(id),
  contract_piid VARCHAR(255),

  -- Project Basics
  description TEXT,
  project_manager_id UUID REFERENCES users(id),
  project_status VARCHAR(50) DEFAULT 'Planning', -- Planning, Active, On Hold, Completed, Cancelled

  -- Financial Baseline
  total_budget DECIMAL(15, 2) NOT NULL,
  budget_at_completion DECIMAL(15, 2), -- BAC

  -- Schedule Baseline
  planned_start_date DATE NOT NULL,
  planned_end_date DATE NOT NULL,
  actual_start_date DATE,
  actual_end_date DATE,

  -- Performance Thresholds
  cpi_threshold DECIMAL(5, 4) DEFAULT 0.9, -- Alert if CPI falls below this
  spi_threshold DECIMAL(5, 4) DEFAULT 0.9, -- Alert if SPI falls below this

  -- Current Metrics (Calculated)
  current_cpi DECIMAL(5, 4),
  current_spi DECIMAL(5, 4),
  current_cv DECIMAL(15, 2),
  current_sv DECIMAL(15, 2),

  -- Forecasting
  estimate_at_completion DECIMAL(15, 2), -- EAC
  estimate_to_complete DECIMAL(15, 2), -- ETC
  variance_at_completion DECIMAL(15, 2), -- VAC
  tcpi DECIMAL(5, 4), -- To-Complete Performance Index

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- EVM Reporting Periods (Weekly/Monthly snapshots)
CREATE TABLE IF NOT EXISTS evm_reporting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES evm_projects(id) ON DELETE CASCADE,

  -- Period Information
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  period_name VARCHAR(100), -- e.g., "Week 12", "March 2025"

  -- The Three Core Values
  planned_value DECIMAL(15, 2) NOT NULL DEFAULT 0, -- PV: What we planned to accomplish
  earned_value DECIMAL(15, 2) NOT NULL DEFAULT 0, -- EV: What we actually accomplished
  actual_cost DECIMAL(15, 2) NOT NULL DEFAULT 0, -- AC: What we actually spent

  -- Cumulative Values
  cumulative_pv DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cumulative_ev DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cumulative_ac DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Performance Indexes
  cost_performance_index DECIMAL(5, 4), -- CPI = EV / AC
  schedule_performance_index DECIMAL(5, 4), -- SPI = EV / PV

  -- Variances
  cost_variance DECIMAL(15, 2), -- CV = EV - AC
  schedule_variance DECIMAL(15, 2), -- SV = EV - PV

  -- Percent Complete
  percent_planned DECIMAL(5, 4), -- PV / BAC
  percent_complete DECIMAL(5, 4), -- EV / BAC
  percent_spent DECIMAL(5, 4), -- AC / BAC

  -- Analysis and Notes
  performance_summary TEXT,
  issues_identified TEXT,
  corrective_actions TEXT,

  -- Metadata
  reported_by UUID REFERENCES users(id),
  reported_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_project_period UNIQUE(project_id, period_end_date)
);

-- EVM Work Breakdown Structure (WBS)
CREATE TABLE IF NOT EXISTS evm_wbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES evm_projects(id) ON DELETE CASCADE,

  -- WBS Hierarchy
  wbs_code VARCHAR(50) NOT NULL, -- e.g., "1.2.3"
  wbs_name VARCHAR(500) NOT NULL,
  parent_wbs_id UUID REFERENCES evm_wbs(id),
  level INTEGER NOT NULL, -- 1 = top level, 2 = sub-level, etc.

  -- Baseline
  baseline_budget DECIMAL(15, 2),
  baseline_start_date DATE,
  baseline_end_date DATE,

  -- Current Values
  planned_value DECIMAL(15, 2) DEFAULT 0,
  earned_value DECIMAL(15, 2) DEFAULT 0,
  actual_cost DECIMAL(15, 2) DEFAULT 0,

  -- Responsible Party
  responsible_user_id UUID REFERENCES users(id),

  -- Status
  status VARCHAR(50) DEFAULT 'Not Started', -- Not Started, In Progress, Completed
  percent_complete INTEGER DEFAULT 0, -- 0-100

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_wbs_code UNIQUE(project_id, wbs_code)
);

-- EVM Performance Alerts
CREATE TABLE IF NOT EXISTS evm_performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES evm_projects(id) ON DELETE CASCADE,
  reporting_period_id UUID REFERENCES evm_reporting_periods(id),

  -- Alert Details
  alert_type VARCHAR(50) NOT NULL, -- CPI_LOW, SPI_LOW, CV_NEGATIVE, SV_NEGATIVE, OVERRUN_RISK
  severity VARCHAR(20) NOT NULL, -- Low, Medium, High, Critical

  -- Metrics
  metric_name VARCHAR(50), -- CPI, SPI, CV, SV, etc.
  metric_value DECIMAL(15, 2),
  threshold_value DECIMAL(15, 2),

  -- Alert Message
  alert_title VARCHAR(200),
  alert_message TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'Active', -- Active, Acknowledged, Resolved, Dismissed
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- EVM Forecasts and Trends
CREATE TABLE IF NOT EXISTS evm_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES evm_projects(id) ON DELETE CASCADE,

  -- Forecast Date
  forecast_date DATE NOT NULL,

  -- Estimate at Completion Methods
  eac_method VARCHAR(100), -- CPI, SPI, CPI*SPI, Custom
  estimate_at_completion DECIMAL(15, 2),
  estimate_to_complete DECIMAL(15, 2),
  variance_at_completion DECIMAL(15, 2),

  -- To-Complete Performance Index
  tcpi_bac DECIMAL(5, 4), -- TCPI based on BAC
  tcpi_eac DECIMAL(5, 4), -- TCPI based on EAC

  -- Schedule Forecast
  estimated_completion_date DATE,
  schedule_variance_days INTEGER,

  -- Confidence
  confidence_level VARCHAR(20), -- Low, Medium, High
  assumptions TEXT,
  risks TEXT,

  -- Analysis
  trend_analysis TEXT,
  recommendations TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_evm_projects_status ON evm_projects(project_status);
CREATE INDEX IF NOT EXISTS idx_evm_projects_manager ON evm_projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_evm_projects_contract ON evm_projects(contract_award_id);

CREATE INDEX IF NOT EXISTS idx_evm_periods_project ON evm_reporting_periods(project_id);
CREATE INDEX IF NOT EXISTS idx_evm_periods_date ON evm_reporting_periods(period_end_date DESC);
CREATE INDEX IF NOT EXISTS idx_evm_periods_cpi ON evm_reporting_periods(cost_performance_index);
CREATE INDEX IF NOT EXISTS idx_evm_periods_spi ON evm_reporting_periods(schedule_performance_index);

CREATE INDEX IF NOT EXISTS idx_evm_wbs_project ON evm_wbs(project_id);
CREATE INDEX IF NOT EXISTS idx_evm_wbs_parent ON evm_wbs(parent_wbs_id);
CREATE INDEX IF NOT EXISTS idx_evm_wbs_code ON evm_wbs(wbs_code);

CREATE INDEX IF NOT EXISTS idx_evm_alerts_project ON evm_performance_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_evm_alerts_status ON evm_performance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_evm_alerts_severity ON evm_performance_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_evm_forecasts_project ON evm_forecasts(project_id);
CREATE INDEX IF NOT EXISTS idx_evm_forecasts_date ON evm_forecasts(forecast_date DESC);

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_evm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evm_projects_updated_at_trigger
  BEFORE UPDATE ON evm_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER evm_wbs_updated_at_trigger
  BEFORE UPDATE ON evm_wbs
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

-- Function to calculate EVM metrics automatically
CREATE OR REPLACE FUNCTION calculate_evm_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate CPI (Cost Performance Index)
  IF NEW.actual_cost > 0 THEN
    NEW.cost_performance_index = NEW.earned_value / NEW.actual_cost;
  ELSE
    NEW.cost_performance_index = NULL;
  END IF;

  -- Calculate SPI (Schedule Performance Index)
  IF NEW.planned_value > 0 THEN
    NEW.schedule_performance_index = NEW.earned_value / NEW.planned_value;
  ELSE
    NEW.schedule_performance_index = NULL;
  END IF;

  -- Calculate CV (Cost Variance)
  NEW.cost_variance = NEW.earned_value - NEW.actual_cost;

  -- Calculate SV (Schedule Variance)
  NEW.schedule_variance = NEW.earned_value - NEW.planned_value;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evm_periods_calculate_metrics
  BEFORE INSERT OR UPDATE ON evm_reporting_periods
  FOR EACH ROW
  EXECUTE FUNCTION calculate_evm_metrics();

-- Comments for documentation
COMMENT ON TABLE evm_projects IS 'EVM project tracking for awarded contracts';
COMMENT ON TABLE evm_reporting_periods IS 'Weekly/monthly EVM snapshots with PV, EV, AC metrics';
COMMENT ON TABLE evm_wbs IS 'Work Breakdown Structure for detailed tracking';
COMMENT ON TABLE evm_performance_alerts IS 'Automated alerts for performance issues';
COMMENT ON TABLE evm_forecasts IS 'Cost and schedule forecasting data';

COMMENT ON COLUMN evm_reporting_periods.planned_value IS 'PV: Budgeted cost of work scheduled';
COMMENT ON COLUMN evm_reporting_periods.earned_value IS 'EV: Budgeted cost of work performed';
COMMENT ON COLUMN evm_reporting_periods.actual_cost IS 'AC: Actual cost of work performed';
COMMENT ON COLUMN evm_reporting_periods.cost_performance_index IS 'CPI: EV/AC - measures cost efficiency';
COMMENT ON COLUMN evm_reporting_periods.schedule_performance_index IS 'SPI: EV/PV - measures schedule efficiency';
COMMENT ON COLUMN evm_reporting_periods.cost_variance IS 'CV: EV-AC - positive is under budget';
COMMENT ON COLUMN evm_reporting_periods.schedule_variance IS 'SV: EV-PV - positive is ahead of schedule';
