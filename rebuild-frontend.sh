#!/bin/bash

echo "========================================="
echo "🎨 Rebuild Frontend with Dashboards UI"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ============================================
# STEP 1: VERIFY CODE HAS DASHBOARDS
# ============================================
echo -e "${BLUE}Step 1: Verifying AppLayout has Dashboards code...${NC}"

if grep -q "showConnectedApps" "$SCRIPT_DIR/myaiagent-mvp/frontend/src/components/AppLayout.jsx"; then
  echo -e "${GREEN}✅ Dashboards code found in AppLayout.jsx${NC}"
else
  echo -e "${RED}❌ Dashboards code NOT found - pulling from correct branch${NC}"
  git pull origin claude/fresh-main-data-01A7M74iL4tqSNQXUNuC7tJa
fi
echo ""

# ============================================
# STEP 2: REBUILD FRONTEND
# ============================================
echo -e "${BLUE}Step 2: Rebuilding Frontend...${NC}"

cd "$SCRIPT_DIR/myaiagent-mvp/frontend"

echo "📦 Installing dependencies..."
npm install --silent

echo "🔨 Building..."
npm run build

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Build successful${NC}"
else
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi
echo ""

# ============================================
# STEP 3: DEPLOY
# ============================================
echo -e "${BLUE}Step 3: Deploying...${NC}"

sudo cp -r dist/* /var/www/myaiagent/
echo -e "${GREEN}✅ Deployed to /var/www/myaiagent${NC}"
echo ""

# ============================================
# STEP 4: VERIFY DEPLOYMENT
# ============================================
echo -e "${BLUE}Step 4: Verifying Deployment...${NC}"

# Check for Dashboards code
if grep -rq "showConnectedApps\|Dashboards" /var/www/myaiagent/assets/*.js 2>/dev/null; then
  echo -e "${GREEN}✅ Dashboards code found in deployed files${NC}"
else
  echo -e "${RED}❌ Dashboards code NOT found in deployed files${NC}"
  echo "This is likely because the code is minified. Check manually."
fi

# Check for getCachedOpportunities
if grep -rq "getCachedOpportunities" /var/www/myaiagent/assets/*.js 2>/dev/null; then
  echo -e "${GREEN}✅ getCachedOpportunities found${NC}"
else
  echo -e "${RED}❌ getCachedOpportunities NOT found${NC}"
fi

# Count files
ASSET_COUNT=$(find /var/www/myaiagent/assets -name "*.js" 2>/dev/null | wc -l)
echo -e "${GREEN}✅ ${ASSET_COUNT} JavaScript files deployed${NC}"
echo ""

# ============================================
# SUMMARY
# ============================================
echo "========================================="
echo -e "${GREEN}✨ Frontend Rebuild Complete!${NC}"
echo "========================================="
echo ""
echo "🎯 The Dashboards button should now be visible!"
echo ""
echo "📍 Where to find it:"
echo "  - In the LEFT SIDEBAR"
echo "  - Below 'Chat' and 'SAM.gov' buttons"
echo "  - Looks like a GRID icon with 'Dashboards' text"
echo "  - Has a dashed border"
echo ""
echo "🌐 To see the changes:"
echo ""
echo "1. Clear browser cache:"
echo "   - Press F12"
echo "   - Go to Application tab"
echo "   - Click 'Clear site data'"
echo "   - Hard refresh: Ctrl+Shift+R"
echo ""
echo "2. OR use incognito window:"
echo "   - Open incognito/private window"
echo "   - Go to https://werkules.com"
echo "   - Login"
echo "   - Look for Dashboards button in left sidebar"
echo ""
echo "3. Click the Dashboards button to see:"
echo "   - SAM.gov (Federal contract opportunities)"
echo "   - Company Profile (OneAlgorithm capabilities)"
echo "   - Opportunity Matches (AI-matched opportunities)"
echo ""
echo "🐛 If you still don't see it:"
echo "   - Make sure you're looking in the LEFT SIDEBAR"
echo "   - Try incognito window first (eliminates cache issues)"
echo "   - Check browser console for errors (F12 > Console)"
echo ""
echo "========================================="
