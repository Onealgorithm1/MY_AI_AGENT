#!/bin/bash

# ===========================================
# AGGRESSIVE PORT CLEANUP AND SINGLE RESTART
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 Aggressive Port Cleanup and Restart${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Run as ubuntu user
if [ "$EUID" -eq 0 ]; then
   echo -e "${YELLOW}Running as root, will switch to ubuntu user for PM2${NC}"
fi

# 1. Nuclear option: Kill EVERYTHING related to node and PM2
echo -e "${BLUE}1. Killing ALL node processes and PM2...${NC}"

# Stop PM2 for both root and ubuntu users
sudo -u ubuntu pm2 delete all || true
pm2 delete all || true
sudo -u ubuntu pm2 kill || true
pm2 kill || true

# Kill all node processes
sudo pkill -9 node || true
sudo pkill -9 npm || true

# Wait for processes to die
sleep 3

# Verify nothing is on port 5000
if sudo lsof -t -i:5000 > /dev/null 2>&1; then
    echo -e "${RED}Still something on port 5000, killing forcefully...${NC}"
    sudo kill -9 $(sudo lsof -t -i:5000) || true
    sleep 2
fi

echo -e "${GREEN}✅ All processes killed${NC}"

# 2. Verify port 5000 is completely free
echo -e "\n${BLUE}2. Verifying port 5000 is free...${NC}"
for i in {1..3}; do
    if sudo lsof -t -i:5000 > /dev/null 2>&1; then
        echo -e "${YELLOW}Attempt $i: Port still in use, killing...${NC}"
        sudo kill -9 $(sudo lsof -t -i:5000) || true
        sleep 2
    else
        echo -e "${GREEN}✅ Port 5000 is free${NC}"
        break
    fi
done

if sudo lsof -t -i:5000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Could not clear port 5000${NC}"
    sudo lsof -i:5000
    exit 1
fi

# 3. Start backend as ubuntu user (NOT root)
echo -e "\n${BLUE}3. Starting backend as ubuntu user...${NC}"

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Make sure .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env not found${NC}"
    exit 1
fi

# Start with ubuntu user's PM2 (not root)
sudo -u ubuntu bash << 'EOF'
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
export HOME=/home/ubuntu

# Start PM2 as ubuntu user
pm2 start npm --name "myaiagent-backend" -- start --watch false

# Save PM2 list
pm2 save --force

# Show status
pm2 status
EOF

echo -e "${GREEN}✅ Backend started as ubuntu user${NC}"

# 4. Wait for backend to stabilize
echo -e "\n${BLUE}4. Waiting for backend to stabilize...${NC}"
sleep 10

# 5. Check if it's running
echo -e "\n${BLUE}5. Checking backend status...${NC}"

# Check PM2 status
sudo -u ubuntu pm2 status myaiagent-backend

# Check if listening on port 5000
if sudo lsof -i:5000 | grep -q LISTEN; then
    echo -e "${GREEN}✅ Backend is listening on port 5000${NC}"
    sudo lsof -i:5000 | grep LISTEN
else
    echo -e "${RED}❌ Backend NOT listening on port 5000${NC}"
    echo "PM2 logs:"
    sudo -u ubuntu pm2 logs myaiagent-backend --lines 50 --nostream
    exit 1
fi

# 6. Check for crashes
echo -e "\n${BLUE}6. Checking for crashes...${NC}"
RESTARTS=$(sudo -u ubuntu pm2 jlist | jq '.[0].pm2_env.restart_time')
if [ "$RESTARTS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Backend has restarted $RESTARTS times${NC}"
    echo "Checking error logs..."
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 20 --nostream
else
    echo -e "${GREEN}✅ No restarts, running stable${NC}"
fi

# 7. Test health endpoint
echo -e "\n${BLUE}7. Testing health endpoint...${NC}"
sleep 2
HEALTH=$(curl -s http://localhost:5000/health || echo "FAILED")

if [ "$HEALTH" == "FAILED" ] || [ -z "$HEALTH" ]; then
    echo -e "${RED}❌ Health endpoint failed${NC}"
    echo "Backend logs:"
    sudo -u ubuntu pm2 logs myaiagent-backend --lines 30 --nostream
    exit 1
else
    echo -e "${GREEN}✅ Health endpoint working${NC}"
    echo "$HEALTH" | jq '.'
fi

# 8. Test complete authentication flow
echo -e "\n${BLUE}8. Testing authentication flow...${NC}"

rm -f /tmp/final-auth-test.txt

# Get CSRF
CSRF_TOKEN=$(curl -s -c /tmp/final-auth-test.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)
if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" == "null" ]; then
    echo -e "${RED}❌ CSRF token failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ CSRF token: ${CSRF_TOKEN:0:40}...${NC}"

# Login
LOGIN=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/final-auth-test.txt \
  -c /tmp/final-auth-test.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if echo "$LOGIN" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Login successful${NC}"
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN" | jq '.'
    exit 1
fi

# Check JWT cookie
if ! grep -q "jwt" /tmp/final-auth-test.txt; then
    echo -e "${RED}❌ JWT cookie not set${NC}"
    cat /tmp/final-auth-test.txt
    exit 1
fi
echo -e "${GREEN}✅ JWT cookie set${NC}"

sleep 2

# Test protected endpoint
ME=$(curl -s https://werkules.com/api/auth/me -b /tmp/final-auth-test.txt)

if echo "$ME" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅✅✅ SUCCESS! USER STAYS LOGGED IN!${NC}"
    echo "$ME" | jq '{email: .user.email, role: .user.role}'
else
    echo -e "${RED}❌ Protected endpoint failed${NC}"
    echo "$ME" | jq '.'
    echo -e "\nBackend logs:"
    sudo -u ubuntu pm2 logs myaiagent-backend --lines 30 --nostream
    exit 1
fi

# 9. Final summary
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 SUCCESS! Everything Working!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${BLUE}Backend Status:${NC}"
sudo -u ubuntu pm2 status

echo -e "\n${BLUE}Recent Requests:${NC}"
sudo -u ubuntu pm2 logs myaiagent-backend --lines 15 --nostream | grep -E "POST|GET" | tail -8

echo -e "\n${YELLOW}Test in Browser:${NC}"
echo -e "1. Go to: https://werkules.com/login"
echo -e "2. Clear cookies (DevTools → Application → Cookies)"
echo -e "3. Login: admin@myaiagent.com / admin123"
echo -e "4. Should ${GREEN}STAY LOGGED IN${NC} ✅"
echo -e "5. Test SAM.gov opportunities dashboard"
echo -e "6. Click opportunity details"
echo -e "7. Verify charts display correctly"
echo ""
