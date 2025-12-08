#!/bin/bash

# ===========================================
# FIX NGINX CONFIGURATION PROPERLY
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 Fixing Nginx Configuration${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# 1. Check current nginx config
echo -e "${BLUE}1. Current nginx proxy_pass configuration:${NC}"
sudo grep -A 2 "location /api" /etc/nginx/sites-available/myaiagent

# 2. Backup current config
echo -e "\n${BLUE}2. Backing up current nginx config...${NC}"
sudo cp /etc/nginx/sites-available/myaiagent \
     /etc/nginx/sites-available/myaiagent.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✅ Backup created${NC}"

# 3. Fix the proxy_pass line
echo -e "\n${BLUE}3. Fixing proxy_pass configuration...${NC}"

# This sed command will change:
#   proxy_pass http://localhost:5000;
# To:
#   proxy_pass http://localhost:5000/api/;
#
# The trailing /api/ is CRITICAL - it tells nginx to preserve the /api prefix

sudo sed -i 's|proxy_pass http://localhost:5000;|proxy_pass http://localhost:5000/api/;|g' \
  /etc/nginx/sites-available/myaiagent

# Also fix if it's already set to just /api (without trailing slash)
sudo sed -i 's|proxy_pass http://localhost:5000/api;|proxy_pass http://localhost:5000/api/;|g' \
  /etc/nginx/sites-available/myaiagent

# 4. Verify the change
echo -e "\n${BLUE}4. Verifying new configuration:${NC}"
if sudo grep -q "proxy_pass http://localhost:5000/api/;" /etc/nginx/sites-available/myaiagent; then
    echo -e "${GREEN}✅ proxy_pass correctly set to: http://localhost:5000/api/${NC}"
    sudo grep -A 2 "location /api" /etc/nginx/sites-available/myaiagent
else
    echo -e "${RED}❌ proxy_pass not updated correctly${NC}"
    echo -e "${YELLOW}Manual fix needed. Run:${NC}"
    echo -e "sudo nano /etc/nginx/sites-available/myaiagent"
    echo -e "Change proxy_pass line to: proxy_pass http://localhost:5000/api/;"
    exit 1
fi

# 5. Test nginx configuration
echo -e "\n${BLUE}5. Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx config is valid${NC}"
else
    echo -e "${RED}❌ Nginx config has errors${NC}"
    exit 1
fi

# 6. Reload nginx
echo -e "\n${BLUE}6. Reloading nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"

# 7. Wait a moment for nginx to fully reload
sleep 2

# 8. Test the endpoints
echo -e "\n${BLUE}7. Testing endpoints...${NC}"

# Clear cookies
rm -f /tmp/test-cookies.txt

# Get CSRF token
echo "  - Testing CSRF endpoint..."
CSRF_RESPONSE=$(curl -s -c /tmp/test-cookies.txt https://werkules.com/api/csrf-token)
if echo "$CSRF_RESPONSE" | jq -e '.csrfToken' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CSRF endpoint working${NC}"
    CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r .csrfToken)
else
    echo -e "${RED}❌ CSRF endpoint failed${NC}"
    echo "$CSRF_RESPONSE"
    exit 1
fi

# Login
echo "  - Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-cookies.txt \
  -c /tmp/test-cookies.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "$LOGIN_RESPONSE" | jq '{user: .user.email, role: .user.role}'
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

# Check JWT cookie
echo "  - Checking JWT cookie..."
if grep -q "jwt" /tmp/test-cookies.txt; then
    echo -e "${GREEN}✅ JWT cookie set${NC}"
else
    echo -e "${RED}❌ JWT cookie not set${NC}"
fi

# Wait for cookie to settle
sleep 1

# Test protected endpoint
echo "  - Testing protected endpoint (/api/auth/me)..."
ME_RESPONSE=$(curl -s https://werkules.com/api/auth/me -b /tmp/test-cookies.txt)

if echo "$ME_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅✅✅ PROTECTED ENDPOINT WORKING - USER STAYS LOGGED IN!${NC}"
    echo "$ME_RESPONSE" | jq '{email: .user.email, role: .user.role}'
else
    echo -e "${RED}❌ Protected endpoint failed${NC}"
    echo "$ME_RESPONSE" | jq '.'
fi

# 9. Check backend logs for proper routing
echo -e "\n${BLUE}8. Checking backend logs for proper routing...${NC}"
echo "Recent requests (should show /api/auth/login and /api/auth/me):"
pm2 logs myaiagent-backend --lines 20 --nostream | grep -E "POST|GET" | tail -10

echo -e "\n${YELLOW}Look for:${NC}"
echo -e "  ${GREEN}✅ POST /api/auth/login - 200${NC}   (CORRECT - includes /api)"
echo -e "  ${GREEN}✅ GET /api/auth/me - 200${NC}       (CORRECT - includes /api)"
echo -e "  ${RED}❌ POST /login - 200${NC}            (WRONG - missing /api)"
echo -e "  ${RED}❌ GET /me - 401${NC}                (WRONG - missing /api)"

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 Nginx Fix Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${BLUE}If test passed, try in browser:${NC}"
echo -e "1. Clear browser cookies"
echo -e "2. Go to: ${YELLOW}https://werkules.com/login${NC}"
echo -e "3. Login: ${YELLOW}admin@myaiagent.com / admin123${NC}"
echo -e "4. Should ${GREEN}STAY LOGGED IN${NC}!"
echo ""
