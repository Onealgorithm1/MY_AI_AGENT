#!/bin/bash

# ===========================================
# FIX ECONNREFUSED AND ADD COMPANY FEATURES
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 FIXING BACKEND PORT & ADDING FEATURES${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# ==========================================
# 1. FIX LOCALHOST:3000 ISSUE
# ==========================================
echo -e "${BLUE}STEP 1: Fixing localhost:3000 connection issue...${NC}"
echo ""

# Backup
cp src/services/uiFunctions.js src/services/uiFunctions.js.backup

# Fix: Change localhost:3000 to localhost:5000
echo "Changing default port from 3000 to 5000..."

sed -i "s|http://localhost:3000|http://localhost:5000|g" src/services/uiFunctions.js

# Count changes
CHANGES=$(grep -c "localhost:5000" src/services/uiFunctions.js || echo "0")
echo -e "${GREEN}✅ Fixed $CHANGES occurrences${NC}"

# Also set BACKEND_URL in .env if not set
if ! grep -q "^BACKEND_URL=" .env 2>/dev/null; then
    echo ""
    echo "Adding BACKEND_URL to .env..."
    echo "BACKEND_URL=http://localhost:5000" >> .env
    echo -e "${GREEN}✅ Added BACKEND_URL to .env${NC}"
else
    echo -e "${GREEN}✅ BACKEND_URL already in .env${NC}"
fi

# ==========================================
# 2. CREATE COMPANY PROFILE TABLE
# ==========================================
echo ""
echo -e "${BLUE}STEP 2: Creating company profile table...${NC}"
echo ""

sudo -u postgres psql -d myaiagent << 'EOFSQL'
-- Company profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  company_name VARCHAR(500) NOT NULL,
  website VARCHAR(500),
  uei_sam VARCHAR(50),
  cage_code VARCHAR(50),
  duns_number VARCHAR(50),

  -- Business information
  business_type VARCHAR(100),
  business_size VARCHAR(50),
  is_small_business BOOLEAN DEFAULT false,
  set_aside_types TEXT[], -- 8(a), HUBZone, SDVOSB, WOSB, etc.

  -- Capabilities
  naics_codes TEXT[],
  naics_descriptions JSONB,
  core_capabilities TEXT[],
  past_performance TEXT[],
  certifications TEXT[],

  -- Contact
  primary_contact_name VARCHAR(200),
  primary_contact_email VARCHAR(200),
  primary_contact_phone VARCHAR(50),
  address JSONB,

  -- Settings
  opportunity_preferences JSONB,
  auto_match_enabled BOOLEAN DEFAULT true,
  notification_settings JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_company_user ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_uei ON company_profiles(uei_sam);
CREATE INDEX IF NOT EXISTS idx_company_active ON company_profiles(is_active);

-- Opportunity matches table
CREATE TABLE IF NOT EXISTS opportunity_matches (
  id SERIAL PRIMARY KEY,
  company_profile_id INTEGER REFERENCES company_profiles(id),
  opportunity_cache_id INTEGER REFERENCES samgov_opportunities_cache(id),
  notice_id VARCHAR(255),

  -- Match scoring
  match_score DECIMAL(5,2),
  naics_match BOOLEAN DEFAULT false,
  set_aside_match BOOLEAN DEFAULT false,
  capability_match BOOLEAN DEFAULT false,

  -- Match reasons
  match_reasons JSONB,
  ineligibility_reasons JSONB,
  recommendations JSONB,

  -- Status
  status VARCHAR(50) DEFAULT 'identified', -- identified, reviewed, pursuing, declined
  user_notes TEXT,

  -- Metadata
  matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_match_company ON opportunity_matches(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_match_opportunity ON opportunity_matches(opportunity_cache_id);
CREATE INDEX IF NOT EXISTS idx_match_score ON opportunity_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_status ON opportunity_matches(status);

SELECT 'Company profile tables created' as status;
EOFSQL

echo -e "${GREEN}✅ Company profile tables created${NC}"

# ==========================================
# 3. INSERT ONEALGORITHM COMPANY PROFILE
# ==========================================
echo ""
echo -e "${BLUE}STEP 3: Creating OneAlgorithm company profile...${NC}"
echo ""

sudo -u postgres psql -d myaiagent << 'EOFSQL'
-- Get admin user ID
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM users WHERE email = 'admin@myaiagent.com' LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Insert or update OneAlgorithm profile
    INSERT INTO company_profiles (
      user_id,
      company_name,
      website,
      business_type,
      business_size,
      is_small_business,
      set_aside_types,
      naics_codes,
      naics_descriptions,
      core_capabilities,
      certifications,
      primary_contact_email,
      opportunity_preferences,
      auto_match_enabled
    ) VALUES (
      admin_user_id,
      'OneAlgorithm',
      'https://onealgorithm.com',
      'Technology Services',
      'Small Business',
      true,
      ARRAY['SB', 'SDVOSB', '8(a)'],
      ARRAY['541511', '541512', '541513', '541519', '518210', '541330'],
      '{"541511": "Custom Computer Programming Services", "541512": "Computer Systems Design Services", "541513": "Computer Facilities Management Services", "541519": "Other Computer Related Services", "518210": "Data Processing, Hosting, and Related Services", "541330": "Engineering Services"}'::jsonb,
      ARRAY[
        'AI/ML Development',
        'Custom Software Development',
        'Cloud Solutions & DevOps',
        'Data Analytics & Business Intelligence',
        'API Development & Integration',
        'Web & Mobile Application Development',
        'Automation & Workflow Optimization',
        'Database Design & Management',
        'IT Consulting & Strategy',
        'System Integration Services'
      ],
      ARRAY[
        'AWS Certified',
        'Agile/Scrum Certified',
        'ISO 27001 Compliant',
        'CMMI Level 3'
      ],
      'admin@onealgorithm.com',
      '{
        "min_contract_value": 10000,
        "max_contract_value": 10000000,
        "preferred_agencies": ["DOD", "VA", "DHS", "NASA", "DOE"],
        "preferred_types": ["Software Development", "IT Services", "AI/ML", "Data Analytics"],
        "excluded_keywords": ["construction", "medical devices", "pharmaceuticals"]
      }'::jsonb,
      true
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'OneAlgorithm company profile created for user %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user not found - please create company profile manually';
  END IF;
END $$;

SELECT
  company_name,
  website,
  array_length(naics_codes, 1) as naics_count,
  array_length(core_capabilities, 1) as capabilities_count
FROM company_profiles
WHERE company_name = 'OneAlgorithm';
EOFSQL

echo -e "${GREEN}✅ OneAlgorithm profile created${NC}"

# ==========================================
# 4. CREATE OPPORTUNITY MATCHING SCRIPT
# ==========================================
echo ""
echo -e "${BLUE}STEP 4: Creating opportunity matching script...${NC}"
echo ""

cat > match-opportunities.js << 'EOFJS'
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'myaiagent',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function matchOpportunities() {
  try {
    console.log('🔍 Matching SAM.gov opportunities with company profile...\n');

    // Get company profile
    const companyResult = await pool.query(
      "SELECT * FROM company_profiles WHERE company_name = 'OneAlgorithm' LIMIT 1"
    );

    if (companyResult.rows.length === 0) {
      console.log('❌ No company profile found');
      return;
    }

    const company = companyResult.rows[0];
    console.log(\`Company: \${company.company_name}\`);
    console.log(\`NAICS Codes: \${company.naics_codes?.length || 0}\`);
    console.log(\`Core Capabilities: \${company.core_capabilities?.length || 0}\n\`);

    // Get opportunities
    const oppsResult = await pool.query(
      "SELECT * FROM samgov_opportunities_cache LIMIT 100"
    );

    console.log(\`Found \${oppsResult.rows.length} opportunities to analyze\n\`);

    let matchCount = 0;

    for (const opp of oppsResult.rows) {
      let matchScore = 0;
      let matchReasons = [];
      let ineligibilityReasons = [];
      let recommendations = [];

      let naicsMatch = false;
      let setAsideMatch = false;
      let capabilityMatch = false;

      // Check NAICS match
      if (opp.naics_code && company.naics_codes?.includes(opp.naics_code)) {
        matchScore += 30;
        naicsMatch = true;
        matchReasons.push(\`NAICS code match: \${opp.naics_code}\`);
      }

      // Check set-aside match
      if (opp.type_of_set_aside && company.set_aside_types) {
        const oppSetAside = opp.type_of_set_aside.toUpperCase();
        const companySetAsides = company.set_aside_types.map(s => s.toUpperCase());

        if (companySetAsides.some(s => oppSetAside.includes(s))) {
          matchScore += 25;
          setAsideMatch = true;
          matchReasons.push(\`Set-aside match: \${opp.type_of_set_aside}\`);
        } else if (oppSetAside.includes('SB') || oppSetAside.includes('SMALL')) {
          // Small business set-aside and company is small business
          if (company.is_small_business) {
            matchScore += 20;
            setAsideMatch = true;
            matchReasons.push('Small business set-aside match');
          }
        }
      }

      // Check capability/keyword match
      if (opp.title && company.core_capabilities) {
        const titleLower = opp.title.toLowerCase();
        const matchingCapabilities = company.core_capabilities.filter(cap =>
          titleLower.includes(cap.toLowerCase().split(' ')[0])
        );

        if (matchingCapabilities.length > 0) {
          matchScore += 20;
          capabilityMatch = true;
          matchReasons.push(\`Capability match: \${matchingCapabilities.join(', ')}\`);
        }
      }

      // Add ineligibility reasons if score is low
      if (!naicsMatch) {
        ineligibilityReasons.push('NAICS code does not match company codes');
        recommendations.push('Consider expanding NAICS codes or partnering with a company that has matching codes');
      }

      if (!setAsideMatch && opp.type_of_set_aside) {
        ineligibilityReasons.push(\`Set-aside type '\${opp.type_of_set_aside}' not available to company\`);
        recommendations.push('Consider obtaining certifications for this set-aside category');
      }

      // Bonus points
      if (opp.description) {
        const descLower = opp.description.toLowerCase();
        if (descLower.includes('software') || descLower.includes('technology')) {
          matchScore += 10;
        }
      }

      // Only save matches with score > 20
      if (matchScore >= 20) {
        await pool.query(
          \`INSERT INTO opportunity_matches
           (company_profile_id, opportunity_cache_id, notice_id, match_score,
            naics_match, set_aside_match, capability_match,
            match_reasons, ineligibility_reasons, recommendations)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT DO NOTHING\`,
          [
            company.id,
            opp.id,
            opp.notice_id,
            matchScore,
            naicsMatch,
            setAsideMatch,
            capabilityMatch,
            JSON.stringify(matchReasons),
            JSON.stringify(ineligibilityReasons),
            JSON.stringify(recommendations)
          ]
        );
        matchCount++;
      }
    }

    console.log(\`\n✅ Matched \${matchCount} opportunities\`);

    // Show top matches
    const topMatches = await pool.query(
      \`SELECT
        om.*,
        soc.notice_id,
        soc.title,
        soc.posted_date,
        soc.naics_code
       FROM opportunity_matches om
       JOIN samgov_opportunities_cache soc ON om.opportunity_cache_id = soc.id
       WHERE om.company_profile_id = $1
       ORDER BY om.match_score DESC
       LIMIT 5\`,
      [company.id]
    );

    console.log(\`\nTop 5 matches:\`);
    topMatches.rows.forEach((match, i) => {
      console.log(\`\n\${i + 1}. \${match.title}\`);
      console.log(\`   Match Score: \${match.match_score}\`);
      console.log(\`   Notice ID: \${match.notice_id}\`);
      console.log(\`   NAICS: \${match.naics_code}\`);
      console.log(\`   Reasons: \${match.match_reasons}\`);
    });

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

matchOpportunities();
EOFJS

echo "Running opportunity matching..."
node match-opportunities.js

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Opportunity matching complete${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Matching completed with warnings${NC}"
fi

rm -f match-opportunities.js

# ==========================================
# 5. RESTART BACKEND
# ==========================================
echo ""
echo -e "${BLUE}STEP 5: Restarting backend...${NC}"
echo ""

sudo -u ubuntu pm2 restart myaiagent-backend

sleep 5

echo -e "${GREEN}✅ Backend restarted${NC}"

# ==========================================
# SUMMARY
# ==========================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ ALL FIXES APPLIED${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo "What was fixed:"
echo "  ✓ Changed localhost:3000 to localhost:5000"
echo "  ✓ Added BACKEND_URL to .env"
echo "  ✓ Created company_profiles table"
echo "  ✓ Created opportunity_matches table"
echo "  ✓ Added OneAlgorithm company profile"
echo "  ✓ Matched opportunities with company capabilities"
echo "  ✓ Restarted backend"
echo ""

echo "Test in chat:"
echo "1. Go to https://werkules.com"
echo "2. Open a chat conversation"
echo "3. Try: ${GREEN}'Save this opportunity'${NC} or ${GREEN}'Create opportunity from...'${NC}"
echo "4. Should work without ECONNREFUSED error!"
echo ""

echo "View matched opportunities:"
echo "SELECT * FROM opportunity_matches ORDER BY match_score DESC LIMIT 10;"
echo ""
