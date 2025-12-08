#!/bin/bash

echo "========================================="
echo "🔍 Comprehensive Diagnostic & Fix Script"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "1️⃣ Checking SAM.gov Opportunities Database..."
echo "---------------------------------------------"

# Check total opportunities in database
TOTAL_OPPS=$(sudo -u postgres psql myaiagent -t -c "SELECT COUNT(*) FROM samgov_opportunities_cache;" 2>/dev/null | xargs)
echo "Total opportunities in database: ${TOTAL_OPPS}"

# Check active vs inactive opportunities
ACTIVE_COUNT=$(sudo -u postgres psql myaiagent -t -c "
SELECT COUNT(*)
FROM samgov_opportunities_cache
WHERE archive_date IS NULL OR archive_date > NOW();
" 2>/dev/null | xargs)

INACTIVE_COUNT=$(sudo -u postgres psql myaiagent -t -c "
SELECT COUNT(*)
FROM samgov_opportunities_cache
WHERE archive_date IS NOT NULL AND archive_date <= NOW();
" 2>/dev/null | xargs)

echo -e "${GREEN}Active opportunities (not expired): ${ACTIVE_COUNT}${NC}"
echo -e "${YELLOW}Inactive opportunities (expired): ${INACTIVE_COUNT}${NC}"
echo ""

echo "2️⃣ Sample of opportunities with dates..."
echo "---------------------------------------------"
sudo -u postgres psql myaiagent -c "
SELECT
  id,
  LEFT(title, 50) as title,
  posted_date,
  archive_date,
  CASE
    WHEN archive_date IS NULL THEN 'No expiry'
    WHEN archive_date > NOW() THEN 'Active'
    ELSE 'Expired'
  END as status
FROM samgov_opportunities_cache
ORDER BY last_seen_at DESC
LIMIT 10;
"
echo ""

echo "3️⃣ Checking Company Profile..."
echo "---------------------------------------------"
COMPANY_COUNT=$(sudo -u postgres psql myaiagent -t -c "SELECT COUNT(*) FROM company_profiles;" 2>/dev/null | xargs)
if [ "$COMPANY_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Company profile exists${NC}"
  sudo -u postgres psql myaiagent -c "SELECT company_name, website, array_length(naics_codes, 1) as naics_count, array_length(core_capabilities, 1) as capabilities_count FROM company_profiles;"
else
  echo -e "${RED}❌ No company profile found${NC}"
fi
echo ""

echo "4️⃣ Checking Opportunity Matches..."
echo "---------------------------------------------"
MATCHES_COUNT=$(sudo -u postgres psql myaiagent -t -c "SELECT COUNT(*) FROM opportunity_matches;" 2>/dev/null | xargs)
if [ "$MATCHES_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ ${MATCHES_COUNT} opportunity matches found${NC}"
  sudo -u postgres psql myaiagent -c "
SELECT
  match_score,
  naics_match,
  set_aside_match,
  capability_match
FROM opportunity_matches
ORDER BY match_score DESC
LIMIT 5;
"
else
  echo -e "${YELLOW}⚠️  No opportunity matches yet. Run matching script.${NC}"
fi
echo ""

echo "5️⃣ Testing Backend API..."
echo "---------------------------------------------"
echo "Testing /api/samgov/cache endpoint..."
RESPONSE=$(curl -s http://localhost:5000/api/samgov/cache?limit=100)
COUNT=$(echo $RESPONSE | jq -r '.opportunities | length' 2>/dev/null)
if [ "$COUNT" ]; then
  echo -e "${GREEN}✅ Backend API working - returned ${COUNT} opportunities${NC}"
else
  echo -e "${RED}❌ Backend API error${NC}"
  echo "Response: $RESPONSE"
fi
echo ""

echo "6️⃣ Checking Frontend Build..."
echo "---------------------------------------------"
if [ -d "/var/www/myaiagent" ]; then
  ASSET_COUNT=$(find /var/www/myaiagent/assets -name "*.js" 2>/dev/null | wc -l)
  echo -e "${GREEN}✅ Frontend deployed - ${ASSET_COUNT} JS files${NC}"

  # Check if AppLayout has the Dashboards button code
  if grep -q "showConnectedApps" /var/www/myaiagent/assets/*.js 2>/dev/null; then
    echo -e "${GREEN}✅ Dashboards modal code found in built files${NC}"
  else
    echo -e "${YELLOW}⚠️  Dashboards modal code NOT found - may need rebuild${NC}"
  fi
else
  echo -e "${RED}❌ Frontend not deployed at /var/www/myaiagent${NC}"
fi
echo ""

echo "7️⃣ Summary & Recommendations..."
echo "---------------------------------------------"
echo ""
if [ "$ACTIVE_COUNT" -lt 5 ] && [ "$INACTIVE_COUNT" -gt 50 ]; then
  echo -e "${YELLOW}⚠️  ISSUE FOUND: Most opportunities are EXPIRED/INACTIVE${NC}"
  echo "   The frontend was filtering to show only 'active' opportunities by default."
  echo -e "   ${GREEN}✅ FIX APPLIED: Changed default filter to show ALL opportunities${NC}"
  echo ""
fi

echo "📝 Next Steps:"
echo "1. Rebuild frontend to include Dashboards button fix"
echo "2. The SAM.gov page will now show ALL opportunities (not just active)"
echo "3. Users can filter by status if needed using the status dropdown"
echo ""

echo "========================================="
echo "✨ Diagnostic Complete!"
echo "========================================="
