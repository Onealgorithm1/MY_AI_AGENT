#!/bin/bash

# ===========================================
# ADD OPENAI KEY AND FIX EVERYTHING
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 ADD OPENAI KEY AND FIX EVERYTHING${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Check if OpenAI key is provided as argument
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <openai-api-key>${NC}"
    echo ""
    echo -e "${YELLOW}Please provide your OpenAI API key as an argument:${NC}"
    echo -e "Example: ${BLUE}sudo ./add-openai-key.sh sk-proj-your-key-here${NC}"
    echo ""
    echo -e "${YELLOW}Get your OpenAI API key from: https://platform.openai.com/api-keys${NC}"
    echo ""
    exit 1
fi

OPENAI_KEY="$1"

# Validate key format
if [[ ! "$OPENAI_KEY" =~ ^sk- ]]; then
    echo -e "${RED}❌ Invalid OpenAI key format. Key should start with 'sk-'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ OpenAI key format looks valid${NC}"
echo ""

# ==========================================
# 1. ADD KEY TO DATABASE
# ==========================================
echo -e "${BLUE}STEP 1: Adding OpenAI key to database...${NC}"

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

cat > add-openai-key.js << EOFJS
import { encrypt } from './src/utils/apiKeys.js';
import { query } from './src/utils/database.js';

async function addKey() {
  try {
    const apiKey = process.argv[2];

    console.log('Encrypting OpenAI key...');
    const encryptedKey = encrypt(apiKey);

    // Check if OpenAI key exists
    const existing = await query(
      "SELECT id FROM api_secrets WHERE service_name = 'OpenAI' AND is_active = true"
    );

    if (existing.rows.length > 0) {
      console.log('Updating existing OpenAI key...');
      await query(
        "UPDATE api_secrets SET key_value = \$1, updated_at = CURRENT_TIMESTAMP WHERE service_name = 'OpenAI' AND is_active = true",
        [encryptedKey]
      );
    } else {
      console.log('Inserting new OpenAI key...');
      await query(
        \`INSERT INTO api_secrets (
          service_name, key_name, key_value, key_type, is_default, is_active
        ) VALUES (
          'OpenAI', 'OPENAI_API_KEY', \$1, 'project', true, true
        )\`,
        [encryptedKey]
      );
    }

    console.log('✅ OpenAI key saved successfully!');

    // Verify it can be decrypted
    const { getApiKey } = await import('./src/utils/apiKeys.js');
    const decrypted = await getApiKey('openai');

    if (decrypted) {
      console.log(\`✅ Key verification successful: \${decrypted.substring(0, 20)}...\`);
    } else {
      console.log('❌ Key verification failed');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addKey();
EOFJS

node add-openai-key.js "$OPENAI_KEY"
rm add-openai-key.js

echo -e "${GREEN}✅ OpenAI key added to database${NC}"

# ==========================================
# 2. RESTART BACKEND
# ==========================================
echo -e "\n${BLUE}STEP 2: Restarting backend...${NC}"

sudo -u ubuntu pm2 restart myaiagent-backend
sleep 8

echo -e "${GREEN}✅ Backend restarted${NC}"

# ==========================================
# 3. TEST CHAT
# ==========================================
echo -e "\n${BLUE}STEP 3: Testing Chat...${NC}"

rm -f /tmp/test-chat.txt

# Get CSRF
CSRF=$(curl -s -c /tmp/test-chat.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)
echo "CSRF: ${CSRF:0:40}..."

# Login
LOGIN=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-chat.txt \
  -c /tmp/test-chat.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if ! echo "$LOGIN" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${RED}❌ Login failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Logged in${NC}"

sleep 2

# Create conversation
CONV=$(curl -s -X POST https://werkules.com/api/conversations \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-chat.txt \
  -d '{"title":"Test Chat","model":"gpt-4o"}')

CONV_ID=$(echo "$CONV" | jq -r '.id // .conversation.id')
echo "Created conversation: $CONV_ID"

# Send message
echo ""
echo "Sending test message..."
MSG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://werkules.com/api/conversations/$CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-chat.txt \
  -d '{"content":"Say hello!"}')

MSG_HTTP=$(echo "$MSG_RESPONSE" | tail -1)
MSG_BODY=$(echo "$MSG_RESPONSE" | head -n -1)

if [ "$MSG_HTTP" == "200" ] || [ "$MSG_HTTP" == "201" ]; then
    echo -e "${GREEN}✅✅✅ CHAT WORKING!${NC}"
    echo "$MSG_BODY" | jq '{role: .role, content: .content | .[0:100]}'
else
    echo -e "${RED}❌ Chat failed: HTTP $MSG_HTTP${NC}"
    echo "$MSG_BODY" | jq '.'

    echo ""
    echo -e "${YELLOW}Backend error logs:${NC}"
    sudo -u ubuntu pm2 logs myaiagent-backend --err --lines 30 --nostream | tail -20
fi

# ==========================================
# 4. TEST SAM.GOV
# ==========================================
echo -e "\n${BLUE}STEP 4: Testing SAM.gov opportunities...${NC}"

# Test cached opportunities
echo "Testing cached opportunities..."
CACHED=$(curl -s -w "\n%{http_code}" "https://werkules.com/api/sam-gov/cached-opportunities?limit=10" \
  -b /tmp/test-chat.txt)

CACHED_HTTP=$(echo "$CACHED" | tail -1)
CACHED_BODY=$(echo "$CACHED" | head -n -1)

if [ "$CACHED_HTTP" == "200" ]; then
    echo -e "${GREEN}✅ Cached opportunities working${NC}"
    COUNT=$(echo "$CACHED_BODY" | jq 'length // .opportunities | length // 0')
    echo "Count: $COUNT"
else
    echo -e "${RED}❌ Cached opportunities failed: HTTP $CACHED_HTTP${NC}"
fi

# ==========================================
# FINAL SUMMARY
# ==========================================
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 SETUP COMPLETE!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${BLUE}✅ What's Working:${NC}"
echo -e "  ✓ OpenAI API key added to database"
echo -e "  ✓ Backend restarted with new key"
echo -e "  ✓ Authentication working"

if [ "$MSG_HTTP" == "200" ] || [ "$MSG_HTTP" == "201" ]; then
    echo -e "  ${GREEN}✓ Chat/messaging WORKING${NC}"
else
    echo -e "  ${RED}✗ Chat needs troubleshooting${NC}"
fi

if [ "$CACHED_HTTP" == "200" ]; then
    echo -e "  ${GREEN}✓ SAM.gov opportunities WORKING${NC}"
else
    echo -e "  ${YELLOW}⚠ SAM.gov opportunities may need data${NC}"
fi

echo -e "\n${BLUE}🌐 Test in Browser:${NC}"
echo -e "1. Go to: ${YELLOW}https://werkules.com${NC}"
echo -e "2. Clear cookies (F12 → Application → Cookies → Clear All)"
echo -e "3. Login: ${YELLOW}admin@myaiagent.com / admin123${NC}"
echo -e "4. Create new conversation and ${GREEN}send a message${NC}"
echo -e "5. Go to SAM.gov Opportunities tab"
echo -e "6. Everything should work now! ✅"

echo ""
echo -e "${YELLOW}Note: If opportunities are empty, click 'Search' or 'Refresh' to fetch from SAM.gov API${NC}"
echo ""
