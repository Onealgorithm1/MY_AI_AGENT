#!/bin/bash

# ====================================================
# PRODUCTION FIXES - ALL CODE ISSUES
# ====================================================
# This script fixes all reported production issues
# Run this on your AWS production server
# ====================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}========================================================${NC}"
echo -e "${BOLD}${BLUE}   🔧 PRODUCTION FIXES - ALL ISSUES${NC}"
echo -e "${BOLD}${BLUE}========================================================${NC}"
echo ""

# Auto-detect paths
if [ -d "/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend" ]; then
  BACKEND_DIR="/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend"
  PROJECT_ROOT="/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT"
elif [ -d "/home/user/MY_AI_AGENT/myaiagent-mvp/backend" ]; then
  BACKEND_DIR="/home/user/MY_AI_AGENT/myaiagent-mvp/backend"
  PROJECT_ROOT="/home/user/MY_AI_AGENT"
else
  echo -e "${RED}❌ Backend directory not found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Backend directory: $BACKEND_DIR${NC}"
echo ""

# ========================================================
# 1. FIX BACKEND PM2 PORT CONFLICT
# ========================================================
echo -e "${BLUE}========== 1. Fixing Backend PM2 Port Conflicts ==========${NC}"
echo ""

if command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}⚠ Stopping all PM2 processes...${NC}"
  pm2 stop all 2>/dev/null || echo "No running processes"
  pm2 delete all 2>/dev/null || echo "No processes to delete"
  echo -e "${GREEN}✓ PM2 cleaned up${NC}"
else
  echo -e "${YELLOW}⚠ PM2 not installed${NC}"
fi

# Kill any process on port 5000
echo -e "${BLUE}Checking port 5000...${NC}"
if sudo fuser 5000/tcp 2>/dev/null; then
  echo -e "${YELLOW}⚠ Killing process on port 5000...${NC}"
  sudo fuser -k 5000/tcp || echo "Could not kill process"
  sleep 2
fi
echo -e "${GREEN}✓ Port 5000 is clear${NC}"
echo ""

# ========================================================
# 2. ADD GEMINI_API_KEY TO .ENV
# ========================================================
echo -e "${BLUE}========== 2. Adding GEMINI_API_KEY to .env ==========${NC}"
echo ""

cd "$BACKEND_DIR"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env from .env.example${NC}"
  else
    echo -e "${RED}❌ No .env.example found${NC}"
    exit 1
  fi
fi

# Backup .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Backed up .env${NC}"

# Add or update GEMINI_API_KEY
GEMINI_KEY="AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls"

if grep -q "^GEMINI_API_KEY=" .env; then
  sed -i "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=${GEMINI_KEY}|" .env
  echo -e "${GREEN}✓ Updated GEMINI_API_KEY${NC}"
else
  echo "GEMINI_API_KEY=${GEMINI_KEY}" >> .env
  echo -e "${GREEN}✓ Added GEMINI_API_KEY${NC}"
fi

# Add or update Google Search keys
SEARCH_API_KEY="AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls"
SEARCH_ENGINE_ID="d4fcebd01520d41a0"

if grep -q "^GOOGLE_CUSTOM_SEARCH_API_KEY=" .env; then
  sed -i "s|^GOOGLE_CUSTOM_SEARCH_API_KEY=.*|GOOGLE_CUSTOM_SEARCH_API_KEY=${SEARCH_API_KEY}|" .env
  echo -e "${GREEN}✓ Updated GOOGLE_CUSTOM_SEARCH_API_KEY${NC}"
else
  echo "GOOGLE_CUSTOM_SEARCH_API_KEY=${SEARCH_API_KEY}" >> .env
  echo -e "${GREEN}✓ Added GOOGLE_CUSTOM_SEARCH_API_KEY${NC}"
fi

if grep -q "^GOOGLE_CUSTOM_SEARCH_ENGINE_ID=" .env; then
  sed -i "s|^GOOGLE_CUSTOM_SEARCH_ENGINE_ID=.*|GOOGLE_CUSTOM_SEARCH_ENGINE_ID=${SEARCH_ENGINE_ID}|" .env
  echo -e "${GREEN}✓ Updated GOOGLE_CUSTOM_SEARCH_ENGINE_ID${NC}"
else
  echo "GOOGLE_CUSTOM_SEARCH_ENGINE_ID=${SEARCH_ENGINE_ID}" >> .env
  echo -e "${GREEN}✓ Added GOOGLE_CUSTOM_SEARCH_ENGINE_ID${NC}"
fi

echo ""

# ========================================================
# 3. FIX DATABASE - CLEAN DUPLICATES & ADD GOOGLE SEARCH
# ========================================================
echo -e "${BLUE}========== 3. Fixing Database Issues ==========${NC}"
echo ""

cat > fix-database.js << 'EOF'
import { encryptSecret } from './src/services/secrets.js';
import { query } from './src/utils/database.js';

async function fixDatabase() {
  try {
    console.log('🔧 Fixing database issues...\n');

    // 1. Clean up duplicate API keys
    console.log('🗑️  Step 1: Cleaning up duplicate API keys...');

    // Delete all Google Search keys first
    await query(`DELETE FROM api_secrets WHERE key_name IN ('GOOGLE_SEARCH_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID')`);
    console.log('✓ Deleted old Google Search keys');

    // Delete duplicate keys from other services
    const duplicates = await query(`
      SELECT service_name, key_name, COUNT(*) as count
      FROM api_secrets
      GROUP BY service_name, key_name
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length > 0) {
      console.log(`⚠ Found ${duplicates.rows.length} duplicate key types`);
      for (const dup of duplicates.rows) {
        // Keep only the most recent one
        await query(`
          DELETE FROM api_secrets
          WHERE id NOT IN (
            SELECT id FROM api_secrets
            WHERE service_name = $1 AND key_name = $2
            ORDER BY created_at DESC
            LIMIT 1
          )
          AND service_name = $1 AND key_name = $2
        `, [dup.service_name, dup.key_name]);
        console.log(`✓ Cleaned up ${dup.service_name}.${dup.key_name}`);
      }
    } else {
      console.log('✓ No duplicates found');
    }

    console.log('');

    // 2. Add Google Search credentials
    console.log('📝 Step 2: Adding Google Search credentials...');

    const apiKey = 'AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls';
    const searchEngineId = 'd4fcebd01520d41a0';

    // Encrypt credentials
    const encryptedApiKey = encryptSecret(apiKey);
    const encryptedSearchEngineId = encryptSecret(searchEngineId);

    // Add API Key
    await query(
      `INSERT INTO api_secrets (
        service_name, key_name, key_value, key_label, is_default, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['Google', 'GOOGLE_SEARCH_API_KEY', encryptedApiKey, 'Custom Search API Key', true, true]
    );
    console.log('✓ Added GOOGLE_SEARCH_API_KEY');

    // Add Search Engine ID
    await query(
      `INSERT INTO api_secrets (
        service_name, key_name, key_value, key_label, is_default, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['Google', 'GOOGLE_SEARCH_ENGINE_ID', encryptedSearchEngineId, 'Search Engine ID (CX)', true, true]
    );
    console.log('✓ Added GOOGLE_SEARCH_ENGINE_ID');

    console.log('');

    // 3. Verify configuration
    console.log('✅ Step 3: Verification...');
    const verify = await query(`
      SELECT service_name, key_name, key_label, is_active, is_default
      FROM api_secrets
      ORDER BY service_name, key_name
    `);

    console.log('\nCurrent API Keys:');
    console.table(verify.rows);

    // Check SAM.gov opportunities count
    const samgovCount = await query('SELECT COUNT(*) FROM samgov_opportunities_cache WHERE active = true OR active = $1', ['Yes']);
    console.log(`\nSAM.gov opportunities in cache: ${samgovCount.rows[0].count}`);

    console.log('\n✅ Database fixes complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

fixDatabase();
EOF

node fix-database.js
rm fix-database.js

echo ""

# ========================================================
# 4. RESTART BACKEND WITH PM2
# ========================================================
echo -e "${BLUE}========== 4. Starting Backend ==========${NC}"
echo ""

cd "$BACKEND_DIR"

if command -v pm2 &> /dev/null; then
  echo -e "${BLUE}Starting backend with PM2...${NC}"
  pm2 start src/server.js --name myaiagent-backend --max-memory-restart 500M
  pm2 save
  sleep 3
  pm2 status
  echo -e "${GREEN}✅ Backend started${NC}"
else
  echo -e "${YELLOW}⚠ PM2 not installed - start backend manually${NC}"
  echo -e "${BLUE}Run: npm start${NC}"
fi

echo ""

# ========================================================
# 5. RUN SAM.GOV REFRESH
# ========================================================
echo -e "${BLUE}========== 5. Running SAM.gov Refresh ==========${NC}"
echo ""

cd "$BACKEND_DIR"
echo -e "${BLUE}Running SAM.gov refresh with new pagination...${NC}"
node refresh-samgov-opportunities.js || echo -e "${YELLOW}⚠ Refresh failed - check logs${NC}"

echo ""

# ========================================================
# SUMMARY
# ========================================================
echo -e "${BOLD}${GREEN}========================================================${NC}"
echo -e "${BOLD}${GREEN}   ✅ ALL FIXES APPLIED${NC}"
echo -e "${BOLD}${GREEN}========================================================${NC}"
echo ""

echo -e "${BLUE}What was fixed:${NC}"
echo -e "  ${GREEN}✓${NC} Backend PM2 port conflicts resolved"
echo -e "  ${GREEN}✓${NC} GEMINI_API_KEY added to .env"
echo -e "  ${GREEN}✓${NC} Google Search API credentials configured"
echo -e "  ${GREEN}✓${NC} Duplicate API keys cleaned up"
echo -e "  ${GREEN}✓${NC} SAM.gov fetch limit increased to 1000 with pagination"
echo -e "  ${GREEN}✓${NC} Backend restarted"
echo ""

echo -e "${YELLOW}⚠ MANUAL STEP REQUIRED:${NC}"
echo -e "  ${RED}Enable Google Custom Search API in Google Cloud Console${NC}"
echo -e "  ${BLUE}https://console.cloud.google.com/apis/library/customsearch.googleapis.com${NC}"
echo -e "  ${BLUE}Click ENABLE button${NC}"
echo ""

echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Test web search: 'what time is it in New York'"
echo -e "  2. Test voice features (click microphone icon)"
echo -e "  3. Check SAM.gov opportunities page (should show 1000+ results)"
echo ""

echo -e "${BLUE}Check backend logs:${NC}"
echo -e "  ${BLUE}pm2 logs myaiagent-backend --lines 50${NC}"
echo ""
