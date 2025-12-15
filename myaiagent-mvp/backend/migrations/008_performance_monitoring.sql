-- Real-time Performance Monitoring & Anomaly Detection System
-- This enables the AI companion to monitor its own performance and self-diagnose issues

-- Table: System Performance Metrics (Time-Series Data)
CREATE TABLE IF NOT EXISTS system_performance_metrics (
  id SERIAL PRIMARY KEY,
  
  -- Time-series core fields
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metric_name VARCHAR(100) NOT NULL,
  value NUMERIC NOT NULL,
  unit VARCHAR(20) NOT NULL,
  
  -- Dimensional tags for filtering/grouping (stored as JSONB for flexibility)
  -- Examples: {"route": "/api/messages", "api": "gemini", "model": "flash", "status": "500"}
  tags JSONB DEFAULT '{}'::jsonb,
  
  -- Optional context for debugging
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes optimized for time-series queries
CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON system_performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON system_performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_name_timestamp ON system_performance_metrics(metric_name, timestamp DESC);

-- GIN index for JSONB tag queries (e.g., finding all metrics for a specific route)
CREATE INDEX IF NOT EXISTS idx_perf_metrics_tags ON system_performance_metrics USING GIN (tags);

-- Table: Performance Anomalies (Detected Issues)
CREATE TABLE IF NOT EXISTS performance_anomalies (
  id SERIAL PRIMARY KEY,
  
  -- Anomaly identification
  metric_name VARCHAR(100) NOT NULL,
  anomaly_type VARCHAR(50) CHECK (anomaly_type IN ('spike', 'drop', 'threshold_breach', 'pattern_change')),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  
  -- Detection details
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  baseline_value NUMERIC,
  anomaly_value NUMERIC,
  deviation_percentage NUMERIC,
  
  -- Context
  description TEXT NOT NULL,
  tags JSONB DEFAULT '{}'::jsonb,
  
  -- Resolution tracking
  status VARCHAR(50) CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_positive')) DEFAULT 'active',
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON performance_anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_metric ON performance_anomalies(metric_name);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON performance_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON performance_anomalies(status);

-- Table: Performance Baselines (For Anomaly Detection)
CREATE TABLE IF NOT EXISTS performance_baselines (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL UNIQUE,
  
  -- Statistical baselines
  avg_value NUMERIC NOT NULL,
  p50_value NUMERIC NOT NULL,
  p95_value NUMERIC NOT NULL,
  p99_value NUMERIC NOT NULL,
  min_value NUMERIC NOT NULL,
  max_value NUMERIC NOT NULL,
  std_deviation NUMERIC NOT NULL,
  
  -- Baseline metadata
  sample_size INTEGER NOT NULL,
  calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  
  -- Context
  tags JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_baselines_metric ON performance_baselines(metric_name);
CREATE INDEX IF NOT EXISTS idx_baselines_calculated ON performance_baselines(calculated_at DESC);

-- Add helpful comments
COMMENT ON TABLE system_performance_metrics IS 'Time-series storage for all system performance metrics (API latency, error rates, resource usage)';
COMMENT ON TABLE performance_anomalies IS 'Detected anomalies and performance issues for AI self-diagnosis';
COMMENT ON TABLE performance_baselines IS 'Statistical baselines for anomaly detection algorithms';

COMMENT ON COLUMN system_performance_metrics.metric_name IS 'Examples: api_latency, external_api_error_rate, cpu_usage, memory_usage, db_query_time';
COMMENT ON COLUMN system_performance_metrics.tags IS 'Dimensional data for filtering, e.g., {"route":"/api/messages","status":"200"}';
