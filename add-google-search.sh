#!/bin/bash

# ===========================================
# ADD GOOGLE SEARCH API CREDENTIALS
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 ADD GOOGLE SEARCH API CREDENTIALS${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

GOOGLE_SEARCH_API_KEY="AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls"
GOOGLE_SEARCH_ENGINE_ID="d4fcebd01520d41a0"

echo -e "${GREEN}✅ Using provided credentials${NC}"
echo ""

# ==========================================
# 1. ADD KEYS TO DATABASE
# ==========================================
echo -e "${BLUE}STEP 1: Adding Google Search credentials to database...${NC}"

# Auto-detect backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR=""

if [ -d "$SCRIPT_DIR/myaiagent-mvp/backend" ]; then
  BACKEND_DIR="$SCRIPT_DIR/myaiagent-mvp/backend"
elif [ -d "/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend" ]; then
  BACKEND_DIR="/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend"
elif [ -d "/home/user/MY_AI_AGENT/myaiagent-mvp/backend" ]; then
  BACKEND_DIR="/home/user/MY_AI_AGENT/myaiagent-mvp/backend"
fi

if [ -z "$BACKEND_DIR" ] || [ ! -d "$BACKEND_DIR" ]; then
  echo -e "${RED}❌ Backend directory not found${NC}"
  exit 1
fi

cd "$BACKEND_DIR"

cat > add-google-search-temp.js << 'EOFJS'
import { encryptSecret } from './src/services/secrets.js';
import { query } from './src/utils/database.js';

async function addKeys() {
  try {
    const apiKey = process.argv[2];
    const searchEngineId = process.argv[3];

    console.log('🔐 Encrypting Google Search API key...');
    const encryptedApiKey = encryptSecret(apiKey);

    console.log('🔐 Encrypting Search Engine ID...');
    const encryptedSearchEngineId = encryptSecret(searchEngineId);

    // Add API Key
    console.log('📝 Adding GOOGLE_SEARCH_API_KEY...');
    await query(
      `INSERT INTO api_secrets (
        service_name, key_name, key_value, key_label, is_default, is_active
      ) VALUES (
        'Google', 'GOOGLE_SEARCH_API_KEY', $1, 'Production API Key', true, true
      )
      ON CONFLICT (service_name, key_name)
      DO UPDATE SET
        key_value = EXCLUDED.key_value,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP`,
      [encryptedApiKey]
    );
    console.log('✅ GOOGLE_SEARCH_API_KEY added\n');

    // Add Search Engine ID
    console.log('📝 Adding GOOGLE_SEARCH_ENGINE_ID...');
    await query(
      `INSERT INTO api_secrets (
        service_name, key_name, key_value, key_label, is_default, is_active
      ) VALUES (
        'Google', 'GOOGLE_SEARCH_ENGINE_ID', $1, 'Custom Search Engine ID', true, true
      )
      ON CONFLICT (service_name, key_name)
      DO UPDATE SET
        key_value = EXCLUDED.key_value,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP`,
      [encryptedSearchEngineId]
    );
    console.log('✅ GOOGLE_SEARCH_ENGINE_ID added\n');

    // Verify
    console.log('🔍 Verifying credentials...');
    const result = await query(
      `SELECT key_name, key_label, is_active, created_at
       FROM api_secrets
       WHERE key_name IN ('GOOGLE_SEARCH_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID')
       ORDER BY key_name`
    );

    console.log('\n📊 Current Google Search credentials in database:');
    console.table(result.rows);

    console.log('\n✅ All Google Search credentials added successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addKeys();
EOFJS

node add-google-search-temp.js "$GOOGLE_SEARCH_API_KEY" "$GOOGLE_SEARCH_ENGINE_ID"
rm add-google-search-temp.js

echo -e "${GREEN}✅ Google Search credentials added to database${NC}"

# ==========================================
# FINAL SUMMARY
# ==========================================
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 GOOGLE SEARCH SETUP COMPLETE!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${BLUE}✅ What was added:${NC}"
echo -e "  ✓ Google Search API Key: AIza...9Ls"
echo -e "  ✓ Custom Search Engine ID: d4fc...1a0"
echo ""

echo -e "${BLUE}🎯 Next steps:${NC}"
echo -e "  1. Test web search in chat: ${YELLOW}'what time is it in New York'${NC}"
echo -e "  2. Check backend logs for confirmation"
echo ""
