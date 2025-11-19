# Jira Integration Guide

This project includes automatic Jira integration to create deployment issues and track code changes.

## 🔗 Configuration

The Jira integration is pre-configured with:
- **Jira URL**: https://onealgorithm.atlassian.net
- **Email**: lrubino@onealgorithm.com
- **API Token**: Securely stored in `scripts/jira-integration.js`

## 📝 Manual Usage

### Create a Jira Issue Manually

```bash
# From project root
cd ~/MY_AI_AGENT
node scripts/jira-integration.js
```

Or use the wrapper script:

```bash
chmod +x scripts/create-jira-deployment-issue.sh
./scripts/create-jira-deployment-issue.sh
```

### Specify a Project Key

```bash
# Set project key via environment variable
JIRA_PROJECT_KEY="MYPROJ" node scripts/jira-integration.js

# Or via the wrapper script
./scripts/create-jira-deployment-issue.sh MYPROJ
```

## 🤖 Automatic Triggers

### 1. GitHub Push (via GitHub Actions)

The Jira integration runs automatically when you push to:
- `main` branch
- Any `claude/**` branch

**Workflow file**: `.github/workflows/jira-deployment-notification.yml`

To manually trigger:
1. Go to **Actions** tab in GitHub
2. Select **Jira Deployment Notification**
3. Click **Run workflow**
4. Optionally specify a project key

### 2. EC2 Deployment

Add this to your deployment script:

```bash
# After successful deployment
./scripts/post-deployment-hook.sh
```

The post-deployment hook will:
1. Check if backend is healthy
2. Get current branch and commit info
3. Create a Jira issue with deployment details

### Example Integration in Deployment Script

```bash
#!/bin/bash
# deploy.sh

# ... your deployment steps ...

# Pull latest code
git pull origin main

# Restart services
pm2 restart myaiagent-backend

# Wait for services to be ready
sleep 5

# Run post-deployment hook (creates Jira issue)
./scripts/post-deployment-hook.sh
```

## 📋 What Gets Logged to Jira

Each deployment creates a Jira issue with:

### Summary
`SAM.gov Enhancements Deployed - YYYY-MM-DD`

### Description Includes:
- **Branch name**
- **Deployment date and time**
- **Deployed by** (user/system)
- **New Features** - List of features added
- **Bug Fixes** - List of bugs fixed
- **Commits** - Recent commit messages
- **Files Changed** - All modified files

### Example Jira Issue Content:

```
Deployment Report - 2025-11-18

Branch: claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e
Deployed by: Claude AI Agent

NEW FEATURES:
1. SAM.gov Multiple Results - Increased from 10 to 50+ results
2. Automatic Caching System - All opportunities saved to database
3. NEW vs EXISTING Detection
4. Comprehensive Briefings with all data fields
5. SAM.gov Cache Panel UI

BUG FIXES:
1. Fixed database import path in urlContent.js
2. Fixed database import path in samGovCache.js
3. Fixed pool import to use default export
4. Resolved 502 Bad Gateway error

COMMITS:
- Fix urlContent.js to use authenticate middleware
- Fix urlContent.js to use default import for pool
- Add 502 error diagnostic tools
- Add SAM.gov test script with 21 test cases

FILES CHANGED:
- myaiagent-mvp/backend/src/services/samGov.js
- myaiagent-mvp/backend/src/services/samGovCache.js (NEW)
- myaiagent-mvp/frontend/src/components/SAMGovPanel.jsx (NEW)
```

## 🔧 Customization

### Update Deployment Information

Edit `scripts/jira-integration.js` and modify the `deploymentInfo` object:

```javascript
const deploymentInfo = {
  branch: 'your-branch',
  deploymentDate: new Date().toISOString().split('T')[0],
  deployedBy: 'Your Name',
  features: [
    'Your feature 1',
    'Your feature 2',
  ],
  fixes: [
    'Your bug fix 1',
  ],
  // ...
};
```

### Change Issue Type

By default, issues are created as **Task**. To change:

```javascript
// In jira-integration.js, line ~200
const issue = await createIssue(projectKey, 'Story', summary, description);
// Options: 'Task', 'Story', 'Bug', 'Epic'
```

### Add Custom Fields

Modify the `createIssue` function to include custom fields:

```javascript
const issueData = {
  fields: {
    project: { key: projectKey },
    summary: summary,
    description: { /* ... */ },
    issuetype: { name: issueType },
    // Add custom fields here
    customfield_10001: 'Custom value',
  },
};
```

## 🔍 Troubleshooting

### Issue: "No projects found"

**Solution**: Verify API token has correct permissions:
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Create a new token with full access
3. Update the token in `scripts/jira-integration.js`

### Issue: "Failed to create Jira issue"

**Solution**: Check the error message. Common causes:
- Invalid project key
- Issue type doesn't exist in project
- Required fields missing
- API token expired

### Issue: "Node.js is not installed"

**Solution**: Install Node.js on EC2:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### View Available Projects

```bash
node scripts/jira-integration.js
```

The script will list all available projects and their keys.

## 📚 API References

- **Jira REST API**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
- **Create Issue**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post

## 🔐 Security Notes

- **API Token** is stored in code (consider moving to environment variables for production)
- **GitHub Actions** should use secrets for sensitive data
- **EC2** should have restricted file permissions on scripts

### Move API Token to Environment Variable (Recommended)

```bash
# On EC2, add to ~/.bashrc or /etc/environment
export JIRA_API_TOKEN="your-token-here"
export JIRA_EMAIL="lrubino@onealgorithm.com"
export JIRA_BASE_URL="https://onealgorithm.atlassian.net"
```

Then update `scripts/jira-integration.js`:

```javascript
const JIRA_CONFIG = {
  baseUrl: process.env.JIRA_BASE_URL || 'https://onealgorithm.atlassian.net',
  email: process.env.JIRA_EMAIL || 'lrubino@onealgorithm.com',
  apiToken: process.env.JIRA_API_TOKEN,
};
```

## ✅ Testing

Test the integration:

```bash
# Test manually
node scripts/jira-integration.js

# Expected output:
# 🔗 Connecting to Jira...
# ✅ Connected to Jira
# 📋 Available projects:
#    - PROJ1: Project Name
# 📌 Using project: PROJ1
# 📝 Creating Jira issue...
# ✅ Jira issue created: https://onealgorithm.atlassian.net/browse/PROJ1-123
# 🔗 Issue Key: PROJ1-123
```

## 📞 Support

For issues with Jira integration, contact:
- Email: lrubino@onealgorithm.com
- Jira Admin: https://onealgorithm.atlassian.net/people
