#!/bin/bash

# ===========================================
# DIAGNOSE SAM.GOV OPPORTUNITIES ISSUE
# ===========================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔍 SAM.GOV OPPORTUNITIES DIAGNOSTIC${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# ==========================================
# 1. CHECK DATABASE
# ==========================================
echo -e "${BLUE}STEP 1: Checking Database Tables...${NC}"
echo ""

echo "Checking if samgov_opportunities_cache table exists:"
TABLE_EXISTS=$(sudo -u postgres psql -d myaiagent -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'samgov_opportunities_cache');" | tr -d ' ')

if [ "$TABLE_EXISTS" == "t" ]; then
    echo -e "${GREEN}✅ Table exists${NC}"

    echo ""
    echo "Row count in samgov_opportunities_cache:"
    COUNT=$(sudo -u postgres psql -d myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache;" | tr -d ' ')
    echo "  Total: $COUNT rows"

    if [ "$COUNT" -gt 0 ]; then
        echo ""
        echo "Sample data:"
        sudo -u postgres psql -d myaiagent -c "SELECT id, notice_id, title, posting_date FROM samgov_opportunities_cache LIMIT 5;"
    else
        echo -e "${YELLOW}⚠️  Table is empty - no opportunities cached yet${NC}"
    fi
else
    echo -e "${RED}❌ Table does NOT exist${NC}"
fi

# ==========================================
# 2. CHECK SAM.GOV API KEY
# ==========================================
echo ""
echo -e "${BLUE}STEP 2: Checking SAM.gov API Key...${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Create test script
cat > test-samgov-key.js << 'EOFJS'
import { getApiKey } from './src/utils/apiKeys.js';

async function test() {
  try {
    const key = await getApiKey('samgov');
    if (key) {
      console.log(`✅ SAM.gov API key found: ${key.substring(0, 20)}... (length: ${key.length})`);
    } else {
      console.log('❌ SAM.gov API key NOT found');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  process.exit(0);
}

test();
EOFJS

node test-samgov-key.js
rm -f test-samgov-key.js

# ==========================================
# 3. TEST ENDPOINTS
# ==========================================
echo ""
echo -e "${BLUE}STEP 3: Testing SAM.gov API Endpoints...${NC}"
echo ""

# Get JWT token by logging in
echo "Getting authentication token..."
rm -f /tmp/samgov-test.txt

CSRF_TOKEN=$(curl -s -c /tmp/samgov-test.txt https://werkules.com/api/csrf-token | jq -r '.csrfToken' 2>/dev/null)

if [ -z "$CSRF_TOKEN" ]; then
    echo -e "${RED}❌ Failed to get CSRF token${NC}"
    exit 1
fi

LOGIN_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/samgov-test.txt \
  -c /tmp/samgov-test.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if ! echo "$LOGIN_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${RED}❌ Login failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Logged in${NC}"

# Test cached opportunities endpoint
echo ""
echo "Testing GET /api/sam-gov/cached-opportunities..."
CACHED_RESPONSE=$(curl -s -w "\n%{http_code}" https://werkules.com/api/sam-gov/cached-opportunities \
  -H "Origin: https://werkules.com" \
  -b /tmp/samgov-test.txt)

CACHED_HTTP=$(echo "$CACHED_RESPONSE" | tail -1)
CACHED_BODY=$(echo "$CACHED_RESPONSE" | head -n -1)

if [ "$CACHED_HTTP" == "200" ]; then
    echo -e "${GREEN}✅ Endpoint working (HTTP 200)${NC}"

    # Check if it returns opportunities
    OPP_COUNT=$(echo "$CACHED_BODY" | jq '.opportunities | length // 0' 2>/dev/null || echo "0")
    echo "Opportunities returned: $OPP_COUNT"

    if [ "$OPP_COUNT" -gt 0 ]; then
        echo ""
        echo "Sample opportunity:"
        echo "$CACHED_BODY" | jq '.opportunities[0] | {notice_id, title, posting_date}' 2>/dev/null || echo "Could not parse"
    else
        echo -e "${YELLOW}⚠️  No opportunities returned${NC}"
    fi

    # Show full response structure
    echo ""
    echo "Response structure:"
    echo "$CACHED_BODY" | jq 'keys' 2>/dev/null || echo "$CACHED_BODY"
else
    echo -e "${RED}❌ Endpoint failed: HTTP $CACHED_HTTP${NC}"
    echo "Response:"
    echo "$CACHED_BODY" | jq '.' 2>/dev/null || echo "$CACHED_BODY"
fi

# Test search endpoint
echo ""
echo "Testing POST /api/sam-gov/search/opportunities..."

# Get fresh CSRF token
CSRF_TOKEN2=$(curl -s https://werkules.com/api/csrf-token -b /tmp/samgov-test.txt | jq -r '.csrfToken')

SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://werkules.com/api/sam-gov/search/opportunities \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN2" \
  -H "Origin: https://werkules.com" \
  -b /tmp/samgov-test.txt \
  -d '{"keyword":"software","limit":5}')

SEARCH_HTTP=$(echo "$SEARCH_RESPONSE" | tail -1)
SEARCH_BODY=$(echo "$SEARCH_RESPONSE" | head -n -1)

if [ "$SEARCH_HTTP" == "200" ]; then
    echo -e "${GREEN}✅ Search endpoint working (HTTP 200)${NC}"

    SEARCH_COUNT=$(echo "$SEARCH_BODY" | jq '.opportunities | length // 0' 2>/dev/null || echo "0")
    echo "Search results: $SEARCH_COUNT opportunities"

    if [ "$SEARCH_COUNT" -gt 0 ]; then
        echo ""
        echo "Sample search result:"
        echo "$SEARCH_BODY" | jq '.opportunities[0] | {noticeId, title, postedDate}' 2>/dev/null
    fi
else
    echo -e "${RED}❌ Search endpoint failed: HTTP $SEARCH_HTTP${NC}"
    echo "Response:"
    echo "$SEARCH_BODY" | jq '.' 2>/dev/null || echo "$SEARCH_BODY"
fi

# ==========================================
# 4. CHECK BACKEND LOGS
# ==========================================
echo ""
echo -e "${BLUE}STEP 4: Checking Backend Logs for SAM.gov Errors...${NC}"
echo ""

if sudo -u ubuntu pm2 logs myaiagent-backend --nostream --lines 50 | grep -i "sam\|opportunit" | tail -10; then
    echo ""
else
    echo "No SAM.gov related errors in recent logs"
fi

# ==========================================
# SUMMARY
# ==========================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}📊 DIAGNOSTIC SUMMARY${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

rm -f /tmp/samgov-test.txt

echo "Issues to check:"
echo "1. Database: Is samgov_opportunities_cache table populated?"
echo "2. API Key: Is SAM.gov API key configured?"
echo "3. Endpoints: Are cached-opportunities and search working?"
echo "4. Frontend: Is the UI calling the correct endpoint?"
echo ""

echo "Next steps based on results above:"
echo "• If table is empty → Need to fetch initial data"
echo "• If endpoints return 404/500 → Backend route issue"
echo "• If endpoints return empty → Database is empty"
echo "• If API key missing → Add at https://werkules.com/admin/secrets"
echo ""
