#!/bin/bash

# ===========================================
# FIX ALL COMMON ISSUES
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 FIX ALL COMMON ISSUES${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# ==========================================
# 1. ENSURE BACKEND HAS CORRECT ENV VARS
# ==========================================
echo -e "${BLUE}STEP 1: Checking Backend Environment...${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found - creating from .env.example${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please edit .env and set your values${NC}"
    else
        echo -e "${RED}❌ .env.example also not found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Check critical env vars
echo ""
echo "Verifying critical environment variables..."

MISSING_VARS=()

if ! grep -q "^JWT_SECRET=" .env 2>/dev/null || [ -z "$(grep "^JWT_SECRET=" .env | cut -d'=' -f2)" ]; then
    MISSING_VARS+=("JWT_SECRET")
fi

if ! grep -q "^CSRF_SECRET=" .env 2>/dev/null && ! grep -q "^HMAC_SECRET=" .env 2>/dev/null; then
    MISSING_VARS+=("CSRF_SECRET")
fi

if ! grep -q "^ENCRYPTION_KEY=" .env 2>/dev/null || [ -z "$(grep "^ENCRYPTION_KEY=" .env | cut -d'=' -f2)" ]; then
    MISSING_VARS+=("ENCRYPTION_KEY")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing environment variables: ${MISSING_VARS[*]}${NC}"
    echo ""
    echo "Generating missing secrets..."

    for var in "${MISSING_VARS[@]}"; do
        SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
        if [ "$var" == "CSRF_SECRET" ]; then
            echo "CSRF_SECRET=$SECRET" >> .env
        else
            echo "$var=$SECRET" >> .env
        fi
        echo -e "${GREEN}✅ Generated $var${NC}"
    done

    # Ensure DATABASE_URL is set
    if ! grep -q "^DATABASE_URL=" .env 2>/dev/null; then
        echo "DATABASE_URL=postgres://postgres:password@localhost:5432/myaiagent" >> .env
        echo -e "${YELLOW}⚠️  Added default DATABASE_URL - update if needed${NC}"
    fi

    # Ensure NODE_ENV is set
    if ! grep -q "^NODE_ENV=" .env 2>/dev/null; then
        echo "NODE_ENV=production" >> .env
        echo -e "${GREEN}✅ Set NODE_ENV=production${NC}"
    fi

    # Ensure PORT is set
    if ! grep -q "^PORT=" .env 2>/dev/null; then
        echo "PORT=5000" >> .env
        echo -e "${GREEN}✅ Set PORT=5000${NC}"
    fi
else
    echo -e "${GREEN}✅ All critical environment variables are set${NC}"
fi

# ==========================================
# 2. ENSURE NGINX IS PROPERLY CONFIGURED
# ==========================================
echo -e "\n${BLUE}STEP 2: Checking Nginx Configuration...${NC}"
echo ""

# Check if werkules.com nginx config exists
if [ -f /etc/nginx/sites-available/werkules.com ]; then
    echo -e "${GREEN}✅ werkules.com nginx config exists${NC}"

    # Ensure it's enabled
    if [ ! -L /etc/nginx/sites-enabled/werkules.com ]; then
        echo "Enabling werkules.com site..."
        sudo ln -sf /etc/nginx/sites-available/werkules.com /etc/nginx/sites-enabled/
        echo -e "${GREEN}✅ Site enabled${NC}"
    else
        echo -e "${GREEN}✅ Site already enabled${NC}"
    fi

    # Test nginx config
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    else
        echo -e "${RED}❌ Nginx configuration has errors:${NC}"
        sudo nginx -t 2>&1
        exit 1
    fi

    # Reload nginx
    echo "Reloading nginx..."
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx reloaded${NC}"
else
    echo -e "${YELLOW}⚠️  werkules.com nginx config not found${NC}"
    echo "Using default nginx configuration"
fi

# ==========================================
# 3. RESTART BACKEND WITH NEW CONFIG
# ==========================================
echo -e "\n${BLUE}STEP 3: Restarting Backend...${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Restart backend
echo "Restarting backend..."
sudo -u ubuntu pm2 restart myaiagent-backend --update-env
sleep 5

# Check status
PM2_STATUS=$(sudo -u ubuntu pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")

if [ "$PM2_STATUS" == "online" ]; then
    echo -e "${GREEN}✅ Backend is running${NC}"

    # Show recent logs
    echo ""
    echo "Recent backend logs:"
    sudo -u ubuntu pm2 logs myaiagent-backend --nostream --lines 20 | tail -20
else
    echo -e "${RED}❌ Backend failed to start!${NC}"
    echo ""
    echo "Error logs:"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --nostream --lines 30
    exit 1
fi

# ==========================================
# 4. TEST ENDPOINTS
# ==========================================
echo -e "\n${BLUE}STEP 4: Testing Endpoints...${NC}"
echo ""

sleep 3

# Test health endpoint
echo "Testing /health..."
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://werkules.com/health)
if [ "$HEALTH_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Health endpoint working${NC}"
else
    echo -e "${RED}❌ Health endpoint failed: HTTP $HEALTH_CODE${NC}"
fi

# Test CSRF endpoint
echo "Testing /api/csrf-token..."
CSRF_RESPONSE=$(curl -s https://werkules.com/api/csrf-token)
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken' 2>/dev/null || echo "")

if [ -n "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "null" ]; then
    echo -e "${GREEN}✅✅✅ CSRF TOKEN WORKING!${NC}"
    echo "CSRF Token: ${CSRF_TOKEN:0:40}..."
else
    echo -e "${RED}❌ CSRF token failed${NC}"
    echo "Response: $CSRF_RESPONSE"

    echo ""
    echo "Checking backend logs for errors..."
    sudo -u ubuntu pm2 logs myaiagent-backend --err --nostream --lines 20
fi

# ==========================================
# 5. TEST DATABASE
# ==========================================
echo -e "\n${BLUE}STEP 5: Testing Database...${NC}"
echo ""

if sudo -u postgres psql -d myaiagent -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection working${NC}"

    # Check API keys
    echo ""
    echo "API Keys in database:"
    sudo -u postgres psql -d myaiagent -t -c "SELECT service_name FROM api_secrets WHERE is_active = true;" | tr -d ' ' | sort
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
    sleep 2

    if sudo -u postgres psql -d myaiagent -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database now working${NC}"
    else
        echo -e "${RED}❌ Database still not working${NC}"
    fi
fi

# ==========================================
# FINAL STATUS
# ==========================================
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ FIXES COMPLETE${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${BLUE}🧪 Test the application:${NC}"
echo ""
echo -e "1. Open browser: ${YELLOW}https://werkules.com${NC}"
echo -e "2. Clear cookies (F12 → Application → Cookies → Clear All)"
echo -e "3. Login: ${YELLOW}admin@myaiagent.com / admin123${NC}"
echo -e "4. Try chat - should work with Gemini"
echo -e "5. Check SAM.gov opportunities - should load"
echo ""

echo -e "${BLUE}📊 For detailed diagnostics, run:${NC}"
echo -e "   ${YELLOW}sudo ./diagnose-server.sh${NC}"
echo ""
