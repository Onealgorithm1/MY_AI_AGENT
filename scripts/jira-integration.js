#!/usr/bin/env node

/**
 * Jira Integration Script
 * Automatically creates Jira issues for code deployments and updates
 */

import https from 'https';

const JIRA_CONFIG = {
  baseUrl: 'https://onealgorithm.atlassian.net',
  email: 'lrubino@onealgorithm.com',
  apiToken: 'ATATT3xFfGF0YRE5fLVWV0Xzm96_vizoKpflLmjSgR3875YMWkuynQux8nmEXkbzNEI4jxpBYXfA8qSQDYjz8TUjAy-pwCkMTpmhwyCRTv7zCyGu5Rz7SPnDTX9zgM-o8IF0QbYCh7RAsGL_GwGmhrjzemLMXvKEr2oz3KFsxGN_SX8bYsJwbq0=4909568C',
};

/**
 * Make authenticated request to Jira API
 */
function jiraRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${JIRA_CONFIG.email}:${JIRA_CONFIG.apiToken}`).toString('base64');

    const options = {
      hostname: 'onealgorithm.atlassian.net',
      path: path,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`Jira API error: ${res.statusCode} - ${JSON.stringify(response)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Get all projects
 */
async function getProjects() {
  try {
    const projects = await jiraRequest('GET', '/rest/api/3/project');
    return projects;
  } catch (error) {
    console.error('Error fetching projects:', error.message);
    return [];
  }
}

/**
 * Create a Jira issue
 */
async function createIssue(projectKey, issueType, summary, description) {
  const issueData = {
    fields: {
      project: {
        key: projectKey,
      },
      summary: summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description,
              },
            ],
          },
        ],
      },
      issuetype: {
        name: issueType,
      },
    },
  };

  try {
    const issue = await jiraRequest('POST', '/rest/api/3/issue', issueData);
    return issue;
  } catch (error) {
    console.error('Error creating issue:', error.message);
    throw error;
  }
}

/**
 * Generate deployment report
 */
function generateDeploymentReport(deploymentInfo) {
  const {
    branch,
    commits,
    filesChanged,
    features,
    fixes,
    deploymentDate,
    deployedBy,
  } = deploymentInfo;

  let report = `Deployment Report - ${deploymentDate}\n\n`;
  report += `Branch: ${branch}\n`;
  report += `Deployed by: ${deployedBy}\n\n`;

  if (features && features.length > 0) {
    report += `NEW FEATURES:\n`;
    features.forEach((feature, idx) => {
      report += `${idx + 1}. ${feature}\n`;
    });
    report += `\n`;
  }

  if (fixes && fixes.length > 0) {
    report += `BUG FIXES:\n`;
    fixes.forEach((fix, idx) => {
      report += `${idx + 1}. ${fix}\n`;
    });
    report += `\n`;
  }

  if (commits && commits.length > 0) {
    report += `COMMITS:\n`;
    commits.forEach((commit) => {
      report += `- ${commit}\n`;
    });
    report += `\n`;
  }

  if (filesChanged && filesChanged.length > 0) {
    report += `FILES CHANGED:\n`;
    filesChanged.forEach((file) => {
      report += `- ${file}\n`;
    });
  }

  return report;
}

/**
 * Main function
 */
async function main() {
  console.log('🔗 Connecting to Jira...');

  // Get projects
  const projects = await getProjects();
  if (projects.length === 0) {
    console.error('❌ No projects found or failed to fetch projects');
    process.exit(1);
  }

  console.log('✅ Connected to Jira');
  console.log(`📋 Available projects:`);
  projects.forEach((project) => {
    console.log(`   - ${project.key}: ${project.name}`);
  });

  // Use the first project or specify one
  const projectKey = process.env.JIRA_PROJECT_KEY || projects[0].key;
  console.log(`\n📌 Using project: ${projectKey}`);

  // SAM.gov deployment report
  const deploymentInfo = {
    branch: 'claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e',
    deploymentDate: new Date().toISOString().split('T')[0],
    deployedBy: 'Claude AI Agent',
    features: [
      'SAM.gov Multiple Results - Increased from 10 to 50+ results per search',
      'Automatic Caching System - All opportunities saved to PostgreSQL database',
      'NEW vs EXISTING Detection - Identifies which opportunities are new vs cached',
      'Comprehensive Briefings - Access to ALL data fields (contacts, attachments, NAICS codes)',
      'Pagination Support - Automatic fetching of all available results',
      'SAM.gov Cache Panel UI - Frontend panel to view search history and statistics',
      'Database Tables - samgov_opportunities_cache and samgov_search_history',
    ],
    fixes: [
      'Fixed database import path in urlContent.js (config/database.js → utils/database.js)',
      'Fixed database import path in samGovCache.js (db.js → utils/database.js)',
      'Fixed pool import to use default export instead of named export',
      'Fixed authenticate middleware import (verifyToken → authenticate)',
      'Resolved 502 Bad Gateway error on werkules.com',
    ],
    commits: [
      'Fix urlContent.js to use authenticate middleware instead of verifyToken',
      'Fix urlContent.js to use default import for pool instead of named import',
      'Fix database import path in samGovCache.js - use utils/database instead of db.js',
      'Add automated fix script for database import error',
      'Add 502 error diagnostic and troubleshooting tools',
      'Add comprehensive SAM.gov test script with 21 test cases',
      'Add EC2 deployment and update scripts',
      'Add SAM.gov cache panel to frontend UI',
      'Enhance SAM.gov search with comprehensive detailed briefings',
    ],
    filesChanged: [
      'myaiagent-mvp/backend/src/services/samGov.js',
      'myaiagent-mvp/backend/src/services/samGovCache.js (NEW)',
      'myaiagent-mvp/backend/src/routes/samGov.js',
      'myaiagent-mvp/backend/src/routes/urlContent.js',
      'myaiagent-mvp/backend/src/services/uiFunctions.js',
      'myaiagent-mvp/backend/migrations/013_samgov_cache.sql (NEW)',
      'myaiagent-mvp/frontend/src/services/api.js',
      'myaiagent-mvp/frontend/src/components/SAMGovPanel.jsx (NEW)',
      'myaiagent-mvp/frontend/src/pages/ChatPage.jsx',
      'SAMGOV_TEST_SCRIPT.md (NEW)',
      'EC2_UPDATE_COMMANDS.md (NEW)',
      '502_ERROR_TROUBLESHOOTING.md (NEW)',
      'deploy-samgov-updates.sh (NEW)',
      'fix-502-error.sh (NEW)',
      'diagnose-502-error.sh (NEW)',
    ],
  };

  const summary = `SAM.gov Enhancements Deployed - ${deploymentInfo.deploymentDate}`;
  const description = generateDeploymentReport(deploymentInfo);

  console.log('\n📝 Creating Jira issue...');

  try {
    const issue = await createIssue(projectKey, 'Task', summary, description);
    console.log(`✅ Jira issue created: ${JIRA_CONFIG.baseUrl}/browse/${issue.key}`);
    console.log(`🔗 Issue Key: ${issue.key}`);
  } catch (error) {
    console.error('❌ Failed to create Jira issue:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { createIssue, getProjects, jiraRequest };
