#!/bin/bash

# ===========================================
# COMPLETE END-TO-END FIX - EVERYTHING
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 COMPLETE END-TO-END FIX${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# ==========================================
# STEP 1: NUCLEAR CLEANUP
# ==========================================
echo -e "${BLUE}STEP 1: Nuclear cleanup of all processes${NC}"

# Kill PM2 for all users
sudo -u ubuntu pm2 delete all 2>/dev/null || true
sudo -u ubuntu pm2 kill 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Kill all node processes
sudo pkill -9 node 2>/dev/null || true
sudo pkill -9 npm 2>/dev/null || true
sleep 3

# Force kill port 5000
if sudo lsof -t -i:5000 > /dev/null 2>&1; then
    sudo kill -9 $(sudo lsof -t -i:5000) 2>/dev/null || true
    sleep 2
fi

echo -e "${GREEN}✅ All processes killed${NC}"

# ==========================================
# STEP 2: FIX NGINX CONFIGURATION
# ==========================================
echo -e "\n${BLUE}STEP 2: Fixing Nginx Configuration${NC}"

NGINX_CONFIG="/etc/nginx/sites-available/myaiagent"

# Backup
sudo cp $NGINX_CONFIG ${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)

# Check current config
echo "Current proxy_pass:"
sudo grep "proxy_pass" $NGINX_CONFIG | head -2

# Fix the proxy_pass to preserve /api
sudo sed -i 's|proxy_pass http://localhost:5000;|proxy_pass http://localhost:5000/api/;|g' $NGINX_CONFIG
sudo sed -i 's|proxy_pass http://localhost:5000/api;|proxy_pass http://localhost:5000/api/;|g' $NGINX_CONFIG

echo "Fixed proxy_pass:"
sudo grep "proxy_pass" $NGINX_CONFIG | head -2

# Test nginx config
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✅ Nginx config valid${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx reloaded${NC}"
else
    echo -e "${RED}❌ Nginx config invalid${NC}"
    sudo nginx -t
    exit 1
fi

# ==========================================
# STEP 3: VERIFY DATABASE SCHEMA
# ==========================================
echo -e "\n${BLUE}STEP 3: Verifying Database Schema${NC}"

# Check google_id column exists
if sudo -u postgres psql -d myaiagent -t -c "\d users" | grep -q "google_id"; then
    echo -e "${GREEN}✅ google_id column exists${NC}"
else
    echo -e "${YELLOW}⚠️  Adding google_id column...${NC}"
    sudo -u postgres psql -d myaiagent -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;"
    echo -e "${GREEN}✅ google_id column added${NC}"
fi

# ==========================================
# STEP 4: CHECK BACKEND CONFIGURATION
# ==========================================
echo -e "\n${BLUE}STEP 4: Checking Backend Configuration${NC}"

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Check .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

# Verify required secrets
MISSING_SECRETS=()
if ! grep -q "^JWT_SECRET=" .env; then
    MISSING_SECRETS+=("JWT_SECRET")
fi
if ! grep -q "^CSRF_SECRET=" .env && ! grep -q "^HMAC_SECRET=" .env; then
    MISSING_SECRETS+=("CSRF_SECRET")
fi
if ! grep -q "^ENCRYPTION_KEY=" .env; then
    MISSING_SECRETS+=("ENCRYPTION_KEY")
fi

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing secrets: ${MISSING_SECRETS[*]}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All secrets configured${NC}"

# Check NODE_ENV
if grep -q "^NODE_ENV=production" .env; then
    echo -e "${GREEN}✅ NODE_ENV=production${NC}"
else
    echo -e "${YELLOW}⚠️  Setting NODE_ENV=production${NC}"
    if grep -q "^NODE_ENV=" .env; then
        sudo sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env
    else
        echo "NODE_ENV=production" | sudo tee -a .env
    fi
fi

# ==========================================
# STEP 5: START BACKEND AS UBUNTU USER
# ==========================================
echo -e "\n${BLUE}STEP 5: Starting Backend (Single Instance)${NC}"

sudo -u ubuntu bash << 'EOFBASH'
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
export HOME=/home/ubuntu

# Start with PM2 as ubuntu user - single instance, no watch
pm2 start npm --name "myaiagent-backend" -- start \
  --instances 1 \
  --watch false \
  --max-memory-restart 500M \
  --time

pm2 save --force
EOFBASH

echo -e "${GREEN}✅ Backend started${NC}"

# ==========================================
# STEP 6: WAIT AND VERIFY STARTUP
# ==========================================
echo -e "\n${BLUE}STEP 6: Waiting for backend to stabilize...${NC}"

sleep 15

# Check PM2 status
echo "PM2 Status:"
sudo -u ubuntu pm2 status myaiagent-backend

# Check restarts
RESTARTS=$(sudo -u ubuntu pm2 jlist | jq '.[0].pm2_env.restart_time // 0')
if [ "$RESTARTS" -gt 2 ]; then
    echo -e "${RED}❌ Backend has crashed $RESTARTS times!${NC}"
    echo "Error logs:"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 50 --nostream
    exit 1
else
    echo -e "${GREEN}✅ Backend stable (restarts: $RESTARTS)${NC}"
fi

# Check port 5000
if sudo lsof -i:5000 | grep -q LISTEN; then
    echo -e "${GREEN}✅ Backend listening on port 5000${NC}"
else
    echo -e "${RED}❌ Backend NOT listening on port 5000${NC}"
    sudo -u ubuntu pm2 logs myaiagent-backend --lines 50 --nostream
    exit 1
fi

# ==========================================
# STEP 7: TEST BACKEND DIRECTLY
# ==========================================
echo -e "\n${BLUE}STEP 7: Testing Backend Directly${NC}"

# Test health endpoint
HEALTH=$(curl -s http://localhost:5000/health)
if echo "$HEALTH" | jq -e '.status' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health endpoint: $(echo $HEALTH | jq -r .status)${NC}"
else
    echo -e "${RED}❌ Health endpoint failed${NC}"
    exit 1
fi

# Test CSRF endpoint through nginx
CSRF=$(curl -s https://werkules.com/api/csrf-token)
if echo "$CSRF" | jq -e '.csrfToken' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CSRF endpoint working through nginx${NC}"
else
    echo -e "${RED}❌ CSRF endpoint failed${NC}"
    echo "$CSRF"
    exit 1
fi

# ==========================================
# STEP 8: TEST COMPLETE AUTH FLOW
# ==========================================
echo -e "\n${BLUE}STEP 8: Testing Complete Authentication Flow${NC}"

rm -f /tmp/complete-test.txt

# Get CSRF token
echo "  → Getting CSRF token..."
CSRF_TOKEN=$(curl -s -c /tmp/complete-test.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)
if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" == "null" ]; then
    echo -e "${RED}  ❌ Failed to get CSRF token${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ CSRF token obtained${NC}"

# Login
echo "  → Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/complete-test.txt \
  -c /tmp/complete-test.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}  ❌ Login failed with HTTP $HTTP_CODE${NC}"
    echo "$RESPONSE_BODY" | jq '.'
    exit 1
fi

if ! echo "$RESPONSE_BODY" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${RED}  ❌ Login response invalid${NC}"
    echo "$RESPONSE_BODY" | jq '.'
    exit 1
fi

echo -e "${GREEN}  ✅ Login successful${NC}"
echo "     User: $(echo $RESPONSE_BODY | jq -r .user.email)"
echo "     Role: $(echo $RESPONSE_BODY | jq -r .user.role)"

# Check JWT cookie was set
echo "  → Verifying JWT cookie..."
if ! grep -q "jwt" /tmp/complete-test.txt; then
    echo -e "${RED}  ❌ JWT cookie not set!${NC}"
    echo "Cookies in file:"
    cat /tmp/complete-test.txt
    exit 1
fi

JWT_COOKIE=$(grep "jwt" /tmp/complete-test.txt | awk '{print $NF}')
echo -e "${GREEN}  ✅ JWT cookie set: ${JWT_COOKIE:0:50}...${NC}"

# Wait for cookie to propagate
sleep 3

# Test protected endpoint /api/auth/me
echo "  → Testing /api/auth/me (protected endpoint)..."
ME_RESPONSE=$(curl -s -w "\n%{http_code}" https://werkules.com/api/auth/me \
  -H "Origin: https://werkules.com" \
  -b /tmp/complete-test.txt)

ME_HTTP_CODE=$(echo "$ME_RESPONSE" | tail -1)
ME_BODY=$(echo "$ME_RESPONSE" | head -n -1)

if [ "$ME_HTTP_CODE" != "200" ]; then
    echo -e "${RED}  ❌ Protected endpoint returned HTTP $ME_HTTP_CODE${NC}"
    echo "$ME_BODY" | jq '.'

    echo -e "\n${YELLOW}Debugging:${NC}"
    echo "Cookies being sent:"
    grep "jwt" /tmp/complete-test.txt

    echo -e "\nBackend logs:"
    sudo -u ubuntu pm2 logs myaiagent-backend --lines 30 --nostream
    exit 1
fi

if ! echo "$ME_BODY" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${RED}  ❌ /api/auth/me response invalid${NC}"
    echo "$ME_BODY" | jq '.'
    exit 1
fi

echo -e "${GREEN}  ✅✅✅ USER STAYS LOGGED IN!${NC}"
echo "     Email: $(echo $ME_BODY | jq -r .user.email)"
echo "     Role: $(echo $ME_BODY | jq -r .user.role)"

# Test another protected endpoint
echo "  → Testing /api/auth/preferences..."
PREFS_RESPONSE=$(curl -s -w "\n%{http_code}" https://werkules.com/api/auth/preferences \
  -b /tmp/complete-test.txt)

PREFS_HTTP_CODE=$(echo "$PREFS_RESPONSE" | tail -1)

if [ "$PREFS_HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}  ✅ Preferences endpoint working${NC}"
else
    echo -e "${YELLOW}  ⚠️  Preferences returned HTTP $PREFS_HTTP_CODE${NC}"
fi

# ==========================================
# STEP 9: VERIFY BACKEND ROUTING
# ==========================================
echo -e "\n${BLUE}STEP 9: Verifying Backend Receives Correct Routes${NC}"

echo "Recent backend logs (should show /api/auth/*):"
sudo -u ubuntu pm2 logs myaiagent-backend --lines 30 --nostream | grep -E "POST|GET" | tail -10

echo -e "\n${YELLOW}Expected to see:${NC}"
echo -e "  ${GREEN}✅ POST /api/auth/login - 200${NC}"
echo -e "  ${GREEN}✅ GET /api/auth/me - 200${NC}"
echo -e "  ${GREEN}✅ GET /api/auth/preferences - 200${NC}"

echo -e "\n${YELLOW}Should NOT see:${NC}"
echo -e "  ${RED}❌ POST /login - 200${NC}"
echo -e "  ${RED}❌ GET /me - 401${NC}"

# ==========================================
# FINAL SUMMARY
# ==========================================
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 COMPLETE FIX SUCCESSFUL!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${BLUE}✅ Backend Status:${NC}"
sudo -u ubuntu pm2 list

echo -e "\n${BLUE}✅ What Was Fixed:${NC}"
echo -e "  ✓ Nginx proxy_pass configuration"
echo -e "  ✓ Database google_id column"
echo -e "  ✓ Backend environment variables"
echo -e "  ✓ PM2 single instance (no crashes)"
echo -e "  ✓ Port 5000 conflicts resolved"
echo -e "  ✓ JWT cookie authentication"
echo -e "  ✓ Protected endpoints working"

echo -e "\n${BLUE}🌐 TEST IN BROWSER NOW:${NC}"
echo -e "1. Open: ${YELLOW}https://werkules.com/login${NC}"
echo -e "2. Open DevTools (F12)"
echo -e "3. Go to: Application → Cookies → werkules.com"
echo -e "4. Click '${YELLOW}Clear All${NC}'"
echo -e "5. Login with:"
echo -e "   Email: ${YELLOW}admin@myaiagent.com${NC}"
echo -e "   Password: ${YELLOW}admin123${NC}"
echo -e "6. Should ${GREEN}STAY LOGGED IN${NC} and redirect to dashboard"
echo -e "7. Test navigation:"
echo -e "   - Go to SAM.gov Opportunities"
echo -e "   - Click on an opportunity"
echo -e "   - Verify charts display"
echo -e "   - Create new conversation"
echo -e "   - Check if you ${GREEN}remain logged in${NC}"

echo -e "\n${BLUE}📊 If Still Having Issues:${NC}"
echo -e "1. Check browser console for errors (F12 → Console)"
echo -e "2. Check Network tab for failed requests"
echo -e "3. Verify cookies are being set (Application → Cookies)"
echo -e "4. Check backend logs: ${YELLOW}sudo -u ubuntu pm2 logs myaiagent-backend${NC}"
echo ""
