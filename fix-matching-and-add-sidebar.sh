#!/bin/bash

# ===========================================
# FIX MATCHING SCRIPT & ADD CONNECTED APPS SIDEBAR
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 FIXING SCRIPT & ADDING SIDEBAR FEATURE${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# ==========================================
# 1. FIX MATCHING SCRIPT & RUN IT
# ==========================================
echo -e "${BLUE}STEP 1: Running opportunity matching...${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Create fixed matching script (without template literal escaping issues)
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

    const companyResult = await pool.query(
      "SELECT * FROM company_profiles WHERE company_name = 'OneAlgorithm' LIMIT 1"
    );

    if (companyResult.rows.length === 0) {
      console.log('❌ No company profile found');
      return;
    }

    const company = companyResult.rows[0];
    console.log('Company: ' + company.company_name);
    console.log('NAICS Codes: ' + (company.naics_codes?.length || 0));
    console.log('Core Capabilities: ' + (company.core_capabilities?.length || 0));
    console.log('');

    const oppsResult = await pool.query(
      "SELECT * FROM samgov_opportunities_cache LIMIT 100"
    );

    console.log('Found ' + oppsResult.rows.length + ' opportunities to analyze\n');

    let matchCount = 0;

    for (const opp of oppsResult.rows) {
      let matchScore = 0;
      let matchReasons = [];
      let ineligibilityReasons = [];
      let recommendations = [];

      let naicsMatch = false;
      let setAsideMatch = false;
      let capabilityMatch = false;

      if (opp.naics_code && company.naics_codes?.includes(opp.naics_code)) {
        matchScore += 30;
        naicsMatch = true;
        matchReasons.push('NAICS code match: ' + opp.naics_code);
      }

      if (opp.type_of_set_aside && company.set_aside_types) {
        const oppSetAside = opp.type_of_set_aside.toUpperCase();
        const companySetAsides = company.set_aside_types.map(s => s.toUpperCase());

        if (companySetAsides.some(s => oppSetAside.includes(s))) {
          matchScore += 25;
          setAsideMatch = true;
          matchReasons.push('Set-aside match: ' + opp.type_of_set_aside);
        } else if (oppSetAside.includes('SB') || oppSetAside.includes('SMALL')) {
          if (company.is_small_business) {
            matchScore += 20;
            setAsideMatch = true;
            matchReasons.push('Small business set-aside match');
          }
        }
      }

      if (opp.title && company.core_capabilities) {
        const titleLower = opp.title.toLowerCase();
        const matchingCapabilities = company.core_capabilities.filter(cap =>
          titleLower.includes(cap.toLowerCase().split(' ')[0])
        );

        if (matchingCapabilities.length > 0) {
          matchScore += 20;
          capabilityMatch = true;
          matchReasons.push('Capability match: ' + matchingCapabilities.join(', '));
        }
      }

      if (!naicsMatch) {
        ineligibilityReasons.push('NAICS code does not match company codes');
        recommendations.push('Consider expanding NAICS codes or partnering with a company that has matching codes');
      }

      if (!setAsideMatch && opp.type_of_set_aside) {
        ineligibilityReasons.push('Set-aside type not available to company');
        recommendations.push('Consider obtaining certifications for this set-aside category');
      }

      if (opp.description) {
        const descLower = opp.description.toLowerCase();
        if (descLower.includes('software') || descLower.includes('technology')) {
          matchScore += 10;
        }
      }

      if (matchScore >= 20) {
        await pool.query(
          `INSERT INTO opportunity_matches
           (company_profile_id, opportunity_cache_id, notice_id, match_score,
            naics_match, set_aside_match, capability_match,
            match_reasons, ineligibility_reasons, recommendations)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT DO NOTHING`,
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

    console.log('\n✅ Matched ' + matchCount + ' opportunities');

    const topMatches = await pool.query(
      `SELECT
        om.*,
        soc.notice_id,
        soc.title,
        soc.posted_date,
        soc.naics_code
       FROM opportunity_matches om
       JOIN samgov_opportunities_cache soc ON om.opportunity_cache_id = soc.id
       WHERE om.company_profile_id = $1
       ORDER BY om.match_score DESC
       LIMIT 5`,
      [company.id]
    );

    console.log('\nTop 5 matches:');
    topMatches.rows.forEach((match, i) => {
      console.log('\n' + (i + 1) + '. ' + match.title);
      console.log('   Match Score: ' + match.match_score);
      console.log('   Notice ID: ' + match.notice_id);
      console.log('   NAICS: ' + match.naics_code);
      console.log('   Reasons: ' + match.match_reasons);
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

node match-opportunities.js
rm -f match-opportunities.js

echo ""
echo -e "${GREEN}✅ Opportunity matching complete${NC}"

# ==========================================
# 2. UPDATE SIDEBAR WITH CONNECTED APPS
# ==========================================
echo ""
echo -e "${BLUE}STEP 2: Adding Connected Apps button to sidebar...${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/frontend

# Backup
cp src/components/AppLayout.jsx src/components/AppLayout.jsx.backup

# Update AppLayout to add Connected Apps section
cat > src/components/AppLayout.jsx << 'EOFREACT'
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Building2, Settings, Shield, User, Grid, ExternalLink, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [showConnectedApps, setShowConnectedApps] = useState(false);

  const navItems = [
    {
      path: '/chat',
      icon: MessageSquare,
      label: 'Chat',
      title: 'AI Chat',
    },
    {
      path: '/samgov',
      icon: Building2,
      label: 'SAM.gov',
      title: 'SAM.gov Opportunities',
    },
  ];

  const connectedApps = [
    {
      name: 'SAM.gov',
      description: 'Federal contract opportunities',
      icon: Building2,
      path: '/samgov',
      status: 'connected',
      color: 'bg-blue-600',
    },
    {
      name: 'Company Profile',
      description: 'OneAlgorithm capabilities & certifications',
      icon: Building2,
      path: '/company-profile',
      status: 'configured',
      color: 'bg-green-600',
    },
    {
      name: 'Opportunity Matches',
      description: 'AI-matched opportunities for your company',
      icon: Grid,
      path: '/opportunity-matches',
      status: 'active',
      color: 'bg-purple-600',
    },
  ];

  const isActive = (path) => {
    return location.pathname === path || (path === '/chat' && location.pathname === '/');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-20 lg:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center lg:justify-start">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <span className="hidden lg:block ml-3 text-lg font-semibold text-gray-900 dark:text-white">
              werkules
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-center lg:justify-start px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={item.title}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden lg:block ml-3 font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Connected Apps Button */}
          <button
            onClick={() => setShowConnectedApps(true)}
            className="w-full flex items-center justify-center lg:justify-start px-4 py-3 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 mt-4"
            title="Connected Apps & Dashboards"
          >
            <Grid className="w-5 h-5" />
            <span className="hidden lg:block ml-3 font-medium">
              Dashboards
            </span>
          </button>
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white dark:text-gray-900" />
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.fullName || 'User'}
              </p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="hidden lg:block p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <button
                onClick={() => navigate('/admin')}
                className="hidden lg:block p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Admin Panel"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile: Icons only */}
          <div className="lg:hidden flex flex-col gap-2 mt-3">
            <button
              onClick={() => navigate('/profile')}
              className="w-full p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center"
              title="Profile"
            >
              <Settings className="w-5 h-5" />
            </button>
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center"
                title="Admin"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Connected Apps Modal */}
      {showConnectedApps && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Connected Apps & Dashboards
              </h2>
              <button
                onClick={() => setShowConnectedApps(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Apps Grid */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4">
                {connectedApps.map((app) => {
                  const Icon = app.icon;
                  return (
                    <div
                      key={app.name}
                      onClick={() => {
                        navigate(app.path);
                        setShowConnectedApps(false);
                      }}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 ${app.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {app.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              app.status === 'connected' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              app.status === 'configured' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            }`}>
                              {app.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {app.description}
                          </p>
                          <div className="mt-2 flex items-center text-blue-600 dark:text-blue-400 text-sm">
                            <span>Open Dashboard</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
EOFREACT

echo -e "${GREEN}✅ Sidebar updated with Dashboards button${NC}"

# ==========================================
# 3. RESTART BACKEND
# ==========================================
echo ""
echo -e "${BLUE}STEP 3: Restarting backend...${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
sudo -u ubuntu pm2 restart myaiagent-backend

sleep 3

echo -e "${GREEN}✅ Backend restarted${NC}"

# ==========================================
# SUMMARY
# ==========================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ ALL UPDATES COMPLETE${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo "What was added:"
echo "  ✓ Fixed matching script syntax"
echo "  ✓ Ran opportunity matching"
echo "  ✓ Added 'Dashboards' button to sidebar"
echo "  ✓ Created connected apps modal showing:"
echo "    • SAM.gov Opportunities"
echo "    • Company Profile (OneAlgorithm)"
echo "    • Opportunity Matches"
echo "  ✓ Restarted backend"
echo ""

echo "Test it:"
echo "1. Go to https://werkules.com"
echo "2. Look for the 'Dashboards' button in sidebar"
echo "3. Click it to see all connected apps"
echo "4. Click any app to navigate to it"
echo ""

echo "To rebuild frontend (if needed):"
echo "cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/frontend"
echo "npm run build"
echo "sudo cp -r dist/* /var/www/myaiagent/"
echo ""
