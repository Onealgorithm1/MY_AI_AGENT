# Jira Integration Setup Instructions

## ✅ What's Been Set Up

I've created a complete Jira integration system for your project with:

### 📁 Files Created:

1. **`scripts/jira-integration.js`** - Main Node.js script to create Jira issues
2. **`scripts/create-jira-deployment-issue.sh`** - Bash wrapper for easy execution
3. **`scripts/post-deployment-hook.sh`** - Post-deployment hook for EC2
4. **`.github/workflows/jira-deployment-notification.yml`** - GitHub Actions workflow
5. **`JIRA_INTEGRATION.md`** - Complete documentation

### 🔗 Pre-configured for:
- **Jira URL**: https://onealgorithm.atlassian.net
- **Email**: lrubino@onealgorithm.com
- **API Token**: Already configured in the script

---

## 🚀 Quick Start - Test It Now!

### On Your EC2 Instance:

```bash
# SSH into your EC2
ssh -i ~/Downloads/myaiagent-key.pem ubuntu@3.144.201.118

# Navigate to project
cd ~/MY_AI_AGENT

# Pull the latest code with Jira integration
git fetch origin
git checkout claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e
git pull origin claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e

# Make scripts executable (if needed)
chmod +x scripts/*.sh scripts/*.js

# Run the Jira integration script
node scripts/jira-integration.js
```

### Expected Output:

```
🔗 Connecting to Jira...
✅ Connected to Jira
📋 Available projects:
   - PROJ: Project Name
   - DEV: Development
📌 Using project: PROJ

📝 Creating Jira issue...
✅ Jira issue created: https://onealgorithm.atlassian.net/browse/PROJ-123
🔗 Issue Key: PROJ-123
```

---

## 🤖 Automatic Jira Updates

### 1. On Every GitHub Push

The integration is **already active**! Every time you push code to:
- `main` branch
- Any `claude/**` branch

A Jira issue will be automatically created via GitHub Actions.

**To view the workflow:**
1. Go to: https://github.com/Onealgorithm1/MY_AI_AGENT/actions
2. Look for "Jira Deployment Notification" workflow

### 2. On EC2 Deployment

Update your deployment script to include the post-deployment hook:

```bash
# At the end of your deployment script
./scripts/post-deployment-hook.sh
```

Or update your existing `deploy-samgov-updates.sh`:

```bash
# Add this at the end of the script
echo "Creating Jira deployment issue..."
./scripts/post-deployment-hook.sh
```

---

## 📋 What Gets Sent to Jira

Each deployment creates a comprehensive Jira issue with:

### Issue Title:
`SAM.gov Enhancements Deployed - 2025-11-18`

### Issue Content:
```
Deployment Report - 2025-11-18

Branch: claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e
Deployed by: Claude AI Agent

NEW FEATURES:
1. SAM.gov Multiple Results - Increased from 10 to 50+ results per search
2. Automatic Caching System - All opportunities saved to PostgreSQL
3. NEW vs EXISTING Detection - Identifies which are new vs cached
4. Comprehensive Briefings - ALL data fields accessible
5. Pagination Support - Automatic fetching of all results
6. SAM.gov Cache Panel UI - Frontend panel for search history
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
- Add comprehensive SAM.gov test script with 21 test cases
- Add EC2 deployment and update scripts

FILES CHANGED:
- myaiagent-mvp/backend/src/services/samGov.js
- myaiagent-mvp/backend/src/services/samGovCache.js (NEW)
- myaiagent-mvp/backend/src/routes/samGov.js
- myaiagent-mvp/backend/src/routes/urlContent.js
- myaiagent-mvp/backend/src/services/uiFunctions.js
- myaiagent-mvp/backend/migrations/013_samgov_cache.sql (NEW)
- myaiagent-mvp/frontend/src/services/api.js
- myaiagent-mvp/frontend/src/components/SAMGovPanel.jsx (NEW)
- myaiagent-mvp/frontend/src/pages/ChatPage.jsx
```

---

## 🎯 Manual Testing

### Create a Jira Issue Right Now:

```bash
# On EC2
cd ~/MY_AI_AGENT
node scripts/jira-integration.js
```

This will create a Jira issue documenting all the SAM.gov enhancements we just deployed!

### Specify a Specific Project:

```bash
# If you have multiple projects, specify which one
JIRA_PROJECT_KEY="MYAIAGENT" node scripts/jira-integration.js
```

### Using the Bash Wrapper:

```bash
./scripts/create-jira-deployment-issue.sh
# Or with project key:
./scripts/create-jira-deployment-issue.sh MYAIAGENT
```

---

## 🔧 Customization

### Update Deployment Info

Edit `scripts/jira-integration.js` and modify the `deploymentInfo` object (around line 90) to customize what gets reported.

### Change Project Key

Set environment variable:
```bash
export JIRA_PROJECT_KEY="YOUR_PROJECT"
```

Or edit the script directly.

---

## 📊 Verify on Jira

After running the script, check your Jira board:

1. Go to: https://onealgorithm.atlassian.net
2. Login with: lrubino@onealgorithm.com
3. Look for the newly created issue(s)
4. You should see detailed deployment information

---

## 🔍 Troubleshooting

### Issue: "No projects found"

**Check API token permissions:**
```bash
# Test API token with curl
curl -u lrubino@onealgorithm.com:YOUR_API_TOKEN \
  https://onealgorithm.atlassian.net/rest/api/3/project
```

### Issue: Node.js not found on EC2

**Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v20.x
```

### Issue: Script permission denied

**Make executable:**
```bash
chmod +x scripts/jira-integration.js
chmod +x scripts/*.sh
```

---

## 📚 Next Steps

1. **Test the integration now** - Run `node scripts/jira-integration.js` on EC2
2. **Add to deployment pipeline** - Update your deployment scripts to call the post-deployment hook
3. **Check GitHub Actions** - Your next push will automatically create a Jira issue
4. **Customize** - Edit the script to match your team's workflow

---

## 📞 Support

For questions or issues:
- **Jira Admin**: lrubino@onealgorithm.com
- **Jira URL**: https://onealgorithm.atlassian.net
- **Documentation**: See `JIRA_INTEGRATION.md` for detailed guide

---

## ✅ Summary

You now have:
- ✅ Jira integration script ready to run
- ✅ GitHub Actions workflow active
- ✅ EC2 post-deployment hook ready
- ✅ Complete documentation

**Run this on EC2 to test:**
```bash
cd ~/MY_AI_AGENT && node scripts/jira-integration.js
```

This will create a Jira issue with all the SAM.gov enhancements we just deployed! 🚀
