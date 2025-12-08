#!/bin/bash

# ===========================================
# ADD MISSING google_id COLUMN TO users TABLE
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 Adding google_id Column to Users Table${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Add google_id column to users table
echo -e "${BLUE}Adding google_id column...${NC}"

sudo -u postgres psql -d myaiagent << 'EOFPSQL'
-- Add google_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'google_id'
    ) THEN
        ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
        RAISE NOTICE 'google_id column added successfully';
    ELSE
        RAISE NOTICE 'google_id column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'google_id';
EOFPSQL

echo -e "${GREEN}✅ Database schema updated${NC}"

# Restart backend to clear any cached state
echo -e "\n${BLUE}Restarting backend...${NC}"
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
pm2 restart myaiagent-backend
sleep 3
echo -e "${GREEN}✅ Backend restarted${NC}"

# Test the authentication flow
echo -e "\n${BLUE}Testing authentication flow...${NC}"

# Clean cookies
rm -f /tmp/test-cookies.txt

# Get CSRF token
echo "  - Getting CSRF token..."
CSRF_TOKEN=$(curl -s -c /tmp/test-cookies.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)
echo "    Token: ${CSRF_TOKEN:0:40}..."

# Login
echo "  - Logging in..."
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

# Wait a moment for cookie to propagate
sleep 1

# Test protected endpoint
echo "  - Testing protected endpoint (/api/auth/me)..."
ME_RESPONSE=$(curl -s https://werkules.com/api/auth/me -b /tmp/test-cookies.txt)

if echo "$ME_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Protected endpoint working - USER STAYS LOGGED IN!${NC}"
    echo "$ME_RESPONSE" | jq '{email: .user.email, role: .user.role}'
else
    echo -e "${RED}❌ Protected endpoint failed${NC}"
    echo "$ME_RESPONSE" | jq '.'
    exit 1
fi

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 Fix Complete - Authentication Working!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${BLUE}Test in browser:${NC}"
echo -e "1. Clear browser cookies: DevTools → Application → Cookies → Clear All"
echo -e "2. Go to: ${BLUE}https://werkules.com/login${NC}"
echo -e "3. Login: ${BLUE}admin@myaiagent.com / admin123${NC}"
echo -e "4. Should redirect to dashboard and ${GREEN}STAY LOGGED IN${NC}"
echo ""
