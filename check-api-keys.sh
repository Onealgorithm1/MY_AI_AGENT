#!/bin/bash

# ===========================================
# CHECK AND FIX API KEYS IN DATABASE
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔍 CHECK API KEYS IN DATABASE${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Check what's in api_secrets table
echo -e "${BLUE}Current API keys in database:${NC}"
sudo -u postgres psql -d myaiagent << 'EOFSQL'

SELECT
    id,
    service_name,
    key_name,
    key_type,
    is_default,
    is_active,
    LEFT(key_value, 50) || '...' as encrypted_value,
    created_at
FROM api_secrets
ORDER BY service_name, created_at DESC;

EOFSQL

# Count keys by service
echo -e "\n${BLUE}Keys count by service:${NC}"
sudo -u postgres psql -d myaiagent -c "SELECT service_name, COUNT(*) as count, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM api_secrets GROUP BY service_name ORDER BY service_name;"

# Check if OpenAI key exists
echo -e "\n${BLUE}Checking OpenAI keys specifically:${NC}"
OPENAI_COUNT=$(sudo -u postgres psql -d myaiagent -t -c "SELECT COUNT(*) FROM api_secrets WHERE service_name = 'OpenAI' AND is_active = true")

if [ "$OPENAI_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No active OpenAI keys found in database!${NC}"
    echo ""
    echo -e "${YELLOW}The admin dashboard might be saving with different service_name.${NC}"
    echo -e "${YELLOW}Expected: 'OpenAI' (case-sensitive)${NC}"
    echo ""

    # Show what service names exist
    echo "Service names in database:"
    sudo -u postgres psql -d myaiagent -c "SELECT DISTINCT service_name FROM api_secrets ORDER BY service_name;"
else
    echo -e "${GREEN}✅ Found $OPENAI_COUNT active OpenAI key(s)${NC}"
fi

# Test decryption (run a quick node script)
echo -e "\n${BLUE}Testing API key decryption...${NC}"

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

cat > test-api-keys.js << 'EOFJS'
import { getApiKey } from './src/utils/apiKeys.js';

async function testKeys() {
  console.log('Testing API key retrieval from database...\n');

  const providers = ['openai', 'samgov', 'google', 'anthropic'];

  for (const provider of providers) {
    try {
      const key = await getApiKey(provider);
      if (key) {
        console.log(`✅ ${provider}: ${key.substring(0, 20)}... (length: ${key.length})`);
      } else {
        console.log(`❌ ${provider}: No key found`);
      }
    } catch (error) {
      console.log(`❌ ${provider}: Error - ${error.message}`);
    }
  }

  process.exit(0);
}

testKeys();
EOFJS

node test-api-keys.js
rm test-api-keys.js

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ Diagnostic Complete${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
