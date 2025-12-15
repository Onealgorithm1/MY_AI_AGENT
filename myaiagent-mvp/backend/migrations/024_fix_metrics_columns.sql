-- Fix missing columns in system_performance_metrics table
-- This ensures the table has all required columns for monitoring

-- Add value column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'value'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN value NUMERIC;
    RAISE NOTICE 'Added value column to system_performance_metrics';
  ELSE
    RAISE NOTICE 'Column value already exists in system_performance_metrics';
  END IF;
END $$;

-- Add unit column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'unit'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN unit VARCHAR(20);
    RAISE NOTICE 'Added unit column to system_performance_metrics';
  ELSE
    RAISE NOTICE 'Column unit already exists in system_performance_metrics';
  END IF;
END $$;

-- Add metadata column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_performance_metrics' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE system_performance_metrics ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added metadata column to system_performance_metrics';
  ELSE
    RAISE NOTICE 'Column metadata already exists in system_performance_metrics';
  END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON system_performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON system_performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_name_timestamp ON system_performance_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_tags ON system_performance_metrics USING GIN (tags);
