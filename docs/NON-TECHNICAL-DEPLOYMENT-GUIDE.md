# 🚀 Werkules.com - Deployment Guide (For Non-Technical Users)

## Your New Development Workflow

### ✨ Simple Version (What You Do)

```
1. Code in Windsurf (or VS Code)
2. Save your changes
3. Click "Commit" → Type a message
4. Click "Push"
5. ✅ DONE! GitHub automatically deploys to werkules.com
```

**That's it!** No SSH, no manual commands, no stress.

---

## 📋 One-Time Setup (Do This Once)

### Step 1: Add GitHub Secrets (5 minutes)

These are like passwords that GitHub uses to deploy your app.

**Go to GitHub:**
1. Open https://github.com/Onealgorithm1/MY_AI_AGENT
2. Click **Settings** (top right)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**

**Add these 3 secrets:**

#### Secret #1: AWS_EC2_HOST
```
Name: AWS_EC2_HOST
Value: 3.144.201.118
```

#### Secret #2: AWS_EC2_USER
```
Name: AWS_EC2_USER
Value: ubuntu
```

#### Secret #3: AWS_EC2_SSH_KEY
```
Name: AWS_EC2_SSH_KEY
Value: [Paste your myaiagent-key.pem file content here]
```

**How to get the SSH key content:**
```bash
# On Mac/Linux:
cat ~/Downloads/myaiagent-key.pem

# On Windows:
type C:\Users\YourName\Downloads\myaiagent-key.pem

# Copy the entire output (including BEGIN and END lines)
```

---

## 🎯 How to Deploy Changes

### Automatic Deployment (Recommended)

**When you push to `main` branch:**
1. Make your code changes
2. Commit with a message
3. Push to GitHub
4. GitHub Actions automatically:
   - ✅ Runs tests
   - ✅ Builds the app
   - ✅ Deploys to AWS
   - ✅ Runs health checks
   - ✅ Sends you a notification

**Timeline:**
- Push code → Wait 2-5 minutes → Site updated!

**Check deployment status:**
- Go to: https://github.com/Onealgorithm1/MY_AI_AGENT/actions
- See green ✅ = successful
- See red ❌ = failed (click to see why)

---

### Manual Deployment (If Needed)

**If you need to deploy without pushing to `main`:**

1. Go to https://github.com/Onealgorithm1/MY_AI_AGENT/actions
2. Click "Deploy to Production" workflow
3. Click "Run workflow"
4. Select branch
5. Click green "Run workflow" button

---

## 🏥 Health Checks & Monitoring

### Check if Site is Working

**Quick check:**
- Open https://werkules.com
- Does it load? ✅ Working!

**Detailed check:**
```bash
# SSH into server
ssh ubuntu@3.144.201.118

# Run health check
cd MY_AI_AGENT
./scripts/health-check.sh

# Should see:
# ✅ Backend API is healthy
# ✅ Database is accessible
# ✅ Frontend build exists
```

---

## 🔙 How to Rollback (Undo Bad Deployment)

**If something breaks after deployment:**

### Option 1: Automatic Rollback (GitHub)

**The deploy script automatically rolls back if health checks fail.**
- You don't need to do anything!
- Check GitHub Actions to see the rollback

### Option 2: Manual Rollback (SSH)

```bash
# SSH into server
ssh ubuntu@3.144.201.118

# Run rollback script
cd MY_AI_AGENT
./scripts/rollback.sh

# Confirm when prompted
# Type: yes
```

This restores the previous working version.

---

## 🐛 Troubleshooting

### Problem: Deployment failed

**Check:**
1. Go to GitHub Actions
2. Click the failed workflow
3. Read the error message

**Common issues:**

#### "Health check failed"
```bash
# SSH into server
ssh ubuntu@3.144.201.118

# Check if app is running
pm2 status
# or
sudo systemctl status werkules

# Check logs
pm2 logs
# or
tail -f /tmp/werkules.log
```

#### "Permission denied"
```
Fix: Check GitHub secrets are correct
- AWS_EC2_SSH_KEY has correct private key
- AWS_EC2_USER is "ubuntu"
```

#### "Database connection failed"
```bash
# SSH into server
ssh ubuntu@3.144.201.118

# Check PostgreSQL
sudo systemctl status postgresql

# Check database
psql -U postgres -d myaiagent -c "SELECT 1"
```

---

## 📊 Viewing Logs

### GitHub Actions Logs
1. Go to https://github.com/Onealgorithm1/MY_AI_AGENT/actions
2. Click any workflow run
3. Click job name
4. Expand steps to see logs

### Server Logs (SSH Required)
```bash
# SSH into server
ssh ubuntu@3.144.201.118

# PM2 logs (if using PM2)
pm2 logs werkules

# Or direct log file
tail -f /tmp/werkules.log

# Last 100 lines
tail -100 /tmp/werkules.log
```

---

## ✅ Deployment Checklist

Before each deployment, verify:

- [ ] Code works locally
- [ ] No console errors
- [ ] Tests pass (once added)
- [ ] Database migrations ready (if any)
- [ ] Environment variables set

After deployment:

- [ ] Site loads: https://werkules.com
- [ ] API responds: https://werkules.com/api/health
- [ ] No JavaScript errors (press F12 in browser)
- [ ] Login works
- [ ] Key features work

---

## 🆘 Emergency Contacts

**If everything is broken:**

1. **Rollback immediately** (see above)
2. Check GitHub Actions for errors
3. SSH into server and check logs
4. Post in team Slack/Discord

**Server access:**
```bash
ssh ubuntu@3.144.201.118
# Use the myaiagent-key.pem file
```

---

## 🎓 Learn More

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **PM2 Docs:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

**Questions?** Ask in team chat or create a GitHub issue!
