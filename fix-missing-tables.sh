#!/bin/bash

# ===========================================
# FIX MISSING DATABASE TABLES
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 FIX MISSING DATABASE TABLES${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo "The diagnostic found these non-critical errors:"
echo "  - relation \"system_performance_metrics\" does not exist"
echo ""
echo "Adding missing tables..."
echo ""

# Create missing tables
sudo -u postgres psql -d myaiagent << 'EOFMIGRATION'
-- System Performance Metrics Table
CREATE TABLE IF NOT EXISTS system_performance_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metric_type VARCHAR(100) NOT NULL,
  metric_name VARCHAR(200) NOT NULL,
  metric_value NUMERIC(10,2),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON system_performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_type ON system_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON system_performance_metrics(metric_name);

-- Alert History Table (if needed)
CREATE TABLE IF NOT EXISTS alert_history (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  acknowledged BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_history_created ON alert_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_resolved ON alert_history(resolved) WHERE NOT resolved;

-- Verify tables were created
SELECT
  'system_performance_metrics' as table_name,
  COUNT(*) as row_count
FROM system_performance_metrics
UNION ALL
SELECT
  'alert_history' as table_name,
  COUNT(*) as row_count
FROM alert_history;

EOFMIGRATION

echo ""
echo -e "${GREEN}✅ Database tables created successfully!${NC}"
echo ""

# Restart backend to apply changes
echo "Restarting backend to clear errors..."
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
sudo -u ubuntu pm2 restart myaiagent-backend

sleep 3

echo ""
echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

echo -e "${BLUE}Checking for errors in logs...${NC}"
echo ""

# Check logs for the error
if sudo -u ubuntu pm2 logs myaiagent-backend --nostream --lines 20 | grep -q "system_performance_metrics"; then
    echo -e "${YELLOW}⚠️  Still seeing metrics errors - backend might need time to clear${NC}"
else
    echo -e "${GREEN}✅ No more system_performance_metrics errors!${NC}"
fi

echo ""
echo -e "${GREEN}✅ Missing tables fixed!${NC}"
echo ""
