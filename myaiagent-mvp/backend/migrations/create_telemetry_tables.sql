-- Telemetry errors table
CREATE TABLE IF NOT EXISTS telemetry_errors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  error_type VARCHAR(255) NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  component_stack TEXT,
  context JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_errors_user_id ON telemetry_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_errors_created_at ON telemetry_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_errors_type ON telemetry_errors(error_type);

-- Telemetry events table
CREATE TABLE IF NOT EXISTS telemetry_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  type VARCHAR(255) NOT NULL,
  data JSONB,
  context JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_id ON telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_timestamp ON telemetry_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_type ON telemetry_events(type);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_session_id ON telemetry_events(session_id);

-- Cleanup old telemetry data (7 days retention)
CREATE OR REPLACE FUNCTION cleanup_old_telemetry() RETURNS void AS $$
BEGIN
  DELETE FROM telemetry_errors WHERE created_at < NOW() - INTERVAL '7 days';
  DELETE FROM telemetry_events WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
