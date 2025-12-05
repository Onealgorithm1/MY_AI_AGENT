#!/bin/bash

# ===========================================
# COMPREHENSIVE DIAGNOSTIC AND FIX
# Chat + SAM.gov Opportunities + API Keys
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 COMPREHENSIVE DIAGNOSTIC AND FIX${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# ==========================================
# 1. CHECK API KEYS
# ==========================================
echo -e "${BLUE}STEP 1: Checking API Keys Configuration${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Check .env file
echo "Checking .env file..."

if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

# Check OpenAI API key
if grep -q "^OPENAI_API_KEY=" .env; then
    OPENAI_KEY=$(grep "^OPENAI_API_KEY=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ -z "$OPENAI_KEY" ] || [ "$OPENAI_KEY" == "your_openai_api_key_here" ]; then
        echo -e "${RED}❌ OpenAI API key not set in .env${NC}"
        OPENAI_MISSING=1
    else
        echo -e "${GREEN}✅ OpenAI API key found: ${OPENAI_KEY:0:20}...${NC}"
        OPENAI_MISSING=0
    fi
else
    echo -e "${RED}❌ OPENAI_API_KEY not in .env${NC}"
    OPENAI_MISSING=1
fi

# Check SAM.gov API key
if grep -q "^SAM_GOV_API_KEY=" .env; then
    SAM_KEY=$(grep "^SAM_GOV_API_KEY=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ -z "$SAM_KEY" ] || [ "$SAM_KEY" == "your_sam_gov_api_key_here" ]; then
        echo -e "${YELLOW}⚠️  SAM.gov API key not set (optional - public API works without it)${NC}"
        SAM_MISSING=1
    else
        echo -e "${GREEN}✅ SAM.gov API key found: ${SAM_KEY:0:20}...${NC}"
        SAM_MISSING=0
    fi
else
    echo -e "${YELLOW}⚠️  SAM_GOV_API_KEY not in .env (optional)${NC}"
    SAM_MISSING=1
fi

# Check database for API secrets
echo ""
echo "Checking database api_secrets table..."
API_SECRETS_COUNT=$(sudo -u postgres psql -d myaiagent -t -c "SELECT COUNT(*) FROM api_secrets WHERE service_name = 'openai' AND is_active = true" 2>/dev/null || echo "0")

if [ "$API_SECRETS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $API_SECRETS_COUNT active OpenAI key(s) in database${NC}"
    sudo -u postgres psql -d myaiagent -c "SELECT service_name, key_name, key_type, is_default, created_at FROM api_secrets WHERE service_name = 'openai'"
else
    echo -e "${YELLOW}⚠️  No OpenAI keys in api_secrets table${NC}"
fi

# ==========================================
# 2. CHECK BACKEND STATUS
# ==========================================
echo -e "\n${BLUE}STEP 2: Checking Backend Status${NC}"
echo ""

PM2_STATUS=$(sudo -u ubuntu pm2 jlist | jq '.[0].pm2_env.status' -r 2>/dev/null || echo "error")

if [ "$PM2_STATUS" != "online" ]; then
    echo -e "${RED}❌ Backend is not running!${NC}"
    echo "Starting backend..."
    sudo -u ubuntu pm2 restart myaiagent-backend || sudo -u ubuntu pm2 start npm --name "myaiagent-backend" -- start
    sleep 8
fi

echo -e "${GREEN}✅ Backend status: $(sudo -u ubuntu pm2 jlist | jq '.[0].pm2_env.status' -r)${NC}"

# Check recent errors
echo ""
echo "Recent backend errors (last 20 lines):"
sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 20 --nostream | tail -10

# ==========================================
# 3. TEST AUTHENTICATION
# ==========================================
echo -e "\n${BLUE}STEP 3: Testing Authentication${NC}"
echo ""

rm -f /tmp/diagnostic-test.txt

# Get CSRF token
CSRF_TOKEN=$(curl -s -c /tmp/diagnostic-test.txt https://werkules.com/api/csrf-token | jq -r .csrfToken 2>/dev/null || echo "")

if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" == "null" ]; then
    echo -e "${RED}❌ Failed to get CSRF token${NC}"
    echo "Testing direct backend connection..."
    curl -s http://localhost:5000/api/csrf-token | jq '.' || echo "Backend not responding"
    exit 1
fi

echo -e "${GREEN}✅ CSRF token: ${CSRF_TOKEN:0:40}...${NC}"

# Login
LOGIN_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/diagnostic-test.txt \
  -c /tmp/diagnostic-test.txt \
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
# 4. TEST CHAT/CONVERSATIONS
# ==========================================
echo -e "\n${BLUE}STEP 4: Testing Chat Functionality${NC}"
echo ""

# Get conversations
echo "Testing GET /api/conversations..."
CONV_RESPONSE=$(curl -s -w "\n%{http_code}" https://werkules.com/api/conversations \
  -H "Origin: https://werkules.com" \
  -b /tmp/diagnostic-test.txt)

CONV_HTTP=$(echo "$CONV_RESPONSE" | tail -1)
CONV_BODY=$(echo "$CONV_RESPONSE" | head -n -1)

if [ "$CONV_HTTP" == "200" ]; then
    echo -e "${GREEN}✅ GET conversations working${NC}"
    CONV_COUNT=$(echo "$CONV_BODY" | jq 'length // .conversations | length // 0')
    echo "Found $CONV_COUNT conversations"
else
    echo -e "${RED}❌ GET conversations failed: HTTP $CONV_HTTP${NC}"
    echo "$CONV_BODY" | jq '.'
fi

# Create new conversation
echo ""
echo "Testing POST /api/conversations (create)..."
NEW_CONV_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://werkules.com/api/conversations \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/diagnostic-test.txt \
  -d '{"title":"Diagnostic Test Chat","model":"gpt-4o"}')

NEW_CONV_HTTP=$(echo "$NEW_CONV_RESPONSE" | tail -1)
NEW_CONV_BODY=$(echo "$NEW_CONV_RESPONSE" | head -n -1)

if [ "$NEW_CONV_HTTP" == "201" ] || [ "$NEW_CONV_HTTP" == "200" ]; then
    echo -e "${GREEN}✅ Create conversation working${NC}"
    CONV_ID=$(echo "$NEW_CONV_BODY" | jq -r '.id // .conversation.id')
    echo "Created conversation ID: $CONV_ID"
else
    echo -e "${RED}❌ Create conversation failed: HTTP $NEW_CONV_HTTP${NC}"
    echo "$NEW_CONV_BODY" | jq '.'
    CONV_ID=""
fi

# Send a test message
if [ -n "$CONV_ID" ]; then
    echo ""
    echo "Testing POST /api/messages (send message)..."

    # Check if OpenAI key is missing
    if [ "$OPENAI_MISSING" -eq 1 ]; then
        echo -e "${YELLOW}⚠️  Skipping message test - OpenAI API key not configured${NC}"
        echo -e "${YELLOW}   To fix: Add OPENAI_API_KEY to .env or api_secrets table${NC}"
    else
        MESSAGE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://werkules.com/api/conversations/$CONV_ID/messages \
          -H "Content-Type: application/json" \
          -H "X-CSRF-Token: $CSRF_TOKEN" \
          -H "Origin: https://werkules.com" \
          -b /tmp/diagnostic-test.txt \
          -d '{"content":"Hello, this is a test message. Please respond with a brief greeting."}')

        MESSAGE_HTTP=$(echo "$MESSAGE_RESPONSE" | tail -1)
        MESSAGE_BODY=$(echo "$MESSAGE_RESPONSE" | head -n -1)

        if [ "$MESSAGE_HTTP" == "200" ] || [ "$MESSAGE_HTTP" == "201" ]; then
            echo -e "${GREEN}✅✅✅ CHAT WORKING! Message sent successfully${NC}"
            echo "$MESSAGE_BODY" | jq '{message_id: .id, role: .role, content: .content | .[0:100]}'
        else
            echo -e "${RED}❌ Send message failed: HTTP $MESSAGE_HTTP${NC}"
            echo "$MESSAGE_BODY" | jq '.'

            # Check backend logs for the error
            echo ""
            echo -e "${YELLOW}Backend error logs:${NC}"
            sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream | tail -15
        fi
    fi
fi

# ==========================================
# 5. TEST SAM.GOV OPPORTUNITIES
# ==========================================
echo -e "\n${BLUE}STEP 5: Testing SAM.gov Opportunities${NC}"
echo ""

# Test cached opportunities endpoint
echo "Testing GET /api/sam-gov/cached-opportunities..."
SAM_CACHE_RESPONSE=$(curl -s -w "\n%{http_code}" "https://werkules.com/api/sam-gov/cached-opportunities?limit=10" \
  -H "Origin: https://werkules.com" \
  -b /tmp/diagnostic-test.txt)

SAM_CACHE_HTTP=$(echo "$SAM_CACHE_RESPONSE" | tail -1)
SAM_CACHE_BODY=$(echo "$SAM_CACHE_RESPONSE" | head -n -1)

if [ "$SAM_CACHE_HTTP" == "200" ]; then
    echo -e "${GREEN}✅ Cached opportunities endpoint working${NC}"

    OPP_COUNT=$(echo "$SAM_CACHE_BODY" | jq 'length // .opportunities | length // 0')
    echo "Cached opportunities count: $OPP_COUNT"

    if [ "$OPP_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Cache is empty (normal for first time)${NC}"
        echo "Need to fetch from SAM.gov API..."
    else
        echo "Sample opportunity:"
        echo "$SAM_CACHE_BODY" | jq '.[0] // .opportunities[0] | {title, notice_id, posted_date}' 2>/dev/null || echo "Could not parse"
    fi
else
    echo -e "${RED}❌ Cached opportunities failed: HTTP $SAM_CACHE_HTTP${NC}"
    echo "$SAM_CACHE_BODY" | jq '.'

    echo ""
    echo -e "${YELLOW}Backend error logs:${NC}"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream | tail -15
fi

# Test search/fetch from SAM.gov API
echo ""
echo "Testing POST /api/sam-gov/search (fetch from SAM.gov API)..."

SAM_SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://werkules.com/api/sam-gov/search" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/diagnostic-test.txt \
  -d '{"keyword":"software","limit":5}')

SAM_SEARCH_HTTP=$(echo "$SAM_SEARCH_RESPONSE" | tail -1)
SAM_SEARCH_BODY=$(echo "$SAM_SEARCH_RESPONSE" | head -n -1)

if [ "$SAM_SEARCH_HTTP" == "200" ]; then
    echo -e "${GREEN}✅✅✅ SAM.gov search working!${NC}"

    SEARCH_COUNT=$(echo "$SAM_SEARCH_BODY" | jq '.opportunities | length // 0')
    echo "Found $SEARCH_COUNT opportunities from SAM.gov API"

    if [ "$SEARCH_COUNT" -gt 0 ]; then
        echo "Sample from search:"
        echo "$SAM_SEARCH_BODY" | jq '.opportunities[0] | {title, noticeId, postedDate}' 2>/dev/null || echo "Could not parse"
    fi
else
    echo -e "${RED}❌ SAM.gov search failed: HTTP $SAM_SEARCH_HTTP${NC}"
    echo "$SAM_SEARCH_BODY" | jq '.'

    # Check if it's an API key issue
    if echo "$SAM_SEARCH_BODY" | grep -qi "api key\|unauthorized\|forbidden"; then
        echo -e "\n${YELLOW}This might be an API key issue.${NC}"
        echo "SAM.gov API key status: $([ $SAM_MISSING -eq 1 ] && echo 'NOT SET' || echo 'SET')"
        echo "Note: Public SAM.gov API should work without a key for basic searches."
    fi

    echo ""
    echo -e "${YELLOW}Backend error logs:${NC}"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream | tail -15
fi

# ==========================================
# 6. DATABASE STATUS
# ==========================================
echo -e "\n${BLUE}STEP 6: Database Status${NC}"
echo ""

# Check table counts
echo "Key table row counts:"
echo "  Users: $(sudo -u postgres psql -d myaiagent -t -c 'SELECT COUNT(*) FROM users')"
echo "  Conversations: $(sudo -u postgres psql -d myaiagent -t -c 'SELECT COUNT(*) FROM conversations')"
echo "  Messages: $(sudo -u postgres psql -d myaiagent -t -c 'SELECT COUNT(*) FROM messages')"
echo "  SAM.gov Cache: $(sudo -u postgres psql -d myaiagent -t -c 'SELECT COUNT(*) FROM samgov_opportunities_cache' 2>/dev/null || echo '0 (table missing)')"
echo "  Opportunities: $(sudo -u postgres psql -d myaiagent -t -c 'SELECT COUNT(*) FROM opportunities' 2>/dev/null || echo '0 (table missing)')"

# ==========================================
# FINAL SUMMARY
# ==========================================
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}📊 DIAGNOSTIC SUMMARY${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${BLUE}API Keys:${NC}"
if [ "$OPENAI_MISSING" -eq 0 ]; then
    echo -e "  ${GREEN}✅ OpenAI API key configured${NC}"
else
    echo -e "  ${RED}❌ OpenAI API key MISSING${NC}"
    echo -e "     Fix: Add to /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend/.env"
    echo -e "     OPENAI_API_KEY=sk-proj-your-key-here"
fi

if [ "$SAM_MISSING" -eq 0 ]; then
    echo -e "  ${GREEN}✅ SAM.gov API key configured${NC}"
else
    echo -e "  ${YELLOW}⚠️  SAM.gov API key not set (optional)${NC}"
fi

echo -e "\n${BLUE}Status:${NC}"
echo -e "  Backend: $(sudo -u ubuntu pm2 jlist | jq '.[0].pm2_env.status' -r)"
echo -e "  Authentication: Working ✅"

echo -e "\n${BLUE}Next Steps:${NC}"

if [ "$OPENAI_MISSING" -eq 1 ]; then
    echo -e "${YELLOW}1. Add OpenAI API Key:${NC}"
    echo -e "   cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend"
    echo -e "   nano .env"
    echo -e "   Add: OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE"
    echo -e "   sudo -u ubuntu pm2 restart myaiagent-backend"
fi

echo -e "\n${BLUE}2. Test in Browser:${NC}"
echo -e "   - Go to: https://werkules.com"
echo -e "   - Login: admin@myaiagent.com / admin123"
echo -e "   - Create new conversation and send message"
echo -e "   - Navigate to SAM.gov Opportunities"
echo -e "   - Click 'Search' or 'Refresh' to fetch opportunities"

echo ""
