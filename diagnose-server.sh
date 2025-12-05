#!/bin/bash

# ===========================================
# COMPREHENSIVE SERVER DIAGNOSTIC SCRIPT
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔍 COMPREHENSIVE SERVER DIAGNOSTIC${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# ==========================================
# 1. CHECK BACKEND STATUS
# ==========================================
echo -e "${BLUE}STEP 1: Checking Backend Status...${NC}"
echo ""

# Check PM2 status
echo "PM2 Process Status:"
sudo -u ubuntu pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) (pid: \(.pid), uptime: \(.pm2_env.pm_uptime_format // "N/A"))"'

# Check if backend is listening on port 5000
echo ""
echo "Port 5000 Status:"
if netstat -tlnp 2>/dev/null | grep -q ":5000 "; then
    echo -e "${GREEN}✅ Port 5000 is listening${NC}"
    netstat -tlnp 2>/dev/null | grep ":5000 "
else
    echo -e "${RED}❌ Port 5000 is NOT listening${NC}"
    echo "Backend might not be running or running on different port"
fi

# Check nginx status
echo ""
echo "Nginx Status:"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is NOT running${NC}"
fi

# ==========================================
# 2. CHECK BACKEND LOGS
# ==========================================
echo -e "\n${BLUE}STEP 2: Checking Backend Logs (last 50 lines)...${NC}"
echo ""
sudo -u ubuntu pm2 logs myaiagent-backend --nostream --lines 50 | tail -50

# ==========================================
# 3. CHECK ENVIRONMENT VARIABLES
# ==========================================
echo -e "\n${BLUE}STEP 3: Checking Environment Variables...${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Check if .env file exists
if [ -f .env ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    echo ""
    echo "Environment variables status:"

    # Check critical env vars (without revealing values)
    ENV_VARS=("JWT_SECRET" "CSRF_SECRET" "HMAC_SECRET" "DATABASE_URL" "NODE_ENV" "PORT" "ENCRYPTION_KEY")

    for var in "${ENV_VARS[@]}"; do
        if grep -q "^${var}=" .env 2>/dev/null; then
            VALUE=$(grep "^${var}=" .env | cut -d'=' -f2 | head -c 20)
            echo -e "  ${GREEN}✅ $var${NC}: ${VALUE}... (set)"
        else
            echo -e "  ${RED}❌ $var${NC}: NOT SET"
        fi
    done
else
    echo -e "${RED}❌ .env file NOT FOUND${NC}"
    echo "Backend will not have required environment variables!"
fi

# ==========================================
# 4. TEST LOCALHOST ENDPOINTS
# ==========================================
echo -e "\n${BLUE}STEP 4: Testing Backend on localhost:5000...${NC}"
echo ""

# Test health endpoint on localhost
echo "Testing /health endpoint:"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/health || echo "000")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HEALTH_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Health check working${NC}"
    echo "$HEALTH_BODY" | jq '.' 2>/dev/null || echo "$HEALTH_BODY"
else
    echo -e "${RED}❌ Health check failed: HTTP $HEALTH_CODE${NC}"
    echo "$HEALTH_BODY"
fi

# Test CSRF token endpoint on localhost
echo ""
echo "Testing /api/csrf-token endpoint on localhost:5000:"
CSRF_RESPONSE=$(curl -s -w "\n%{http_code}" -c /tmp/csrf-test.txt http://localhost:5000/api/csrf-token || echo "000")
CSRF_CODE=$(echo "$CSRF_RESPONSE" | tail -1)
CSRF_BODY=$(echo "$CSRF_RESPONSE" | head -n -1)

if [ "$CSRF_CODE" == "200" ]; then
    echo -e "${GREEN}✅ CSRF token endpoint working on localhost${NC}"
    CSRF_TOKEN=$(echo "$CSRF_BODY" | jq -r '.csrfToken' 2>/dev/null || echo "")
    if [ -n "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "null" ]; then
        echo "CSRF Token: ${CSRF_TOKEN:0:40}..."

        # Check for csrf-token cookie
        if grep -q "csrf-token" /tmp/csrf-test.txt 2>/dev/null; then
            echo -e "${GREEN}✅ CSRF cookie set${NC}"
            grep "csrf-token" /tmp/csrf-test.txt
        else
            echo -e "${RED}❌ CSRF cookie NOT set${NC}"
        fi
    else
        echo -e "${RED}❌ CSRF token is empty or null${NC}"
        echo "$CSRF_BODY"
    fi
else
    echo -e "${RED}❌ CSRF token endpoint failed: HTTP $CSRF_CODE${NC}"
    echo "$CSRF_BODY"
fi

# ==========================================
# 5. TEST THROUGH NGINX
# ==========================================
echo -e "\n${BLUE}STEP 5: Testing Through Nginx (werkules.com)...${NC}"
echo ""

# Test CSRF through nginx
echo "Testing /api/csrf-token through nginx:"
CSRF_NGINX_RESPONSE=$(curl -s -w "\n%{http_code}" -c /tmp/csrf-nginx.txt https://werkules.com/api/csrf-token || echo "000")
CSRF_NGINX_CODE=$(echo "$CSRF_NGINX_RESPONSE" | tail -1)
CSRF_NGINX_BODY=$(echo "$CSRF_NGINX_RESPONSE" | head -n -1)

if [ "$CSRF_NGINX_CODE" == "200" ]; then
    echo -e "${GREEN}✅ CSRF endpoint working through nginx${NC}"
    echo "$CSRF_NGINX_BODY" | jq '.' 2>/dev/null || echo "$CSRF_NGINX_BODY"
else
    echo -e "${RED}❌ CSRF endpoint failed through nginx: HTTP $CSRF_NGINX_CODE${NC}"
    echo "$CSRF_NGINX_BODY"

    # Check nginx error logs
    echo ""
    echo "Nginx error logs (last 20 lines):"
    sudo tail -20 /var/log/nginx/error.log 2>/dev/null || echo "Cannot read nginx error logs"
fi

# ==========================================
# 6. CHECK DATABASE CONNECTION
# ==========================================
echo -e "\n${BLUE}STEP 6: Checking Database...${NC}"
echo ""

echo "Database connection:"
if sudo -u postgres psql -d myaiagent -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection working${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
fi

echo ""
echo "API Keys in database:"
sudo -u postgres psql -d myaiagent -c "SELECT service_name, key_type, is_active FROM api_secrets WHERE is_active = true ORDER BY service_name;" || echo "Failed to query api_secrets"

echo ""
echo "User count:"
sudo -u postgres psql -d myaiagent -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ' || echo "0"

# ==========================================
# 7. TEST GEMINI API KEY RETRIEVAL
# ==========================================
echo -e "\n${BLUE}STEP 7: Testing Gemini API Key Retrieval...${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Create test script
cat > /tmp/test-gemini-key.js << 'EOFJS'
import { getApiKey } from './src/utils/apiKeys.js';

async function test() {
  try {
    console.log('Testing Gemini API key...');
    const key = await getApiKey('gemini');
    if (key) {
      console.log(`✅ Gemini key found: ${key.substring(0, 20)}...`);
    } else {
      console.log('❌ Gemini key NOT found');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  try {
    console.log('\nTesting SAM.gov API key...');
    const key = await getApiKey('samgov');
    if (key) {
      console.log(`✅ SAM.gov key found: ${key.substring(0, 20)}...`);
    } else {
      console.log('❌ SAM.gov key NOT found');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  process.exit(0);
}

test();
EOFJS

node /tmp/test-gemini-key.js 2>&1
rm -f /tmp/test-gemini-key.js

# ==========================================
# 8. CHECK NGINX CONFIGURATION
# ==========================================
echo -e "\n${BLUE}STEP 8: Checking Nginx Configuration...${NC}"
echo ""

echo "Nginx config test:"
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    sudo nginx -t 2>&1
fi

echo ""
echo "Active nginx sites:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "Cannot list sites-enabled"

# ==========================================
# 9. TEST FULL AUTHENTICATION FLOW
# ==========================================
echo -e "\n${BLUE}STEP 9: Testing Full Authentication Flow...${NC}"
echo ""

# Get CSRF token
echo "Step 1: Getting CSRF token..."
rm -f /tmp/fulltest.txt
CSRF=$(curl -s -c /tmp/fulltest.txt https://werkules.com/api/csrf-token | jq -r '.csrfToken' 2>/dev/null || echo "")

if [ -z "$CSRF" ] || [ "$CSRF" == "null" ]; then
    echo -e "${RED}❌ Cannot get CSRF token - authentication flow blocked${NC}"
else
    echo -e "${GREEN}✅ CSRF token: ${CSRF:0:40}...${NC}"

    # Try login
    echo ""
    echo "Step 2: Testing login..."
    LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://werkules.com/api/auth/login \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: $CSRF" \
        -H "Origin: https://werkules.com" \
        -b /tmp/fulltest.txt \
        -c /tmp/fulltest.txt \
        -d '{"email":"admin@myaiagent.com","password":"admin123"}' || echo "000")

    LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
    LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)

    if [ "$LOGIN_CODE" == "200" ]; then
        echo -e "${GREEN}✅ Login successful${NC}"
        echo "$LOGIN_BODY" | jq '.user | {id, email, role}' 2>/dev/null || echo "Login response received"

        # Check for JWT cookie
        if grep -q "jwt=" /tmp/fulltest.txt 2>/dev/null; then
            echo -e "${GREEN}✅ JWT cookie set${NC}"
        else
            echo -e "${RED}❌ JWT cookie NOT set${NC}"
        fi

        # Test protected endpoint
        echo ""
        echo "Step 3: Testing protected endpoint (/api/auth/me)..."
        ME_RESPONSE=$(curl -s -w "\n%{http_code}" https://werkules.com/api/auth/me \
            -H "Origin: https://werkules.com" \
            -b /tmp/fulltest.txt || echo "000")

        ME_CODE=$(echo "$ME_RESPONSE" | tail -1)
        ME_BODY=$(echo "$ME_RESPONSE" | head -n -1)

        if [ "$ME_CODE" == "200" ]; then
            echo -e "${GREEN}✅✅✅ AUTHENTICATION FULLY WORKING!${NC}"
            echo "$ME_BODY" | jq '.' 2>/dev/null || echo "$ME_BODY"
        else
            echo -e "${RED}❌ Protected endpoint failed: HTTP $ME_CODE${NC}"
            echo "$ME_BODY"
        fi
    else
        echo -e "${RED}❌ Login failed: HTTP $LOGIN_CODE${NC}"
        echo "$LOGIN_BODY" | jq '.' 2>/dev/null || echo "$LOGIN_BODY"
    fi
fi

# ==========================================
# FINAL SUMMARY
# ==========================================
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}📊 DIAGNOSTIC SUMMARY${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${BLUE}🔍 Check the results above to identify issues:${NC}"
echo ""
echo -e "1. Backend Status: PM2 should show 'online'"
echo -e "2. Port 5000: Should be listening"
echo -e "3. Nginx: Should be running"
echo -e "4. Environment: JWT_SECRET, CSRF_SECRET, etc. should be set"
echo -e "5. Backend Logs: Check for errors"
echo -e "6. CSRF Token: Should work on both localhost and through nginx"
echo -e "7. Database: Should be accessible"
echo -e "8. API Keys: Gemini and SAM.gov keys should be found"
echo -e "9. Authentication: Login should work and set JWT cookie"
echo ""

echo -e "${YELLOW}🔧 Common Issues and Fixes:${NC}"
echo ""
echo -e "❌ Port 5000 not listening:"
echo -e "   → Backend crashed or not running"
echo -e "   → Fix: sudo -u ubuntu pm2 restart myaiagent-backend"
echo ""
echo -e "❌ CSRF token fails on localhost but works through nginx:"
echo -e "   → CORS or cookie configuration issue"
echo -e "   → Check server.js CORS settings"
echo ""
echo -e "❌ Environment variables missing:"
echo -e "   → .env file not loaded or missing"
echo -e "   → Fix: Copy .env.example to .env and set values"
echo ""
echo -e "❌ Database connection fails:"
echo -e "   → PostgreSQL not running or DATABASE_URL wrong"
echo -e "   → Fix: sudo systemctl start postgresql"
echo ""
echo -e "❌ API keys not found:"
echo -e "   → Keys not added via Admin Dashboard"
echo -e "   → Fix: Add keys at https://werkules.com/admin/secrets"
echo ""

rm -f /tmp/csrf-test.txt /tmp/csrf-nginx.txt /tmp/fulltest.txt

echo -e "${GREEN}✅ Diagnostic complete!${NC}"
echo ""
