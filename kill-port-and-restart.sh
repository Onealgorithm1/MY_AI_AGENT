#!/bin/bash

# ===========================================
# KILL PORT 5000 AND RESTART BACKEND
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 Kill Port 5000 and Restart Backend${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# 1. Check what's using port 5000
echo -e "${BLUE}1. Checking what's using port 5000...${NC}"
PIDS=$(sudo lsof -t -i:5000 || true)

if [ -z "$PIDS" ]; then
    echo -e "${GREEN}✅ Port 5000 is free${NC}"
else
    echo -e "${YELLOW}⚠️  Port 5000 is in use by:${NC}"
    sudo lsof -i:5000

    # Kill all processes on port 5000
    echo -e "\n${BLUE}Killing all processes on port 5000...${NC}"
    sudo kill -9 $PIDS
    sleep 2

    # Verify it's killed
    if sudo lsof -t -i:5000 > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to kill processes on port 5000${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Port 5000 cleared${NC}"
    fi
fi

# 2. Stop all PM2 processes
echo -e "\n${BLUE}2. Stopping all PM2 processes...${NC}"
pm2 delete all || true
sleep 2
echo -e "${GREEN}✅ PM2 cleared${NC}"

# 3. Kill any remaining node processes (be careful!)
echo -e "\n${BLUE}3. Checking for stray node processes...${NC}"
NODE_PIDS=$(pgrep -f "node.*server.js" || true)
if [ -n "$NODE_PIDS" ]; then
    echo -e "${YELLOW}⚠️  Found stray node processes: $NODE_PIDS${NC}"
    echo "Killing them..."
    kill -9 $NODE_PIDS || true
    sleep 1
fi
echo -e "${GREEN}✅ No stray processes${NC}"

# 4. Verify port 5000 is completely free
echo -e "\n${BLUE}4. Final verification that port 5000 is free...${NC}"
if sudo lsof -t -i:5000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Port 5000 still in use!${NC}"
    sudo lsof -i:5000
    exit 1
else
    echo -e "${GREEN}✅ Port 5000 is completely free${NC}"
fi

# 5. Start backend fresh
echo -e "\n${BLUE}5. Starting backend with fresh environment...${NC}"
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Check .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

# Start with PM2
pm2 start npm --name "myaiagent-backend" -- start
pm2 save

# Wait for startup
echo "Waiting for backend to fully start..."
sleep 8

# 6. Check backend status
echo -e "\n${BLUE}6. Checking backend status...${NC}"
pm2 status myaiagent-backend

# Check if it's actually listening on port 5000
if sudo lsof -i:5000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is listening on port 5000${NC}"
    sudo lsof -i:5000 | head -2
else
    echo -e "${RED}❌ Backend is NOT listening on port 5000${NC}"
    echo "Checking logs for errors..."
    pm2 logs myaiagent-backend --lines 30 --nostream --err
    exit 1
fi

# 7. Test health endpoint
echo -e "\n${BLUE}7. Testing health endpoint...${NC}"
HEALTH=$(curl -s http://localhost:5000/health || echo "FAILED")
if [ "$HEALTH" == "FAILED" ]; then
    echo -e "${RED}❌ Health endpoint failed${NC}"
else
    echo -e "${GREEN}✅ Health endpoint working${NC}"
    echo "$HEALTH" | jq '.' || echo "$HEALTH"
fi

# 8. Test complete auth flow
echo -e "\n${BLUE}8. Testing complete authentication flow...${NC}"

rm -f /tmp/final-test.txt

# Get CSRF
echo "  - Getting CSRF token..."
CSRF_TOKEN=$(curl -s -c /tmp/final-test.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)
if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" == "null" ]; then
    echo -e "${RED}  ❌ Failed to get CSRF token${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ CSRF: ${CSRF_TOKEN:0:40}...${NC}"

# Login
echo "  - Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/final-test.txt \
  -c /tmp/final-test.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Login successful${NC}"
else
    echo -e "${RED}  ❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

# Check JWT cookie
if ! grep -q "jwt" /tmp/final-test.txt; then
    echo -e "${RED}  ❌ JWT cookie not set${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ JWT cookie set${NC}"

sleep 2

# Test protected endpoint
echo "  - Testing /api/auth/me..."
ME_RESPONSE=$(curl -s https://werkules.com/api/auth/me -b /tmp/final-test.txt)

if echo "$ME_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅✅✅ SUCCESS! USER STAYS LOGGED IN!${NC}"
    echo "$ME_RESPONSE" | jq '{email: .user.email, role: .user.role}'
else
    echo -e "${RED}  ❌ Protected endpoint failed${NC}"
    echo "$ME_RESPONSE" | jq '.'

    echo -e "\n${YELLOW}Debugging backend logs:${NC}"
    pm2 logs myaiagent-backend --lines 30 --nostream
    exit 1
fi

# 9. Check backend logs for proper routing
echo -e "\n${BLUE}9. Checking backend logs for proper routing...${NC}"
pm2 logs myaiagent-backend --lines 20 --nostream | grep -E "POST|GET" | tail -10

# 10. Success summary
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 SUCCESS! Everything is working!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${BLUE}✅ Port 5000 cleared and backend running${NC}"
echo -e "${BLUE}✅ Authentication flow working end-to-end${NC}"
echo -e "${BLUE}✅ Users stay logged in${NC}"
echo ""
echo -e "${YELLOW}Test in browser now:${NC}"
echo -e "1. Go to: https://werkules.com/login"
echo -e "2. Clear cookies (DevTools → Application → Cookies → Clear All)"
echo -e "3. Login: admin@myaiagent.com / admin123"
echo -e "4. Should ${GREEN}STAY LOGGED IN${NC} ✅"
echo -e "5. Navigate to SAM.gov opportunities dashboard"
echo -e "6. Click on opportunity details"
echo -e "7. Verify charts display correctly"
echo ""
