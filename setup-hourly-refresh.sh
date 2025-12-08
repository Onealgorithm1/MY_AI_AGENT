#!/bin/bash

echo "========================================="
echo "⏰ Setting Up SAM.gov Hourly Refresh"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/myaiagent-mvp/backend"

echo -e "${BLUE}Step 1: Making refresh script executable...${NC}"
chmod +x "$BACKEND_DIR/refresh-samgov-opportunities.js"
echo -e "${GREEN}✅ Script is executable${NC}"
echo ""

echo -e "${BLUE}Step 2: Testing refresh script...${NC}"
echo "Running a test refresh to ensure everything works..."
echo ""
cd "$BACKEND_DIR"
node refresh-samgov-opportunities.js
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Test refresh failed! Please fix errors before setting up cron.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Test refresh successful${NC}"
echo ""

echo -e "${BLUE}Step 3: Setting up cron job...${NC}"
echo ""

# Create cron job entry
CRON_JOB="0 * * * * cd $BACKEND_DIR && /usr/bin/node refresh-samgov-opportunities.js >> $SCRIPT_DIR/logs/samgov-refresh.log 2>&1"

# Create logs directory
mkdir -p "$SCRIPT_DIR/logs"
echo -e "${GREEN}✅ Created logs directory${NC}"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "refresh-samgov-opportunities.js"; then
  echo -e "${YELLOW}⚠️  Cron job already exists. Removing old entry...${NC}"
  crontab -l 2>/dev/null | grep -v "refresh-samgov-opportunities.js" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo -e "${GREEN}✅ Cron job added successfully${NC}"
echo ""

echo -e "${BLUE}Step 4: Verifying cron job...${NC}"
echo ""
echo "Current cron jobs:"
crontab -l | grep "refresh-samgov-opportunities.js"
echo ""

echo "========================================="
echo -e "${GREEN}✨ Setup Complete!${NC}"
echo "========================================="
echo ""
echo "📋 Summary:"
echo "  - Refresh script: $BACKEND_DIR/refresh-samgov-opportunities.js"
echo "  - Cron schedule: Every hour (at minute 0)"
echo "  - Log file: $SCRIPT_DIR/logs/samgov-refresh.log"
echo ""
echo "🧪 Manual Testing:"
echo "  Run manually: cd $BACKEND_DIR && node refresh-samgov-opportunities.js"
echo "  View logs: tail -f $SCRIPT_DIR/logs/samgov-refresh.log"
echo "  View cron jobs: crontab -l"
echo ""
echo "🔧 Troubleshooting:"
echo "  Remove cron job: crontab -l | grep -v 'refresh-samgov-opportunities.js' | crontab -"
echo "  Check cron logs: grep CRON /var/log/syslog | tail -20"
echo ""
echo "========================================="
