#!/bin/bash

# Create Jira Issue using curl (alternative to Node.js script)
# This script works even if Node.js has network issues

set -e

JIRA_URL="https://onealgorithm.atlassian.net"
JIRA_EMAIL="lrubino@onealgorithm.com"
JIRA_TOKEN="ATATT3xFfGF0YRE5fLVWV0Xzm96_vizoKpflLmjSgR3875YMWkuynQux8nmEXkbzNEI4jxpBYXfA8qSQDYjz8TUjAy-pwCkMTpmhwyCRTv7zCyGu5Rz7SPnDTX9zgM-o8IF0QbYCh7RAsGL_GwGmhrjzemLMXvKEr2oz3KFsxGN_SX8bYsJwbq0=4909568C"

echo "=========================================="
echo "Creating Jira Issue (curl method)"
echo "=========================================="
echo ""

# Get current branch and commit
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT=$(git rev-parse --short HEAD)
DATE=$(date '+%Y-%m-%d')

echo "Branch: $BRANCH"
echo "Commit: $COMMIT"
echo "Date: $DATE"
echo ""

# Get available projects
echo "📋 Fetching available projects..."
PROJECTS=$(curl -s -u "${JIRA_EMAIL}:${JIRA_TOKEN}" \
  -H "Accept: application/json" \
  "${JIRA_URL}/rest/api/3/project")

echo "$PROJECTS" | head -100

# Extract first project key
PROJECT_KEY=$(echo "$PROJECTS" | grep -o '"key":"[^"]*"' | head -1 | sed 's/"key":"\([^"]*\)"/\1/')

if [ -z "$PROJECT_KEY" ]; then
    echo "❌ No project found. Please check your Jira permissions."
    exit 1
fi

echo ""
echo "📌 Using project: $PROJECT_KEY"
echo ""

# Create issue description
DESCRIPTION="Deployment Report - ${DATE}

Branch: ${BRANCH}
Commit: ${COMMIT}
Deployed by: EC2 Automated Deployment

NEW FEATURES:
1. SAM.gov Multiple Results - Increased from 10 to 50+ results per search
2. Automatic Caching System - All opportunities saved to PostgreSQL database
3. NEW vs EXISTING Detection - Identifies which opportunities are new vs cached
4. Comprehensive Briefings - Access to ALL data fields (contacts, attachments, NAICS)
5. Pagination Support - Automatic fetching of all available results
6. SAM.gov Cache Panel UI - Frontend panel to view search history
7. Database Tables - samgov_opportunities_cache, samgov_search_history

BUG FIXES:
1. Fixed database import path in urlContent.js
2. Fixed database import path in samGovCache.js
3. Fixed pool import to use default export
4. Fixed authenticate middleware import
5. Resolved 502 Bad Gateway error on werkules.com

COMMITS:
- Fix urlContent.js to use authenticate middleware
- Fix urlContent.js to use default import for pool
- Fix database import path in samGovCache.js
- Add automated fix script for database import error
- Add 502 error diagnostic and troubleshooting tools

FILES CHANGED:
- myaiagent-mvp/backend/src/services/samGov.js
- myaiagent-mvp/backend/src/services/samGovCache.js (NEW)
- myaiagent-mvp/backend/src/routes/urlContent.js
- myaiagent-mvp/backend/migrations/013_samgov_cache.sql (NEW)
- myaiagent-mvp/frontend/src/components/SAMGovPanel.jsx (NEW)"

# Escape description for JSON
DESCRIPTION_ESCAPED=$(echo "$DESCRIPTION" | jq -Rs .)

# Create issue JSON
ISSUE_JSON=$(cat <<EOF
{
  "fields": {
    "project": {
      "key": "${PROJECT_KEY}"
    },
    "summary": "SAM.gov Enhancements Deployed - ${DATE}",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": ${DESCRIPTION_ESCAPED}
            }
          ]
        }
      ]
    },
    "issuetype": {
      "name": "Task"
    }
  }
}
EOF
)

echo "📝 Creating Jira issue..."

RESPONSE=$(curl -s -u "${JIRA_EMAIL}:${JIRA_TOKEN}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$ISSUE_JSON" \
  "${JIRA_URL}/rest/api/3/issue")

# Check if issue was created
ISSUE_KEY=$(echo "$RESPONSE" | grep -o '"key":"[^"]*"' | head -1 | sed 's/"key":"\([^"]*\)"/\1/')

if [ -z "$ISSUE_KEY" ]; then
    echo "❌ Failed to create Jira issue"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "✅ Jira issue created successfully!"
echo "🔗 Issue Key: ${ISSUE_KEY}"
echo "🌐 URL: ${JIRA_URL}/browse/${ISSUE_KEY}"
echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="
