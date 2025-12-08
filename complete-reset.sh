#!/bin/bash

echo "==========================================="
echo "🚨 COMPLETE SYSTEM RESET & FIX"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ============================================
# STEP 1: KILL ALL BACKEND PROCESSES
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1: Stopping All Backend Processes${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Delete all PM2 processes
pm2 delete all 2>/dev/null || echo "No PM2 processes to delete"

# Find and kill any process using port 5000
PORT_PID=$(lsof -ti:5000)
if [ ! -z "$PORT_PID" ]; then
  echo "Found process using port 5000: $PORT_PID"
  kill -9 $PORT_PID
  echo -e "${GREEN}✅ Killed process on port 5000${NC}"
else
  echo "No process found on port 5000"
fi

sleep 2
echo ""

# ============================================
# STEP 2: REBUILD FRONTEND WITH LATEST CODE
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2: Rebuilding Frontend${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

cd "$SCRIPT_DIR/myaiagent-mvp/frontend"
echo "📦 Installing dependencies..."
npm install --silent

echo "🔨 Building with latest code..."
npm run build

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Build successful${NC}"
else
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi

echo "📤 Deploying to /var/www/myaiagent..."
sudo cp -r dist/* /var/www/myaiagent/
echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

# ============================================
# STEP 3: START BACKEND CLEANLY
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 3: Starting Backend${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

cd "$SCRIPT_DIR/myaiagent-mvp/backend"

# Start with PM2
pm2 start src/server.js --name myaiagent-backend --watch false

sleep 5

# Check if it's actually running
if pm2 list | grep -q "myaiagent-backend.*online"; then
  echo -e "${GREEN}✅ Backend started successfully${NC}"
else
  echo -e "${RED}❌ Backend failed to start${NC}"
  pm2 logs myaiagent-backend --lines 20
  exit 1
fi
echo ""

# ============================================
# STEP 4: FETCH FRESH DATA FROM SAM.GOV
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 4: Fetching from SAM.gov API${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

cd "$SCRIPT_DIR/myaiagent-mvp/backend"

# Create a script to fetch from SAM.gov
cat > fetch-fresh-opportunities.js << 'EOFJS'
import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'myaiagent',
  user: process.env.DB_USER || 'myaiagent',
  password: process.env.DB_PASSWORD,
});

const SAM_GOV_API_KEY = process.env.SAM_GOV_API_KEY;

async function fetchFromSAMGov() {
  console.log('🔄 Fetching fresh opportunities from SAM.gov...\n');

  if (!SAM_GOV_API_KEY) {
    throw new Error('SAM_GOV_API_KEY not found in .env');
  }

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);

  const params = new URLSearchParams({
    api_key: SAM_GOV_API_KEY,
    postedFrom: fromDate.toISOString().split('T')[0],
    postedTo: toDate.toISOString().split('T')[0],
    limit: '100',
    offset: '0'
  });

  try {
    const response = await fetch(`https://api.sam.gov/opportunities/v2/search?${params.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`SAM.gov API error: ${response.status}`);
    }

    const data = await response.json();
    const opps = data.opportunitiesData || [];

    console.log(`✅ Fetched ${opps.length} opportunities from SAM.gov\n`);

    let newCount = 0;
    let updatedCount = 0;

    for (const opp of opps) {
      try {
        const query = `
          INSERT INTO samgov_opportunities_cache (
            notice_id, solicitation_number, title, type, base_type,
            archive_type, archive_date, posted_date, response_deadline,
            naics_code, classification_code, active, description,
            set_aside_type, contracting_office, full_parent_path_name,
            full_parent_path_code, raw_data, first_seen_at, last_seen_at, seen_count
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW(), 1
          )
          ON CONFLICT (notice_id)
          DO UPDATE SET
            last_seen_at = NOW(),
            seen_count = samgov_opportunities_cache.seen_count + 1,
            title = EXCLUDED.title,
            response_deadline = EXCLUDED.response_deadline,
            raw_data = EXCLUDED.raw_data
          RETURNING (xmax = 0) AS inserted
        `;

        const values = [
          opp.noticeId,
          opp.solicitationNumber,
          opp.title,
          opp.type,
          opp.baseType,
          opp.archiveType,
          opp.archiveDate,
          opp.postedDate,
          opp.responseDeadLine,
          opp.naicsCode,
          opp.classificationCode,
          opp.active || 'Yes',
          opp.description,
          opp.typeOfSetAsideDescription || opp.typeOfSetAside,
          opp.fullParentPathName?.split('.')[0] || opp.departmentName,
          opp.fullParentPathName,
          opp.fullParentPathCode,
          JSON.stringify(opp)
        ];

        const result = await pool.query(query, values);

        if (result.rows[0].inserted) {
          newCount++;
        } else {
          updatedCount++;
        }
      } catch (err) {
        console.error(`Error caching ${opp.noticeId}:`, err.message);
      }
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM samgov_opportunities_cache');
    const total = countResult.rows[0].count;

    console.log('\n========================================');
    console.log('✅ Fetch Complete!');
    console.log('========================================');
    console.log(`New: ${newCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Total in cache: ${total}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Fetch failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fetchFromSAMGov();
EOFJS

echo "Running fresh fetch from SAM.gov..."
node fetch-fresh-opportunities.js

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Fresh data fetched from SAM.gov${NC}"
else
  echo -e "${RED}❌ Failed to fetch from SAM.gov${NC}"
  echo "This might be due to missing SAM_GOV_API_KEY in .env"
fi
echo ""

# ============================================
# STEP 5: VERIFY DATABASE
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 5: Verifying Database${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

DB_COUNT=$(sudo -u postgres psql myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache;" 2>/dev/null | xargs)
echo "Total opportunities in database: $DB_COUNT"

ACTIVE_COUNT=$(sudo -u postgres psql myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache WHERE archive_date IS NULL OR archive_date > NOW();" 2>/dev/null | xargs)
echo "Active opportunities: $ACTIVE_COUNT"

INACTIVE_COUNT=$(sudo -u postgres psql myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache WHERE archive_date IS NOT NULL AND archive_date <= NOW();" 2>/dev/null | xargs)
echo "Inactive opportunities: $INACTIVE_COUNT"
echo ""

# ============================================
# STEP 6: VERIFY EVERYTHING
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 6: Final Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Check PM2 status
echo "PM2 Status:"
pm2 list

# Check deployed files
echo ""
if grep -rq "getCachedOpportunities" /var/www/myaiagent/assets/*.js 2>/dev/null; then
  echo -e "${GREEN}✅ getCachedOpportunities found in deployed files${NC}"
else
  echo -e "${RED}❌ getCachedOpportunities NOT found${NC}"
fi

if grep -rq "status.*''.*Show all" /var/www/myaiagent/assets/*.js 2>/dev/null; then
  echo -e "${GREEN}✅ Default 'show all' filter found${NC}"
else
  echo -e "${YELLOW}⚠️  Could not verify filter in minified JS${NC}"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo "==========================================="
echo -e "${GREEN}✨ Complete Reset Done!${NC}"
echo "==========================================="
echo ""
echo "📊 Current State:"
echo "  - Backend: $(pm2 list | grep myaiagent-backend | grep -o 'online\|stopped' || echo 'unknown')"
echo "  - Database: $DB_COUNT total opportunities"
echo "  - Active: $ACTIVE_COUNT"
echo "  - Inactive: $INACTIVE_COUNT"
echo ""
echo "🌐 CRITICAL: Clear Your Browser Cache Now!"
echo ""
echo "1. Open https://werkules.com"
echo "2. Press F12 (DevTools)"
echo "3. Go to 'Application' tab"
echo "4. Click 'Clear site data'"
echo "5. Hard refresh: Ctrl+Shift+R"
echo ""
echo "OR test in incognito window first:"
echo "  - Open incognito/private window"
echo "  - Go to https://werkules.com"
echo "  - Login and check SAM.gov page"
echo "  - Should see all $DB_COUNT opportunities"
echo ""
echo "🐛 If still issues:"
echo "  - Backend logs: pm2 logs myaiagent-backend"
echo "  - Restart backend: pm2 restart myaiagent-backend"
echo "  - Re-run this script: sudo ./complete-reset.sh"
echo ""
echo "==========================================="
