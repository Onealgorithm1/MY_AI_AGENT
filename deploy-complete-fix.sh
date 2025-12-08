#!/bin/bash

echo "==========================================="
echo "🚀 Complete SAM.gov & Dashboards Deployment"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "📍 Working directory: $SCRIPT_DIR"
echo ""

# ============================================
# STEP 1: PULL LATEST CHANGES
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1: Pulling Latest Changes${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
cd "$SCRIPT_DIR"
git fetch origin
git pull origin claude/fresh-main-data-01A7M74iL4tqSNQXUNuC7tJa
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Git pull failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Latest code pulled${NC}"
echo ""

# ============================================
# STEP 2: RESTART BACKEND
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2: Restarting Backend${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
cd "$SCRIPT_DIR/myaiagent-mvp/backend"
pm2 restart myaiagent-backend
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  PM2 restart failed, trying to start...${NC}"
  pm2 start ecosystem.config.js
fi
echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 3
echo ""

# ============================================
# STEP 3: BUILD & DEPLOY FRONTEND
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 3: Building & Deploying Frontend${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
cd "$SCRIPT_DIR/myaiagent-mvp/frontend"

echo "📦 Installing dependencies..."
npm install --silent
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ npm install failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo "🔨 Building frontend..."
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

echo "📤 Deploying to /var/www/myaiagent..."
sudo cp -r dist/* /var/www/myaiagent/
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Deployment failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

# ============================================
# STEP 4: VERIFY DEPLOYMENT
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 4: Verifying Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Check if Dashboards modal code is in deployed files
if grep -rq "showConnectedApps" /var/www/myaiagent/assets/*.js 2>/dev/null; then
  echo -e "${GREEN}✅ Dashboards modal code found in deployed files${NC}"
else
  echo -e "${RED}❌ Dashboards modal code NOT found${NC}"
fi

# Check if getCachedOpportunities is in deployed files
if grep -rq "getCachedOpportunities" /var/www/myaiagent/assets/*.js 2>/dev/null; then
  echo -e "${GREEN}✅ getCachedOpportunities function found${NC}"
else
  echo -e "${RED}❌ getCachedOpportunities function NOT found${NC}"
fi

# Count JS files
ASSET_COUNT=$(find /var/www/myaiagent/assets -name "*.js" 2>/dev/null | wc -l)
echo -e "${GREEN}✅ ${ASSET_COUNT} JavaScript files deployed${NC}"
echo ""

# ============================================
# STEP 5: TEST BACKEND API
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 5: Testing Backend API${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Test SAM.gov cached opportunities endpoint
echo "Testing /api/sam-gov/cached-opportunities..."
RESPONSE=$(curl -s http://localhost:5000/api/sam-gov/cached-opportunities?limit=10)
COUNT=$(echo $RESPONSE | jq -r '.opportunities | length' 2>/dev/null)

if [ "$COUNT" ] && [ "$COUNT" -gt 0 ]; then
  TOTAL=$(echo $RESPONSE | jq -r '.total' 2>/dev/null)
  echo -e "${GREEN}✅ Backend API working - returned ${COUNT} opportunities (Total: ${TOTAL})${NC}"
else
  echo -e "${YELLOW}⚠️  Backend API returned 0 or invalid response${NC}"
  echo "Response preview: $(echo $RESPONSE | head -c 200)..."
fi
echo ""

# ============================================
# STEP 6: CHECK DATABASE
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 6: Checking Database${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

DB_COUNT=$(sudo -u postgres psql myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache;" 2>/dev/null | xargs)
echo -e "Opportunities in database: ${GREEN}${DB_COUNT}${NC}"

ACTIVE_COUNT=$(sudo -u postgres psql myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache WHERE archive_date IS NULL OR archive_date > NOW();" 2>/dev/null | xargs)
echo -e "Active opportunities: ${GREEN}${ACTIVE_COUNT}${NC}"

INACTIVE_COUNT=$(sudo -u postgres psql myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache WHERE archive_date IS NOT NULL AND archive_date <= NOW();" 2>/dev/null | xargs)
echo -e "Inactive opportunities: ${YELLOW}${INACTIVE_COUNT}${NC}"
echo ""

# ============================================
# STEP 7: SETUP HOURLY REFRESH (OPTIONAL)
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 7: Hourly Refresh Setup (Optional)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

read -p "Do you want to set up hourly SAM.gov refresh? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cd "$SCRIPT_DIR"
  ./setup-hourly-refresh.sh
else
  echo -e "${YELLOW}⏭️  Skipping hourly refresh setup${NC}"
  echo "   You can run it later with: ./setup-hourly-refresh.sh"
fi
echo ""

# ============================================
# SUMMARY
# ============================================
echo "==========================================="
echo -e "${GREEN}✨ Deployment Complete!${NC}"
echo "==========================================="
echo ""
echo "📝 What Was Fixed:"
echo ""
echo "1️⃣  Frontend Service (samGov.js)"
echo "   ✅ Added missing getCachedOpportunities() function"
echo ""
echo "2️⃣  Backend Route (samGov.js)"
echo "   ✅ Removed duplicate /cached-opportunities route"
echo "   ✅ Removed userId filter (now shows ALL opportunities)"
echo "   ✅ Increased default limit to 1000"
echo ""
echo "3️⃣  SAM.gov Page (SAMGovPage.jsx)"
echo "   ✅ Changed default status filter from 'active' to '' (show all)"
echo ""
echo "4️⃣  Dashboards Sidebar"
echo "   ✅ Added 'Dashboards' button to AppLayout"
echo "   ✅ Created connected apps modal"
echo ""
echo "🧪 Testing Instructions:"
echo ""
echo "1. Clear browser cache: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "2. Go to: https://werkules.com"
echo "3. Login and navigate to SAM.gov page"
echo "4. You should see ALL ${DB_COUNT} opportunities now"
echo "5. Click 'Dashboards' button in sidebar (Grid icon)"
echo "6. Verify the connected apps modal appears"
echo ""
echo "📊 Current Stats:"
echo "   - Total opportunities: ${DB_COUNT}"
echo "   - Active: ${ACTIVE_COUNT}"
echo "   - Inactive: ${INACTIVE_COUNT}"
echo ""
echo "🔧 Troubleshooting:"
echo "   - View backend logs: pm2 logs myaiagent-backend"
echo "   - Test API manually: curl http://localhost:5000/api/sam-gov/cached-opportunities?limit=10"
echo "   - Check database: sudo -u postgres psql myaiagent -c 'SELECT COUNT(*) FROM samgov_opportunities_cache;'"
echo ""
echo "==========================================="
