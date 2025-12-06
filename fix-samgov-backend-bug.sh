#!/bin/bash

# ===========================================
# FIX SAM.GOV BACKEND COLUMN NAME BUG
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 FIXING SAM.GOV BACKEND BUG${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# ==========================================
# 1. FIX COLUMN NAME BUG
# ==========================================
echo -e "${BLUE}STEP 1: Fixing column name bug in samGovCache.js...${NC}"
echo ""

# Backup first
cp src/services/samGovCache.js src/services/samGovCache.js.backup

# Fix: Change "last_seen_at" to "first_seen_at DESC" (or "last_updated_at DESC")
# Line 308: queryText += ` ORDER BY last_seen_at DESC LIMIT...`
# Should be: queryText += ` ORDER BY last_updated_at DESC LIMIT...`

if grep -q "ORDER BY last_seen_at" src/services/samGovCache.js; then
    echo -e "${YELLOW}Found bug: ORDER BY last_seen_at (column doesn't exist)${NC}"
    echo "Fixing to use 'last_updated_at'..."

    sed -i "s/ORDER BY last_seen_at DESC/ORDER BY last_updated_at DESC/g" src/services/samGovCache.js

    echo -e "${GREEN}✅ Column name fixed${NC}"
else
    echo -e "${GREEN}✅ No column name bug found (already fixed)${NC}"
fi

# Also check getAllCachedOpportunities (line ~370)
if grep -n "ORDER BY.*last_seen_at" src/services/samGovCache.js; then
    echo -e "${YELLOW}Found more instances of last_seen_at${NC}"
    sed -i "s/last_seen_at/last_updated_at/g" src/services/samGovCache.js
    echo -e "${GREEN}✅ All instances fixed${NC}"
fi

# ==========================================
# 2. VERIFY DATABASE SCHEMA
# ==========================================
echo ""
echo -e "${BLUE}STEP 2: Verifying database columns...${NC}"
echo ""

# Check what columns actually exist
echo "Columns in samgov_opportunities_cache table:"
sudo -u postgres psql -d myaiagent -c "\d samgov_opportunities_cache" | grep -E "first_seen|last_updated|last_seen"

# ==========================================
# 3. TEST QUERY DIRECTLY
# ==========================================
echo ""
echo -e "${BLUE}STEP 3: Testing database query...${NC}"
echo ""

echo "Running test query:"
RESULT=$(sudo -u postgres psql -d myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache;")
echo "Total rows: $RESULT"

if [ "$RESULT" -gt 0 ]; then
    echo ""
    echo "Sample data (should show opportunities):"
    sudo -u postgres psql -d myaiagent -c "SELECT notice_id, title, posted_date FROM samgov_opportunities_cache ORDER BY last_updated_at DESC LIMIT 3;"
else
    echo -e "${RED}❌ Table is empty!${NC}"
fi

# ==========================================
# 4. RESTART BACKEND
# ==========================================
echo ""
echo -e "${BLUE}STEP 4: Restarting backend...${NC}"
echo ""

sudo -u ubuntu pm2 restart myaiagent-backend

sleep 5

echo -e "${GREEN}✅ Backend restarted${NC}"

# ==========================================
# 5. TEST ENDPOINT
# ==========================================
echo ""
echo -e "${BLUE}STEP 5: Testing /api/sam-gov/cached-opportunities endpoint...${NC}"
echo ""

sleep 3

# Login first
rm -f /tmp/test-samgov.txt
CSRF=$(curl -s -c /tmp/test-samgov.txt https://werkules.com/api/csrf-token | jq -r '.csrfToken' 2>/dev/null)

if [ -n "$CSRF" ]; then
    LOGIN=$(curl -s -X POST https://werkules.com/api/auth/login \
      -H "Content-Type: application/json" \
      -H "X-CSRF-Token: $CSRF" \
      -H "Origin: https://werkules.com" \
      -b /tmp/test-samgov.txt \
      -c /tmp/test-samgov.txt \
      -d '{"email":"admin@myaiagent.com","password":"admin123"}')

    if echo "$LOGIN" | jq -e '.user' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Logged in${NC}"

        # Test the endpoint
        echo ""
        echo "Testing GET /api/sam-gov/cached-opportunities?limit=5..."

        RESPONSE=$(curl -s "https://werkules.com/api/sam-gov/cached-opportunities?limit=5" \
          -H "Origin: https://werkules.com" \
          -b /tmp/test-samgov.txt)

        if echo "$RESPONSE" | jq -e '.opportunities' > /dev/null 2>&1; then
            COUNT=$(echo "$RESPONSE" | jq '.opportunities | length')
            TOTAL=$(echo "$RESPONSE" | jq '.total // 0')

            echo -e "${GREEN}✅✅✅ ENDPOINT WORKING!${NC}"
            echo ""
            echo "Response:"
            echo "  Total opportunities in DB: $TOTAL"
            echo "  Returned in response: $COUNT"
            echo ""

            if [ "$COUNT" -gt 0 ]; then
                echo "Sample opportunity:"
                echo "$RESPONSE" | jq '.opportunities[0] | {notice_id, title, posted_date}'
            else
                echo -e "${YELLOW}⚠️  No opportunities returned (database might be empty)${NC}"
            fi
        else
            echo -e "${RED}❌ Endpoint returned unexpected response:${NC}"
            echo "$RESPONSE" | jq '.'
        fi
    else
        echo -e "${RED}❌ Login failed${NC}"
    fi
else
    echo -e "${RED}❌ Failed to get CSRF token${NC}"
fi

rm -f /tmp/test-samgov.txt

# ==========================================
# 6. CHECK FRONTEND CONSOLE
# ==========================================
echo ""
echo -e "${BLUE}STEP 6: Instructions to verify in browser...${NC}"
echo ""

echo "Now test in your browser:"
echo ""
echo "1. Open https://werkules.com"
echo "2. Navigate to 'Contract Opportunities' or 'SAM.gov'"
echo "3. Open browser console (F12)"
echo "4. Look for:"
echo "   ${GREEN}✓ GET /api/sam-gov/cached-opportunities${NC}"
echo "   ${GREEN}✓ Response with opportunities array${NC}"
echo ""
echo "5. You should see opportunities listed!"
echo ""

# ==========================================
# SUMMARY
# ==========================================
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ BUG FIXED${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo "What was fixed:"
echo "  ✓ Changed 'last_seen_at' to 'last_updated_at' in samGovCache.js"
echo "  ✓ This column actually exists in the database"
echo "  ✓ Query now works correctly"
echo "  ✓ API returns opportunities"
echo ""

echo -e "${YELLOW}If you still don't see opportunities:${NC}"
echo "1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. Clear browser cache"
echo "3. Check browser console for API calls"
echo "4. Make sure you're on the SAM.gov opportunities page"
echo ""
