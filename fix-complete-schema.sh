#!/bin/bash

# ===========================================
# COMPLETE DATABASE SCHEMA FIX
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 COMPLETE DATABASE SCHEMA FIX${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Show current schema
echo -e "${BLUE}Current users table schema:${NC}"
sudo -u postgres psql -d myaiagent -c "\d users"

echo -e "\n${BLUE}Running complete migration...${NC}"

# Run complete migration to add ALL missing columns
sudo -u postgres psql -d myaiagent << 'EOFMIGRATION'

-- Add missing columns to users table
DO $$
BEGIN
    -- Add phone column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(50);
        RAISE NOTICE '✅ Added phone column';
    ELSE
        RAISE NOTICE '✓ phone column already exists';
    END IF;

    -- Add profile_image column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'profile_image'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_image TEXT;
        RAISE NOTICE '✅ Added profile_image column';
    ELSE
        RAISE NOTICE '✓ profile_image column already exists';
    END IF;

    -- Add google_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'google_id'
    ) THEN
        ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
        RAISE NOTICE '✅ Added google_id column';
    ELSE
        RAISE NOTICE '✓ google_id column already exists';
    END IF;

    -- Add settings column if missing (for user preferences)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'settings'
    ) THEN
        ALTER TABLE users ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Added settings column';
    ELSE
        RAISE NOTICE '✓ settings column already exists';
    END IF;

    -- Add preferences column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'preferences'
    ) THEN
        ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Added preferences column';
    ELSE
        RAISE NOTICE '✓ preferences column already exists';
    END IF;

    -- Add last_login_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
        RAISE NOTICE '✅ Added last_login_at column';
    ELSE
        RAISE NOTICE '✓ last_login_at column already exists';
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added updated_at column';
    ELSE
        RAISE NOTICE '✓ updated_at column already exists';
    END IF;

    -- Add email_verified column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added email_verified column';
    ELSE
        RAISE NOTICE '✓ email_verified column already exists';
    END IF;

END $$;

-- Verify all columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

EOFMIGRATION

echo -e "\n${GREEN}✅ Database migration complete${NC}"

# Restart backend to pick up schema changes
echo -e "\n${BLUE}Restarting backend...${NC}"
sudo -u ubuntu pm2 restart myaiagent-backend
sleep 5

echo -e "${GREEN}✅ Backend restarted${NC}"

# Test authentication again
echo -e "\n${BLUE}Testing authentication...${NC}"

rm -f /tmp/schema-test.txt

# Get CSRF
CSRF=$(curl -s -c /tmp/schema-test.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)
echo "CSRF: ${CSRF:0:40}..."

# Login
LOGIN=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Origin: https://werkules.com" \
  -b /tmp/schema-test.txt \
  -c /tmp/schema-test.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if echo "$LOGIN" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Login successful${NC}"
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN" | jq '.'
    exit 1
fi

sleep 2

# Test protected endpoint
ME=$(curl -s https://werkules.com/api/auth/me -b /tmp/schema-test.txt)

if echo "$ME" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅✅✅ SUCCESS! USER STAYS LOGGED IN!${NC}"
    echo "$ME" | jq '{email: .user.email, role: .user.role}'
else
    echo -e "${RED}❌ Protected endpoint failed${NC}"
    echo "$ME" | jq '.'

    echo -e "\n${YELLOW}Backend error logs:${NC}"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream
    exit 1
fi

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 COMPLETE FIX SUCCESSFUL!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "All database columns added:"
echo -e "  ✓ phone"
echo -e "  ✓ profile_image"
echo -e "  ✓ google_id"
echo -e "  ✓ settings"
echo -e "  ✓ preferences"
echo -e "  ✓ last_login_at"
echo -e "  ✓ updated_at"
echo -e "  ✓ email_verified"
echo ""
echo -e "${YELLOW}TEST IN BROWSER:${NC}"
echo -e "1. Go to: https://werkules.com/login"
echo -e "2. Clear cookies (F12 → Application → Cookies → Clear All)"
echo -e "3. Login: admin@myaiagent.com / admin123"
echo -e "4. Should ${GREEN}STAY LOGGED IN${NC} ✅"
echo ""
