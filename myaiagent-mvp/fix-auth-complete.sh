#!/bin/bash

# ===========================================
# COMPLETE AUTHENTICATION FIX
# ===========================================
# Fixes all login, signup, and session issues

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 Complete Authentication Fix${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# 1. Backup nginx config
echo -e "${BLUE}Step 1: Backing up nginx config...${NC}"
sudo cp /etc/nginx/sites-available/myaiagent \
     /etc/nginx/sites-available/myaiagent.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✅ Nginx config backed up${NC}"

# 2. Fix nginx proxy_pass
echo -e "\n${BLUE}Step 2: Fixing nginx proxy_pass...${NC}"
sudo sed -i 's|proxy_pass http://localhost:5000;|proxy_pass http://localhost:5000/api/;|g' \
  /etc/nginx/sites-available/myaiagent

# Verify the change
if sudo grep -q "proxy_pass http://localhost:5000/api/;" /etc/nginx/sites-available/myaiagent; then
    echo -e "${GREEN}✅ Nginx proxy_pass fixed${NC}"
else
    echo -e "${YELLOW}⚠️  Manual edit needed - please check nginx config${NC}"
fi

# 3. Test nginx config
echo -e "\n${BLUE}Step 3: Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx config is valid${NC}"
else
    echo -e "${RED}❌ Nginx config has errors${NC}"
    exit 1
fi

# 4. Reload nginx
echo -e "\n${BLUE}Step 4: Reloading nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"

# 5. Check backend status
echo -e "\n${BLUE}Step 5: Checking backend status...${NC}"
pm2 status | grep myaiagent-backend

# 6. Restart backend to clear any cached state
echo -e "\n${BLUE}Step 6: Restarting backend...${NC}"
pm2 restart myaiagent-backend
sleep 3
echo -e "${GREEN}✅ Backend restarted${NC}"

# 7. Test CSRF endpoint
echo -e "\n${BLUE}Step 7: Testing CSRF endpoint...${NC}"
CSRF_RESPONSE=$(curl -s -c /tmp/cookies.txt https://werkules.com/api/csrf-token)
if echo "$CSRF_RESPONSE" | jq -e '.csrfToken' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CSRF endpoint working${NC}"
    CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r .csrfToken)
    echo "   Token: ${CSRF_TOKEN:0:40}..."
else
    echo -e "${RED}❌ CSRF endpoint failed${NC}"
    echo "$CSRF_RESPONSE"
fi

# 8. Test admin login
echo -e "\n${BLUE}Step 8: Testing admin login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/cookies.txt \
  -c /tmp/cookies.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Admin login successful${NC}"
    echo "$LOGIN_RESPONSE" | jq '.user | {email, fullName, role}'
else
    echo -e "${RED}❌ Admin login failed${NC}"
    echo "$LOGIN_RESPONSE" | jq '.'
fi

# 9. Check JWT cookie
echo -e "\n${BLUE}Step 9: Checking JWT cookie...${NC}"
if cat /tmp/cookies.txt | grep -q jwt; then
    echo -e "${GREEN}✅ JWT cookie set${NC}"
    cat /tmp/cookies.txt | grep jwt
else
    echo -e "${YELLOW}⚠️  JWT cookie not found${NC}"
fi

# 10. Test protected endpoint
echo -e "\n${BLUE}Step 10: Testing protected endpoint...${NC}"
ME_RESPONSE=$(curl -s https://werkules.com/api/auth/me -b /tmp/cookies.txt)
if echo "$ME_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Protected endpoint working${NC}"
else
    echo -e "${YELLOW}⚠️  Protected endpoint check failed (may need fresh login)${NC}"
fi

# 11. Check recent logs
echo -e "\n${BLUE}Step 11: Checking recent backend logs...${NC}"
pm2 logs myaiagent-backend --lines 10 --nostream | grep -E "POST.*auth|login|signup" || true

# Summary
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 Authentication Fix Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Clear browser cookies: DevTools → Application → Cookies → Clear All"
echo -e "2. Test login: ${YELLOW}https://werkules.com/login${NC}"
echo -e "3. Use credentials: ${YELLOW}admin@myaiagent.com / admin123${NC}"
echo ""
echo -e "${BLUE}Monitoring:${NC}"
echo -e "- Backend logs: ${YELLOW}pm2 logs myaiagent-backend${NC}"
echo -e "- Nginx logs: ${YELLOW}sudo tail -f /var/log/nginx/access.log${NC}"
echo ""
echo -e "${BLUE}Expected log pattern (GOOD):${NC}"
echo -e "  ${GREEN}POST /api/auth/login - 200${NC}"
echo ""
echo -e "${BLUE}Bad log pattern (still broken):${NC}"
echo -e "  ${RED}POST /login - 401${NC}  (nginx still stripping /api)"
echo ""
