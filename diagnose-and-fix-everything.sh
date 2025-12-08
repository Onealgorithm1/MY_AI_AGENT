#!/bin/bash

# ===========================================
# COMPREHENSIVE SAM.GOV FIX - DIAGNOSE & FIX EVERYTHING
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔍 COMPREHENSIVE SAM.GOV DIAGNOSTIC${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# ==========================================
# 1. CHECK DATABASE
# ==========================================
echo -e "${BOLD}STEP 1: Checking Database${NC}"
echo ""

echo "Database table structure:"
sudo -u postgres psql -d myaiagent -c "\d samgov_opportunities_cache" | head -30

echo ""
echo "Row count:"
ROW_COUNT=$(sudo -u postgres psql -d myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache;" | tr -d ' ')
echo "Total rows: $ROW_COUNT"

if [ "$ROW_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ DATABASE IS EMPTY!${NC}"
    echo "This is the problem - no data to show"
else
    echo -e "${GREEN}✅ Database has $ROW_COUNT rows${NC}"
fi

# ==========================================
# 2. CHECK BACKEND CODE
# ==========================================
echo ""
echo -e "${BOLD}STEP 2: Checking Backend Code${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

echo "Checking samGovCache.js for column references:"
echo ""

if grep -n "last_updated_at\|last_seen_at" src/services/samGovCache.js | head -5; then
    echo ""

    # Check which column is being used
    if grep -q "last_updated_at" src/services/samGovCache.js; then
        echo -e "${RED}❌ Code uses: last_updated_at (DOESN'T EXIST IN DB)${NC}"
        NEEDS_FIX=true
    elif grep -q "last_seen_at" src/services/samGovCache.js; then
        echo -e "${GREEN}✅ Code uses: last_seen_at (EXISTS IN DB)${NC}"
        NEEDS_FIX=false
    fi
else
    echo "No timestamp column references found"
    NEEDS_FIX=true
fi

# ==========================================
# 3. FIX BACKEND CODE IF NEEDED
# ==========================================
if [ "$NEEDS_FIX" = true ]; then
    echo ""
    echo -e "${BOLD}STEP 3: Fixing Backend Code${NC}"
    echo ""

    # Backup
    cp src/services/samGovCache.js src/services/samGovCache.js.backup.$(date +%s)

    # Fix all references to use last_seen_at
    sed -i 's/last_updated_at/last_seen_at/g' src/services/samGovCache.js

    echo -e "${GREEN}✅ Fixed column references to use 'last_seen_at'${NC}"
else
    echo ""
    echo -e "${GREEN}STEP 3: Backend code already correct${NC}"
fi

# ==========================================
# 4. CHECK ROUTES
# ==========================================
echo ""
echo -e "${BOLD}STEP 4: Checking Routes${NC}"
echo ""

# Count how many times /cached-opportunities is defined
ROUTE_COUNT=$(grep -c "router.get('/cached-opportunities'" src/routes/samGov.js || echo "0")

if [ "$ROUTE_COUNT" -gt 1 ]; then
    echo -e "${RED}❌ Found $ROUTE_COUNT duplicate /cached-opportunities routes${NC}"
    echo "Removing duplicates..."

    # Remove lines 102-115 if they exist (first occurrence)
    if sed -n '102,115p' src/routes/samGov.js | grep -q "cached-opportunities"; then
        sed -i '102,115d' src/routes/samGov.js
        echo -e "${GREEN}✅ Removed duplicate route${NC}"
    fi
else
    echo -e "${GREEN}✅ No duplicate routes${NC}"
fi

# ==========================================
# 5. RESTART BACKEND
# ==========================================
echo ""
echo -e "${BOLD}STEP 5: Restarting Backend${NC}"
echo ""

sudo -u ubuntu pm2 restart myaiagent-backend
sleep 5

echo -e "${GREEN}✅ Backend restarted${NC}"

# ==========================================
# 6. TEST API DIRECTLY
# ==========================================
echo ""
echo -e "${BOLD}STEP 6: Testing API Endpoint${NC}"
echo ""

sleep 3

# Create Node.js test script
cat > test-api-direct.js << 'EOFTEST'
import { getCachedOpportunities } from './src/services/samGovCache.js';

async function test() {
  try {
    console.log('Testing getCachedOpportunities service function...\n');

    const result = await getCachedOpportunities({ limit: 5, offset: 0 });

    console.log('Result:');
    console.log(`  Total: ${result.total}`);
    console.log(`  Returned: ${result.opportunities ? result.opportunities.length : 0}`);
    console.log('');

    if (result.opportunities && result.opportunities.length > 0) {
      console.log('✅ Service function works!');
      console.log('');
      console.log('Sample opportunity:');
      const opp = result.opportunities[0];
      console.log(`  Notice ID: ${opp.notice_id}`);
      console.log(`  Title: ${opp.title}`);
      console.log(`  Posted: ${opp.posted_date}`);
    } else {
      console.log('❌ Service returned 0 opportunities');
    }

    process.exit(result.opportunities && result.opportunities.length > 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
EOFTEST

echo "Running direct service test..."
node test-api-direct.js
SERVICE_TEST=$?
rm -f test-api-direct.js

if [ $SERVICE_TEST -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Backend service works correctly${NC}"
else
    echo ""
    echo -e "${RED}❌ Backend service has issues${NC}"
    echo "Checking backend logs:"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 20 --nostream
fi

# ==========================================
# 7. TEST VIA HTTP
# ==========================================
echo ""
echo -e "${BOLD}STEP 7: Testing via HTTP${NC}"
echo ""

rm -f /tmp/test-samgov-http.txt

# Get CSRF and login
CSRF=$(curl -s -c /tmp/test-samgov-http.txt https://werkules.com/api/csrf-token | jq -r '.csrfToken' 2>/dev/null)

if [ -n "$CSRF" ] && [ "$CSRF" != "null" ]; then
    LOGIN=$(curl -s -X POST https://werkules.com/api/auth/login \
      -H "Content-Type: application/json" \
      -H "X-CSRF-Token: $CSRF" \
      -H "Origin: https://werkules.com" \
      -b /tmp/test-samgov-http.txt \
      -c /tmp/test-samgov-http.txt \
      -d '{"email":"admin@myaiagent.com","password":"admin123"}')

    if echo "$LOGIN" | jq -e '.user' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Logged in${NC}"

        # Test endpoint
        echo ""
        echo "Testing: GET /api/sam-gov/cached-opportunities?limit=5"

        RESPONSE=$(curl -s -w "\n%{http_code}" "https://werkules.com/api/sam-gov/cached-opportunities?limit=5" \
          -H "Origin: https://werkules.com" \
          -b /tmp/test-samgov-http.txt)

        HTTP_CODE=$(echo "$RESPONSE" | tail -1)
        BODY=$(echo "$RESPONSE" | head -n -1)

        echo "HTTP Status: $HTTP_CODE"

        if [ "$HTTP_CODE" == "200" ]; then
            if echo "$BODY" | jq -e '.opportunities' > /dev/null 2>&1; then
                COUNT=$(echo "$BODY" | jq '.opportunities | length')
                TOTAL=$(echo "$BODY" | jq '.total // 0')

                echo -e "${GREEN}✅ API returns data!${NC}"
                echo "  Total in DB: $TOTAL"
                echo "  Returned: $COUNT"

                if [ "$COUNT" -gt 0 ]; then
                    echo ""
                    echo "Sample:"
                    echo "$BODY" | jq '.opportunities[0] | {notice_id, title}'
                fi
            else
                echo -e "${RED}❌ Response doesn't have 'opportunities' field${NC}"
                echo "$BODY" | jq '.'
            fi
        else
            echo -e "${RED}❌ API returned HTTP $HTTP_CODE${NC}"
            echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        fi
    else
        echo -e "${RED}❌ Login failed${NC}"
    fi
else
    echo -e "${RED}❌ Failed to get CSRF token${NC}"
fi

rm -f /tmp/test-samgov-http.txt

# ==========================================
# 8. CHECK FRONTEND
# ==========================================
echo ""
echo -e "${BOLD}STEP 8: Frontend Check${NC}"
echo ""

echo "Checking if frontend is configured correctly..."
if grep -r "getCachedOpportunities" ../frontend/src/pages/SAMGovPage.jsx 2>/dev/null; then
    echo -e "${GREEN}✅ Frontend calls getCachedOpportunities${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify frontend code${NC}"
fi

# ==========================================
# SUMMARY
# ==========================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}📊 DIAGNOSTIC COMPLETE${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${BOLD}Summary:${NC}"
echo "  Database rows: $ROW_COUNT"
echo "  Backend service: $([ $SERVICE_TEST -eq 0 ] && echo '✅ Working' || echo '❌ Failed')"
echo "  HTTP endpoint: $([ "$HTTP_CODE" == "200" ] && echo '✅ Working' || echo '❌ Failed')"
echo ""

if [ "$ROW_COUNT" -gt 0 ] && [ $SERVICE_TEST -eq 0 ] && [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅✅✅ EVERYTHING IS WORKING!${NC}"
    echo ""
    echo "If you still don't see opportunities in browser:"
    echo "1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
    echo "2. Clear browser cache and cookies"
    echo "3. Open DevTools (F12) → Console"
    echo "4. Look for: GET /api/sam-gov/cached-opportunities"
    echo "5. Check the response"
    echo ""
else
    echo -e "${RED}❌ ISSUES FOUND${NC}"
    echo ""
    if [ "$ROW_COUNT" -eq 0 ]; then
        echo "• Database is empty - run: sudo ./fix-samgov-opportunities.sh"
    fi
    if [ $SERVICE_TEST -ne 0 ]; then
        echo "• Backend service failing - check logs above"
    fi
    if [ "$HTTP_CODE" != "200" ]; then
        echo "• HTTP endpoint failing - check response above"
    fi
fi

echo ""
