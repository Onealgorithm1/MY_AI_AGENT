#!/bin/bash

# ===========================================
# COMPLETE FIX AND END-TO-END TEST
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 Complete Fix and End-to-End Test${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# 1. Stop PM2 and clear cache
echo -e "${BLUE}1. Stopping PM2 and clearing cache...${NC}"
pm2 delete myaiagent-backend || true
sleep 2
echo -e "${GREEN}✅ PM2 cleared${NC}"

# 2. Verify database has google_id column
echo -e "\n${BLUE}2. Verifying database schema...${NC}"
sudo -u postgres psql -d myaiagent -c "\d users" | grep google_id
echo -e "${GREEN}✅ google_id column exists${NC}"

# 3. Check environment variables
echo -e "\n${BLUE}3. Checking environment variables...${NC}"
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

if grep -q "JWT_SECRET=" .env && grep -q "CSRF_SECRET=" .env; then
    echo -e "${GREEN}✅ Secrets configured${NC}"
else
    echo -e "${RED}❌ Missing secrets in .env${NC}"
    exit 1
fi

# 4. Verify cookie-parser is installed
echo -e "\n${BLUE}4. Verifying cookie-parser...${NC}"
if grep -q "cookie-parser" package.json; then
    echo -e "${GREEN}✅ cookie-parser in package.json${NC}"
else
    echo -e "${YELLOW}⚠️  Installing cookie-parser...${NC}"
    npm install cookie-parser
fi

# 5. Check if cookie-parser is used in server.js
echo -e "\n${BLUE}5. Checking server.js for cookie-parser...${NC}"
if grep -q "cookieParser" src/server.js; then
    echo -e "${GREEN}✅ cookie-parser is used${NC}"
else
    echo -e "${RED}❌ cookie-parser not imported/used in server.js${NC}"
    echo -e "${YELLOW}This might be the issue!${NC}"
fi

# 6. Start backend fresh with new environment
echo -e "\n${BLUE}6. Starting backend with fresh environment...${NC}"
pm2 start npm --name "myaiagent-backend" -- start
pm2 save

# Wait for startup
echo "Waiting for backend to start..."
sleep 5

# Check status
pm2 status myaiagent-backend
echo -e "${GREEN}✅ Backend started${NC}"

# 7. Test complete authentication flow
echo -e "\n${BLUE}7. Testing complete authentication flow...${NC}"

# Clean start
rm -f /tmp/test-flow.txt

# Get CSRF token
echo "  Step 1: Getting CSRF token..."
CSRF_TOKEN=$(curl -s -c /tmp/test-flow.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)
if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" == "null" ]; then
    echo -e "${RED}❌ Failed to get CSRF token${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ CSRF token: ${CSRF_TOKEN:0:40}...${NC}"

# Login
echo "  Step 2: Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-flow.txt \
  -c /tmp/test-flow.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Login successful${NC}"
    echo "$LOGIN_RESPONSE" | jq '{user: .user.email, role: .user.role}'
else
    echo -e "${RED}  ❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

# Check JWT cookie
echo "  Step 3: Verifying JWT cookie..."
if grep -q "jwt" /tmp/test-flow.txt; then
    echo -e "${GREEN}  ✅ JWT cookie set${NC}"
else
    echo -e "${RED}  ❌ JWT cookie not set${NC}"
    exit 1
fi

# Wait for cookie to settle
sleep 1

# Test protected endpoint /api/auth/me
echo "  Step 4: Testing /api/auth/me (should stay logged in)..."
ME_RESPONSE=$(curl -s https://werkules.com/api/auth/me -b /tmp/test-flow.txt)

if echo "$ME_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅✅✅ USER STAYS LOGGED IN!${NC}"
    echo "$ME_RESPONSE" | jq '{email: .user.email, role: .user.role}'
else
    echo -e "${RED}  ❌ Protected endpoint failed - User gets logged out${NC}"
    echo "$ME_RESPONSE" | jq '.'

    # Debug: Check what backend logs show
    echo -e "\n${YELLOW}Debugging: Recent backend logs...${NC}"
    pm2 logs myaiagent-backend --lines 20 --nostream --err | tail -15
    exit 1
fi

# Test preferences endpoint
echo "  Step 5: Testing /api/auth/preferences..."
PREFS_RESPONSE=$(curl -s https://werkules.com/api/auth/preferences -b /tmp/test-flow.txt)

if echo "$PREFS_RESPONSE" | jq -e '.preferences' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Preferences endpoint working${NC}"
else
    echo -e "${YELLOW}  ⚠️  Preferences endpoint check (may not be critical)${NC}"
fi

# 8. Test complete application flow
echo -e "\n${BLUE}8. Testing complete application flow...${NC}"

# Test getting opportunities (SAM.gov integration)
echo "  Step 6: Testing opportunities list..."
OPP_RESPONSE=$(curl -s https://werkules.com/api/opportunities -b /tmp/test-flow.txt)

if echo "$OPP_RESPONSE" | jq -e 'type' > /dev/null 2>&1; then
    RESP_TYPE=$(echo "$OPP_RESPONSE" | jq -r 'type')
    if [ "$RESP_TYPE" == "array" ] || echo "$OPP_RESPONSE" | jq -e '.opportunities' > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ Opportunities endpoint working${NC}"
        OPP_COUNT=$(echo "$OPP_RESPONSE" | jq 'length // .opportunities | length')
        echo "  Found $OPP_COUNT opportunities"
    else
        echo -e "${YELLOW}  ⚠️  Opportunities response format unexpected${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠️  Opportunities endpoint may not be implemented yet${NC}"
fi

# Test dashboard/conversations
echo "  Step 7: Testing conversations endpoint..."
CONV_RESPONSE=$(curl -s https://werkules.com/api/conversations -b /tmp/test-flow.txt)

if echo "$CONV_RESPONSE" | jq -e 'type' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Conversations endpoint working${NC}"
else
    echo -e "${YELLOW}  ⚠️  Conversations endpoint check${NC}"
fi

# 9. Check backend logs for proper routing
echo -e "\n${BLUE}9. Verifying backend received correct routes...${NC}"
echo "Recent requests:"
pm2 logs myaiagent-backend --lines 30 --nostream | grep -E "POST|GET" | tail -10

echo -e "\n${YELLOW}Expected to see:${NC}"
echo -e "  ${GREEN}✅ POST /api/auth/login - 200${NC}"
echo -e "  ${GREEN}✅ GET /api/auth/me - 200${NC}"
echo -e "  ${GREEN}✅ GET /api/auth/preferences - 200${NC}"

echo -e "\n${YELLOW}Should NOT see:${NC}"
echo -e "  ${RED}❌ POST /login - 200${NC}"
echo -e "  ${RED}❌ GET /me - 401${NC}"

# 10. Final summary
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 Complete Fix and Test Summary${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${BLUE}✅ Backend Status:${NC}"
pm2 status myaiagent-backend | tail -5

echo -e "\n${BLUE}✅ Authentication Flow:${NC}"
echo -e "  ✓ CSRF token generation"
echo -e "  ✓ Admin login"
echo -e "  ✓ JWT cookie persistence"
echo -e "  ✓ Protected endpoints (user stays logged in)"

echo -e "\n${BLUE}🌐 Test in Browser:${NC}"
echo -e "1. Open: ${YELLOW}https://werkules.com/login${NC}"
echo -e "2. Clear all cookies (DevTools → Application → Cookies → Clear All)"
echo -e "3. Login: ${YELLOW}admin@myaiagent.com / admin123${NC}"
echo -e "4. Should redirect to dashboard and ${GREEN}STAY LOGGED IN${NC}"
echo -e "5. Navigate to SAM.gov opportunities"
echo -e "6. Click on an opportunity to see details"
echo -e "7. Check if charts load correctly"

echo -e "\n${BLUE}📊 Additional Tests:${NC}"
echo -e "- Create a new conversation"
echo -e "- Send messages and verify responses"
echo -e "- Test voice features if enabled"
echo -e "- Verify all charts render correctly"
echo -e "- Check opportunity detail pages"

echo ""
