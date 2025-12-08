#!/bin/bash

# ===========================================
# FIX OPPORTUNITIES AND CHAT - COMPREHENSIVE
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 FIX OPPORTUNITIES AND CHAT${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# ==========================================
# 1. RUN DATABASE MIGRATION
# ==========================================
echo -e "${BLUE}STEP 1: Running database migration...${NC}"

sudo -u postgres psql -d myaiagent << 'EOFMIGRATION'

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create all missing tables (key tables only - focuses on what's needed)

-- SAM.gov Opportunities Cache
CREATE TABLE IF NOT EXISTS samgov_opportunities_cache (
  id SERIAL PRIMARY KEY,
  notice_id VARCHAR(255) UNIQUE NOT NULL,
  solicitation_number VARCHAR(255),
  title TEXT NOT NULL,
  type VARCHAR(100),
  posted_date TIMESTAMP,
  response_deadline TIMESTAMP,
  archive_date TIMESTAMP,
  naics_code VARCHAR(50),
  set_aside_type VARCHAR(100),
  contracting_office TEXT,
  place_of_performance TEXT,
  description TEXT,
  raw_data JSONB NOT NULL,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  seen_count INTEGER DEFAULT 1 NOT NULL,
  opportunity_id INTEGER,
  created_by UUID,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_samgov_cache_notice_id ON samgov_opportunities_cache(notice_id);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_posted_date ON samgov_opportunities_cache(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_raw_data ON samgov_opportunities_cache USING GIN (raw_data);

-- SAM.gov Search History
CREATE TABLE IF NOT EXISTS samgov_search_history (
  id SERIAL PRIMARY KEY,
  keyword TEXT,
  posted_from DATE,
  posted_to DATE,
  naics_code VARCHAR(50),
  total_records INTEGER,
  new_records INTEGER,
  existing_records INTEGER,
  searched_by UUID,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  search_params JSONB
);

CREATE INDEX IF NOT EXISTS idx_samgov_search_date ON samgov_search_history(searched_at DESC);

-- Opportunities Management
CREATE TABLE IF NOT EXISTS opportunities (
  id SERIAL PRIMARY KEY,
  notice_id VARCHAR(255) UNIQUE NOT NULL,
  solicitation_number VARCHAR(255),
  title TEXT NOT NULL,
  type VARCHAR(100),
  posted_date TIMESTAMP,
  response_deadline TIMESTAMP,
  naics_code VARCHAR(50),
  set_aside_type VARCHAR(100),
  contracting_office TEXT,
  place_of_performance TEXT,
  description TEXT,
  raw_data JSONB,
  internal_status VARCHAR(50) NOT NULL DEFAULT 'New',
  assigned_to UUID,
  internal_score INTEGER,
  internal_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_sync_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(internal_status);
CREATE INDEX IF NOT EXISTS idx_opportunities_notice_id ON opportunities(notice_id);

-- Email Processing Queue
CREATE TABLE IF NOT EXISTS email_processing_queue (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  gmail_message_id VARCHAR(255) NOT NULL,
  subject TEXT,
  sender VARCHAR(500),
  body_preview TEXT,
  priority INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  last_error TEXT,
  UNIQUE(user_id, gmail_message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_processing_queue(status);

-- Telemetry
CREATE TABLE IF NOT EXISTS telemetry_errors (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    error_type VARCHAR(100),
    error_message TEXT,
    error_stack TEXT,
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telemetry_events (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    scope TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

EOFMIGRATION

echo -e "${GREEN}✅ Database migration complete${NC}"

# ==========================================
# 2. RESTART BACKEND
# ==========================================
echo -e "\n${BLUE}STEP 2: Restarting backend...${NC}"

sudo -u ubuntu pm2 restart myaiagent-backend
sleep 8

# Check status
PM2_STATUS=$(sudo -u ubuntu pm2 jlist | jq '.[0].pm2_env.status' -r)
if [ "$PM2_STATUS" == "online" ]; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream
    exit 1
fi

# ==========================================
# 3. TEST OPPORTUNITIES ENDPOINT
# ==========================================
echo -e "\n${BLUE}STEP 3: Testing SAM.gov opportunities...${NC}"

# Create test cookies
rm -f /tmp/test-all.txt

# Get CSRF token
CSRF_TOKEN=$(curl -s -c /tmp/test-all.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)

if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" == "null" ]; then
    echo -e "${RED}❌ Failed to get CSRF token${NC}"
    exit 1
fi

echo "CSRF token: ${CSRF_TOKEN:0:40}..."

# Login
LOGIN_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-all.txt \
  -c /tmp/test-all.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if ! echo "$LOGIN_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

echo -e "${GREEN}✅ Logged in as admin${NC}"

sleep 2

# Test opportunities endpoint
echo -e "\nTesting /api/sam-gov/cached-opportunities..."

OPP_RESPONSE=$(curl -s -w "\n%{http_code}" https://werkules.com/api/sam-gov/cached-opportunities?limit=10 \
  -b /tmp/test-all.txt)

OPP_HTTP_CODE=$(echo "$OPP_RESPONSE" | tail -1)
OPP_BODY=$(echo "$OPP_RESPONSE" | head -n -1)

if [ "$OPP_HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Opportunities endpoint working!${NC}"

    # Check if we got data
    OPP_COUNT=$(echo "$OPP_BODY" | jq 'length // .opportunities | length // 0')
    echo "Found $OPP_COUNT opportunities"

    if [ "$OPP_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No opportunities in cache yet (this is normal for first time)${NC}"
        echo "Response: $OPP_BODY" | jq '.'
    else
        echo "Sample opportunity:"
        echo "$OPP_BODY" | jq '.[0] // .opportunities[0] | {title, notice_id, posted_date}'
    fi
else
    echo -e "${RED}❌ Opportunities endpoint failed with HTTP $OPP_HTTP_CODE${NC}"
    echo "$OPP_BODY" | jq '.'

    echo -e "\n${YELLOW}Backend error logs:${NC}"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream | tail -20
    exit 1
fi

# ==========================================
# 4. TEST CHAT/CONVERSATIONS
# ==========================================
echo -e "\n${BLUE}STEP 4: Testing chat/conversations...${NC}"

# Test get conversations
echo "Testing GET /api/conversations..."
CONV_RESPONSE=$(curl -s -w "\n%{http_code}" https://werkules.com/api/conversations \
  -b /tmp/test-all.txt)

CONV_HTTP_CODE=$(echo "$CONV_RESPONSE" | tail -1)
CONV_BODY=$(echo "$CONV_RESPONSE" | head -n -1)

if [ "$CONV_HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Conversations endpoint working!${NC}"

    CONV_COUNT=$(echo "$CONV_BODY" | jq 'length // .conversations | length // 0')
    echo "Found $CONV_COUNT conversations"
else
    echo -e "${RED}❌ Conversations endpoint failed with HTTP $CONV_HTTP_CODE${NC}"
    echo "$CONV_BODY" | jq '.'

    echo -e "\n${YELLOW}Backend error logs:${NC}"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream | tail -20
fi

# Test create conversation
echo -e "\nTesting POST /api/conversations (create new)..."
NEW_CONV=$(curl -s -w "\n%{http_code}" -X POST https://werkules.com/api/conversations \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b /tmp/test-all.txt \
  -d '{"title":"Test Conversation","model":"gpt-4o"}')

NEW_CONV_HTTP=$(echo "$NEW_CONV" | tail -1)
NEW_CONV_BODY=$(echo "$NEW_CONV" | head -n -1)

if [ "$NEW_CONV_HTTP" == "201" ] || [ "$NEW_CONV_HTTP" == "200" ]; then
    echo -e "${GREEN}✅ Create conversation working!${NC}"
    CONV_ID=$(echo "$NEW_CONV_BODY" | jq -r '.id // .conversation.id')
    echo "Created conversation ID: $CONV_ID"
else
    echo -e "${RED}❌ Create conversation failed with HTTP $NEW_CONV_HTTP${NC}"
    echo "$NEW_CONV_BODY" | jq '.'
fi

# ==========================================
# 5. CHECK BACKEND LOGS
# ==========================================
echo -e "\n${BLUE}STEP 5: Recent backend logs...${NC}"
sudo -u ubuntu pm2 logs myaiagent-backend --lines 20 --nostream | tail -15

# ==========================================
# FINAL SUMMARY
# ==========================================
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 Fix and Test Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${BLUE}✅ What was fixed:${NC}"
echo -e "  ✓ Database tables created (samgov_opportunities_cache, opportunities, etc.)"
echo -e "  ✓ Backend restarted"
echo -e "  ✓ Authentication working"
echo -e "  ✓ Opportunities endpoint tested"
echo -e "  ✓ Chat/conversations endpoint tested"

echo -e "\n${YELLOW}Test in Browser:${NC}"
echo -e "1. Go to: ${BLUE}https://werkules.com${NC}"
echo -e "2. Clear cookies (F12 → Application → Cookies → Clear All)"
echo -e "3. Login: ${BLUE}admin@myaiagent.com / admin123${NC}"
echo -e "4. Test:"
echo -e "   - Navigate to ${BLUE}SAM.gov Opportunities${NC}"
echo -e "   - Create a ${BLUE}New Conversation${NC}"
echo -e "   - Send a message in chat"
echo -e "   - Check if opportunities load"

echo -e "\n${BLUE}If opportunities show empty:${NC}"
echo -e "  - This is normal for first time"
echo -e "  - Click ${YELLOW}'Search Opportunities'${NC} or ${YELLOW}'Refresh'${NC} button"
echo -e "  - Backend will fetch from SAM.gov API and cache them"

echo ""
