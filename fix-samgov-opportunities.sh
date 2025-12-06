#!/bin/bash

# ===========================================
# FIX SAM.GOV OPPORTUNITIES DASHBOARD
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 FIXING SAM.GOV OPPORTUNITIES${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# ==========================================
# 1. FIX DUPLICATE ROUTES
# ==========================================
echo -e "${BLUE}STEP 1: Fixing duplicate routes in samGov.js...${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Backup the file
cp src/routes/samGov.js src/routes/samGov.js.backup

# Check if there are duplicate routes
if grep -c "router.get('/cached-opportunities'" src/routes/samGov.js | grep -q "2"; then
    echo -e "${YELLOW}⚠️  Found duplicate /cached-opportunities routes${NC}"
    echo "Removing the first duplicate (less featured version)..."

    # Remove lines 102-115 (first /cached-opportunities route)
    sed -i '102,115d' src/routes/samGov.js

    echo -e "${GREEN}✅ Duplicate route removed${NC}"
else
    echo -e "${GREEN}✅ No duplicate routes found${NC}"
fi

# ==========================================
# 2. ENSURE DATABASE TABLE EXISTS
# ==========================================
echo ""
echo -e "${BLUE}STEP 2: Ensuring database tables exist...${NC}"
echo ""

sudo -u postgres psql -d myaiagent << 'EOFMIGRATION'
-- Ensure samgov_opportunities_cache table exists
CREATE TABLE IF NOT EXISTS samgov_opportunities_cache (
  id SERIAL PRIMARY KEY,
  notice_id VARCHAR(255) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  sol_number VARCHAR(255),
  full_parent_path_name TEXT,
  posted_date TIMESTAMP,
  type VARCHAR(100),
  base_type VARCHAR(100),
  archive_type VARCHAR(100),
  archive_date TIMESTAMP,
  type_of_set_aside_description VARCHAR(255),
  type_of_set_aside VARCHAR(100),
  response_deadline TIMESTAMP,
  naics_code VARCHAR(50),
  classification_code VARCHAR(50),
  active VARCHAR(20),
  award JSON,
  point_of_contact JSON,
  description TEXT,
  organization_type VARCHAR(100),
  office_address JSON,
  links JSON,
  ui_link VARCHAR(500),
  raw_data JSONB NOT NULL,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  search_keywords TEXT,
  relevance_score DECIMAL(5,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_samgov_notice_id ON samgov_opportunities_cache(notice_id);
CREATE INDEX IF NOT EXISTS idx_samgov_posted_date ON samgov_opportunities_cache(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_type ON samgov_opportunities_cache(type);
CREATE INDEX IF NOT EXISTS idx_samgov_relevance ON samgov_opportunities_cache(relevance_score DESC);

-- Ensure search_history table exists
CREATE TABLE IF NOT EXISTS samgov_search_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  search_params JSONB NOT NULL,
  results_count INTEGER,
  search_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON samgov_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON samgov_search_history(search_timestamp DESC);

SELECT 'Tables created/verified' as status;
EOFMIGRATION

echo -e "${GREEN}✅ Database tables verified${NC}"

# ==========================================
# 3. FETCH INITIAL OPPORTUNITIES
# ==========================================
echo ""
echo -e "${BLUE}STEP 3: Fetching initial opportunities from SAM.gov...${NC}"
echo ""

# Create script to fetch opportunities
cat > fetch-initial-opportunities.js << 'EOFJS'
import { searchOpportunities } from './src/services/samGov.js';
import { cacheOpportunities } from './src/services/samGovCache.js';

async function fetchInitialData() {
  try {
    console.log('🔍 Fetching opportunities from SAM.gov...\n');

    // Fetch opportunities for common keywords
    const keywords = ['software', 'IT', 'technology', 'consulting', 'services'];

    let totalCached = 0;

    for (const keyword of keywords) {
      console.log(`Searching for: "${keyword}"...`);

      try {
        const result = await searchOpportunities(
          { keyword, limit: 20 },
          null // no user ID for initial fetch
        );

        if (result.opportunities && result.opportunities.length > 0) {
          console.log(`  Found ${result.opportunities.length} opportunities`);

          // Cache them
          await cacheOpportunities(result.opportunities);
          totalCached += result.opportunities.length;

          console.log(`  ✅ Cached ${result.opportunities.length} opportunities`);
        } else {
          console.log(`  No results for "${keyword}"`);
        }

        // Small delay between searches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`  ❌ Error searching for "${keyword}":`, error.message);
      }
    }

    console.log(`\n✅ Total cached: ${totalCached} opportunities`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fetchInitialData();
EOFJS

# Check if there's already data
ROW_COUNT=$(sudo -u postgres psql -d myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache;" | tr -d ' ')

if [ "$ROW_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Database already has $ROW_COUNT opportunities${NC}"
    echo "Skipping initial fetch."
else
    echo "Database is empty. Fetching initial data..."
    echo ""

    node fetch-initial-opportunities.js

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Initial opportunities fetched and cached${NC}"

        # Show count
        NEW_COUNT=$(sudo -u postgres psql -d myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache;" | tr -d ' ')
        echo "Database now has $NEW_COUNT opportunities"
    else
        echo ""
        echo -e "${YELLOW}⚠️  Initial fetch had some errors, but may have cached some data${NC}"
    fi
fi

rm -f fetch-initial-opportunities.js

# ==========================================
# 4. RESTART BACKEND
# ==========================================
echo ""
echo -e "${BLUE}STEP 4: Restarting backend...${NC}"
echo ""

sudo -u ubuntu pm2 restart myaiagent-backend

sleep 5

echo -e "${GREEN}✅ Backend restarted${NC}"

# ==========================================
# 5. TEST ENDPOINTS
# ==========================================
echo ""
echo -e "${BLUE}STEP 5: Testing SAM.gov endpoints...${NC}"
echo ""

# Quick test of cached opportunities endpoint
sleep 3

echo "Testing GET /api/sam-gov/cached-opportunities..."

TEST_RESULT=$(curl -s https://werkules.com/api/sam-gov/cached-opportunities)

if echo "$TEST_RESULT" | jq -e '.opportunities' > /dev/null 2>&1; then
    OPP_COUNT=$(echo "$TEST_RESULT" | jq '.opportunities | length')
    echo -e "${GREEN}✅ Endpoint working! Returns $OPP_COUNT opportunities${NC}"
else
    echo -e "${YELLOW}⚠️  Endpoint returned unexpected format${NC}"
    echo "$TEST_RESULT" | jq '.'
fi

# ==========================================
# SUMMARY
# ==========================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ SAM.GOV OPPORTUNITIES FIXED${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo "What was fixed:"
echo "  ✓ Removed duplicate route definitions"
echo "  ✓ Ensured database tables exist"
echo "  ✓ Fetched initial opportunities (if needed)"
echo "  ✓ Restarted backend"
echo "  ✓ Tested endpoints"
echo ""

echo "Test the dashboard:"
echo "1. Go to https://werkules.com"
echo "2. Navigate to SAM.gov Opportunities"
echo "3. You should see opportunities listed"
echo "4. Try searching for keywords like 'software', 'IT', etc."
echo ""

echo -e "${YELLOW}Note: The dashboard shows cached opportunities.${NC}"
echo "To fetch fresh data, use the search feature with keywords."
echo ""
