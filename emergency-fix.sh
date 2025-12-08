#!/bin/bash

echo "==========================================="
echo "🔧 Emergency Fix - Backend & UI Issues"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ============================================
# FIX 1: START BACKEND PROPERLY
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Fix 1: Starting Backend Properly${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

cd "$SCRIPT_DIR/myaiagent-mvp/backend"

# Check if backend is running
PM2_STATUS=$(pm2 list | grep myaiagent-backend || echo "")

if [ -z "$PM2_STATUS" ]; then
  echo "Backend not found in PM2. Starting it..."
  pm2 start src/server.js --name myaiagent-backend
else
  echo "Restarting existing backend..."
  pm2 restart myaiagent-backend
fi

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend is actually running
if pm2 list | grep -q "myaiagent-backend.*online"; then
  echo -e "${GREEN}✅ Backend is running${NC}"
else
  echo -e "${RED}❌ Backend failed to start. Checking logs...${NC}"
  pm2 logs myaiagent-backend --lines 20
  exit 1
fi

echo ""

# ============================================
# FIX 2: VERIFY DATABASE CONNECTION
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Fix 2: Verifying Database${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

DB_COUNT=$(sudo -u postgres psql myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache;" 2>/dev/null | xargs)
echo "Total opportunities in database: $DB_COUNT"

if [ "$DB_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Database has $DB_COUNT opportunities${NC}"
else
  echo -e "${RED}❌ Database has no opportunities${NC}"
  exit 1
fi

echo ""

# ============================================
# FIX 3: TEST BACKEND API (with auth bypass for testing)
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Fix 3: Testing Backend API${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Test if backend is responding
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ] || [ "$HEALTH_CHECK" = "404" ]; then
  echo -e "${GREEN}✅ Backend is responding (HTTP $HEALTH_CHECK)${NC}"
else
  echo -e "${YELLOW}⚠️  Backend may not be fully ready (HTTP $HEALTH_CHECK)${NC}"
fi

echo ""

# ============================================
# FIX 4: CLEAR BROWSER CACHE & SESSION
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Fix 4: Browser Cache Instructions${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

echo -e "${YELLOW}IMPORTANT: The '2 opportunities' issue is likely due to:${NC}"
echo "1. Browser cache - old JavaScript files"
echo "2. Session storage - saved filters from previous session"
echo ""
echo -e "${GREEN}To fix, do the following IN YOUR BROWSER:${NC}"
echo ""
echo "1. Open Developer Console (F12 or Right-click > Inspect)"
echo "2. Go to 'Application' or 'Storage' tab"
echo "3. Click 'Clear site data' or clear:"
echo "   - Local Storage"
echo "   - Session Storage  "
echo "   - Cache Storage"
echo "4. Then do a hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "5. If still showing 2, try incognito/private window"
echo ""
echo "This will reset all filters and force load new code."
echo ""

# ============================================
# FIX 5: VERIFY DEPLOYED FILES
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Fix 5: Verifying Deployed Files${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Check if getCachedOpportunities is in deployed files
if grep -rq "getCachedOpportunities" /var/www/myaiagent/assets/*.js 2>/dev/null; then
  echo -e "${GREEN}✅ getCachedOpportunities function found in deployed files${NC}"
else
  echo -e "${RED}❌ getCachedOpportunities NOT found - frontend may need rebuild${NC}"
fi

# Check SAMGovPage
if grep -rq "SAMGovPage" /var/www/myaiagent/assets/*.js 2>/dev/null; then
  echo -e "${GREEN}✅ SAMGovPage found in deployed files${NC}"
else
  echo -e "${YELLOW}⚠️  SAMGovPage not found in grep${NC}"
fi

# Check for the status filter default
if grep -rq "status.*active" /var/www/myaiagent/assets/*.js 2>/dev/null; then
  echo -e "${YELLOW}⚠️  Found 'status: active' in deployed files - may be old build${NC}"
else
  echo -e "${GREEN}✅ No 'status: active' found - using latest code${NC}"
fi

echo ""

# ============================================
# FIX 6: CHECK PM2 STATUS
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Fix 6: PM2 Status${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

pm2 list

echo ""

# ============================================
# FIX 7: BACKEND LOGS CHECK
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Fix 7: Recent Backend Logs${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

echo "Last 10 lines of backend logs:"
pm2 logs myaiagent-backend --lines 10 --nostream

echo ""

# ============================================
# SUMMARY
# ============================================
echo "==========================================="
echo -e "${GREEN}✨ Emergency Fix Complete!${NC}"
echo "==========================================="
echo ""
echo "📊 Status Summary:"
echo "  - Backend: $(pm2 list | grep myaiagent-backend | grep -o 'online\|stopped\|errored' || echo 'unknown')"
echo "  - Database: $DB_COUNT opportunities"
echo "  - API Health: HTTP $HEALTH_CHECK"
echo ""
echo "🔧 Next Steps to Fix '2 Opportunities' Issue:"
echo ""
echo "Option 1 (RECOMMENDED) - Clear browser completely:"
echo "  1. Open https://werkules.com"
echo "  2. Press F12 to open DevTools"
echo "  3. Go to Application tab > Clear site data"
echo "  4. Hard refresh: Ctrl+Shift+R"
echo ""
echo "Option 2 - Try incognito/private window:"
echo "  1. Open new incognito window"
echo "  2. Go to https://werkules.com"
echo "  3. Login and check SAM.gov page"
echo ""
echo "Option 3 - Manual filter reset on SAM.gov page:"
echo "  1. Click 'Reset' button to clear all filters"
echo "  2. Change 'Status' dropdown from 'active' to 'all'"
echo "  3. Refresh the page"
echo ""
echo "🐛 Debugging:"
echo "  - Backend logs: pm2 logs myaiagent-backend"
echo "  - Backend status: pm2 status"
echo "  - Restart backend: pm2 restart myaiagent-backend"
echo ""
echo "==========================================="
