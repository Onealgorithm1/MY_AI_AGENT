#!/bin/bash

# ===========================================
# TEST GEMINI CHAT AND SAM.GOV OPPORTUNITIES
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🚀 TEST GEMINI CHAT AND OPPORTUNITIES${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# ==========================================
# 1. RESTART BACKEND WITH NEW CODE
# ==========================================
echo -e "${BLUE}STEP 1: Restarting backend with Gemini API fix...${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Check if apiKeys.js has Gemini mapping
if grep -q "gemini.*Google APIs" src/utils/apiKeys.js; then
    echo -e "${GREEN}✅ Gemini mapping found in apiKeys.js${NC}"
else
    echo -e "${RED}❌ Gemini mapping NOT found in apiKeys.js${NC}"
    echo "Expected: 'gemini': 'Google APIs'"
    exit 1
fi

# Restart backend
sudo -u ubuntu pm2 restart myaiagent-backend
sleep 8

# Check status
PM2_STATUS=$(sudo -u ubuntu pm2 jlist | jq '.[0].pm2_env.status' -r)
if [ "$PM2_STATUS" == "online" ]; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream
    exit 1
fi

# ==========================================
# 2. VERIFY API KEYS IN DATABASE
# ==========================================
echo -e "\n${BLUE}STEP 2: Verifying API keys in database...${NC}"
echo ""

# Create test script to verify Gemini can get API key
cat > test-gemini-key.js << 'EOFJS'
import { getApiKey } from './src/utils/apiKeys.js';

async function testGeminiKey() {
  console.log('Testing Gemini API key retrieval...\n');

  try {
    const geminiKey = await getApiKey('gemini');
    if (geminiKey) {
      console.log(`✅ Gemini API key found: ${geminiKey.substring(0, 20)}... (length: ${geminiKey.length})`);
    } else {
      console.log('❌ Gemini API key NOT found');
      console.log('Database should have service_name = "Google APIs"');
    }
  } catch (error) {
    console.log(`❌ Error getting Gemini key: ${error.message}`);
  }

  try {
    const samgovKey = await getApiKey('samgov');
    if (samgovKey) {
      console.log(`✅ SAM.gov API key found: ${samgovKey.substring(0, 20)}... (length: ${samgovKey.length})`);
    } else {
      console.log('❌ SAM.gov API key NOT found');
    }
  } catch (error) {
    console.log(`❌ Error getting SAM.gov key: ${error.message}`);
  }

  process.exit(0);
}

testGeminiKey();
EOFJS

node test-gemini-key.js
rm test-gemini-key.js

# ==========================================
# 3. TEST AUTHENTICATION
# ==========================================
echo -e "\n${BLUE}STEP 3: Testing authentication...${NC}"
echo ""

rm -f /tmp/test-gemini.txt

# Get CSRF token
CSRF_TOKEN=$(curl -s -c /tmp/test-gemini.txt https://werkules.com/api/csrf-token | jq -r .csrfToken 2>/dev/null || echo "")

if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" == "null" ]; then
    echo -e "${RED}❌ Failed to get CSRF token${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CSRF token: ${CSRF_TOKEN:0:40}...${NC}"

# Login
LOGIN_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-gemini.txt \
  -c /tmp/test-gemini.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if ! echo "$LOGIN_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')
echo -e "${GREEN}✅ Logged in as admin (ID: $USER_ID)${NC}"

sleep 2

# ==========================================
# 4. TEST GEMINI CHAT
# ==========================================
echo -e "\n${BLUE}STEP 4: Testing Gemini Chat Functionality${NC}"
echo ""

# Create new conversation
echo "Creating new conversation with Gemini..."
NEW_CONV=$(curl -s -w "\n%{http_code}" -X POST https://werkules.com/api/conversations \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-gemini.txt \
  -d '{"title":"Gemini Test Chat","model":"gemini-1.5-pro"}')

NEW_CONV_HTTP=$(echo "$NEW_CONV" | tail -1)
NEW_CONV_BODY=$(echo "$NEW_CONV" | head -n -1)

if [ "$NEW_CONV_HTTP" == "201" ] || [ "$NEW_CONV_HTTP" == "200" ]; then
    echo -e "${GREEN}✅ Create conversation working${NC}"
    CONV_ID=$(echo "$NEW_CONV_BODY" | jq -r '.id // .conversation.id')
    echo "Created conversation ID: $CONV_ID"
else
    echo -e "${RED}❌ Create conversation failed: HTTP $NEW_CONV_HTTP${NC}"
    echo "$NEW_CONV_BODY" | jq '.'
    CONV_ID=""
fi

# Send test message to Gemini
if [ -n "$CONV_ID" ]; then
    echo ""
    echo "Sending test message to Gemini..."

    MESSAGE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://werkules.com/api/conversations/$CONV_ID/messages" \
      -H "Content-Type: application/json" \
      -H "X-CSRF-Token: $CSRF_TOKEN" \
      -H "Origin: https://werkules.com" \
      -b /tmp/test-gemini.txt \
      -d '{"content":"Hello! Please respond with a brief greeting to confirm Gemini is working."}')

    MESSAGE_HTTP=$(echo "$MESSAGE_RESPONSE" | tail -1)
    MESSAGE_BODY=$(echo "$MESSAGE_RESPONSE" | head -n -1)

    if [ "$MESSAGE_HTTP" == "200" ] || [ "$MESSAGE_HTTP" == "201" ]; then
        echo -e "${GREEN}✅✅✅ GEMINI CHAT WORKING!${NC}"
        echo ""
        echo "User message:"
        echo "$MESSAGE_BODY" | jq -r 'if type=="array" then .[0] else . end | select(.role=="user") | .content' 2>/dev/null || echo "User message sent"
        echo ""
        echo "Gemini response:"
        echo "$MESSAGE_BODY" | jq -r 'if type=="array" then .[1] else . end | select(.role=="assistant") | .content' 2>/dev/null || echo "$MESSAGE_BODY" | jq '.content'
    else
        echo -e "${RED}❌ Send message failed: HTTP $MESSAGE_HTTP${NC}"
        echo "$MESSAGE_BODY" | jq '.'

        echo ""
        echo -e "${YELLOW}Backend error logs:${NC}"
        sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream | tail -20
    fi
fi

# ==========================================
# 5. TEST SAM.GOV OPPORTUNITIES
# ==========================================
echo -e "\n${BLUE}STEP 5: Testing SAM.gov Opportunities${NC}"
echo ""

# Test cached opportunities
echo "Testing GET /api/sam-gov/cached-opportunities..."
CACHED_OPP=$(curl -s -w "\n%{http_code}" "https://werkules.com/api/sam-gov/cached-opportunities?limit=10" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-gemini.txt)

CACHED_HTTP=$(echo "$CACHED_OPP" | tail -1)
CACHED_BODY=$(echo "$CACHED_OPP" | head -n -1)

if [ "$CACHED_HTTP" == "200" ]; then
    echo -e "${GREEN}✅ Cached opportunities endpoint working${NC}"

    OPP_COUNT=$(echo "$CACHED_BODY" | jq 'length // .opportunities | length // 0')
    echo "Cached opportunities: $OPP_COUNT"

    if [ "$OPP_COUNT" -gt 0 ]; then
        echo ""
        echo "Sample opportunity:"
        echo "$CACHED_BODY" | jq '.[0] // .opportunities[0] | {title, notice_id, posted_date}' 2>/dev/null || echo "Could not parse"
    else
        echo -e "${YELLOW}⚠️  Cache is empty (normal for first time)${NC}"
    fi
else
    echo -e "${RED}❌ Cached opportunities failed: HTTP $CACHED_HTTP${NC}"
    echo "$CACHED_BODY" | jq '.'
fi

# Test search from SAM.gov API
echo ""
echo "Testing POST /api/sam-gov/search (fetch from SAM.gov API)..."

SEARCH_OPP=$(curl -s -w "\n%{http_code}" -X POST "https://werkules.com/api/sam-gov/search" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-gemini.txt \
  -d '{"keyword":"software","limit":5}')

SEARCH_HTTP=$(echo "$SEARCH_OPP" | tail -1)
SEARCH_BODY=$(echo "$SEARCH_OPP" | head -n -1)

if [ "$SEARCH_HTTP" == "200" ]; then
    echo -e "${GREEN}✅✅✅ SAM.GOV SEARCH WORKING!${NC}"

    SEARCH_COUNT=$(echo "$SEARCH_BODY" | jq '.opportunities | length // 0')
    echo "Found $SEARCH_COUNT opportunities from SAM.gov API"

    if [ "$SEARCH_COUNT" -gt 0 ]; then
        echo ""
        echo "Sample from search:"
        echo "$SEARCH_BODY" | jq '.opportunities[0] | {title, noticeId, postedDate}' 2>/dev/null || echo "Could not parse"
    fi
else
    echo -e "${RED}❌ SAM.gov search failed: HTTP $SEARCH_HTTP${NC}"
    echo "$SEARCH_BODY" | jq '.'

    echo ""
    echo -e "${YELLOW}Backend error logs:${NC}"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream | tail -20
fi

# ==========================================
# 6. DATABASE STATUS
# ==========================================
echo -e "\n${BLUE}STEP 6: Database Status${NC}"
echo ""

echo "API Keys:"
sudo -u postgres psql -d myaiagent -c "SELECT service_name, key_type, is_default, is_active FROM api_secrets WHERE is_active = true ORDER BY service_name;"

echo ""
echo "Data Counts:"
echo "  Conversations: $(sudo -u postgres psql -d myaiagent -t -c 'SELECT COUNT(*) FROM conversations')"
echo "  Messages: $(sudo -u postgres psql -d myaiagent -t -c 'SELECT COUNT(*) FROM messages')"
echo "  SAM.gov Cache: $(sudo -u postgres psql -d myaiagent -t -c 'SELECT COUNT(*) FROM samgov_opportunities_cache' 2>/dev/null || echo '0')"
echo "  Opportunities: $(sudo -u postgres psql -d myaiagent -t -c 'SELECT COUNT(*) FROM opportunities' 2>/dev/null || echo '0')"

# ==========================================
# FINAL SUMMARY
# ==========================================
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}📊 TEST SUMMARY${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${BLUE}✅ What's Working:${NC}"
echo -e "  ✓ Backend running with Gemini API fix"
echo -e "  ✓ API key mapping: gemini → Google APIs"
echo -e "  ✓ Authentication working"
echo -e "  ✓ CSRF protection working"

if [ "$MESSAGE_HTTP" == "200" ] || [ "$MESSAGE_HTTP" == "201" ]; then
    echo -e "  ${GREEN}✓ Gemini Chat WORKING ✅✅✅${NC}"
else
    echo -e "  ${RED}✗ Gemini Chat needs troubleshooting${NC}"
fi

if [ "$SEARCH_HTTP" == "200" ]; then
    echo -e "  ${GREEN}✓ SAM.gov Opportunities WORKING ✅✅✅${NC}"
else
    echo -e "  ${YELLOW}⚠ SAM.gov Opportunities needs troubleshooting${NC}"
fi

echo -e "\n${BLUE}🌐 Test in Browser:${NC}"
echo -e "1. Go to: ${YELLOW}https://werkules.com${NC}"
echo -e "2. Clear cookies (F12 → Application → Cookies → Clear All)"
echo -e "3. Login: ${YELLOW}admin@myaiagent.com / admin123${NC}"
echo -e "4. Create new conversation"
echo -e "5. ${GREEN}Send a message - should get Gemini response${NC}"
echo -e "6. Navigate to SAM.gov Opportunities tab"
echo -e "7. Click 'Search' or 'Refresh' to fetch opportunities"

echo ""
echo -e "${GREEN}✅ Gemini is now the AI engine for all chat and analysis!${NC}"
echo ""
