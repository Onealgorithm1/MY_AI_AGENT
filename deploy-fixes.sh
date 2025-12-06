#!/bin/bash

echo "========================================="
echo "🚀 Deploying SAM.gov & Dashboards Fixes"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}Step 1: Pulling latest changes from git...${NC}"
echo "---------------------------------------------"
cd "$SCRIPT_DIR"
git pull origin claude/fresh-main-data-01A7M74iL4tqSNQXUNuC7tJa
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Git pull failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Git pull successful${NC}"
echo ""

echo -e "${BLUE}Step 2: Installing frontend dependencies...${NC}"
echo "---------------------------------------------"
cd "$SCRIPT_DIR/myaiagent-mvp/frontend"
npm install
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ npm install failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${BLUE}Step 3: Building frontend...${NC}"
echo "---------------------------------------------"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

echo -e "${BLUE}Step 4: Deploying to /var/www/myaiagent...${NC}"
echo "---------------------------------------------"
sudo cp -r dist/* /var/www/myaiagent/
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Deployment failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

echo -e "${BLUE}Step 5: Verifying deployment...${NC}"
echo "---------------------------------------------"

# Check if the new code is in the deployed files
if grep -q "showConnectedApps" /var/www/myaiagent/assets/*.js 2>/dev/null; then
  echo -e "${GREEN}✅ Dashboards modal code found in deployed files${NC}"
else
  echo -e "${YELLOW}⚠️  Warning: Dashboards modal code not found in deployed files${NC}"
fi

# Count JS files
ASSET_COUNT=$(find /var/www/myaiagent/assets -name "*.js" 2>/dev/null | wc -l)
echo -e "${GREEN}✅ ${ASSET_COUNT} JavaScript files deployed${NC}"
echo ""

echo -e "${BLUE}Step 6: Testing backend API...${NC}"
echo "---------------------------------------------"
RESPONSE=$(curl -s http://localhost:5000/api/samgov/cache?limit=10)
COUNT=$(echo $RESPONSE | jq -r '.opportunities | length' 2>/dev/null)
if [ "$COUNT" ]; then
  echo -e "${GREEN}✅ Backend API working - returned ${COUNT} opportunities${NC}"
else
  echo -e "${YELLOW}⚠️  Backend API response: $RESPONSE${NC}"
fi
echo ""

echo "========================================="
echo -e "${GREEN}✨ Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "📝 What was fixed:"
echo ""
echo "1️⃣ SAM.gov Opportunities Display:"
echo "   - Changed default filter from 'active only' to 'show all'"
echo "   - Now displays ALL opportunities (active + inactive)"
echo "   - Users can still filter by status manually if needed"
echo ""
echo "2️⃣ Dashboards Sidebar Button:"
echo "   - Added 'Dashboards' button to sidebar navigation"
echo "   - Click it to see connected apps modal with:"
echo "     • SAM.gov - Federal contract opportunities"
echo "     • Company Profile - OneAlgorithm capabilities"
echo "     • Opportunity Matches - AI-matched opportunities"
echo ""
echo "🧪 Testing Instructions:"
echo "   1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   2. Go to https://werkules.com"
echo "   3. Click on SAM.gov - you should see ALL opportunities now"
echo "   4. Look for 'Dashboards' button in sidebar (Grid icon)"
echo "   5. Click Dashboards to see the connected apps modal"
echo ""
echo "========================================="
