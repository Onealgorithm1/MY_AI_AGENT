# EC2 Update Commands for SAM.gov Enhancements

## Quick Update (Recommended)

Run the automated deployment script:

```bash
cd ~/MY_AI_AGENT
chmod +x deploy-samgov-updates.sh
./deploy-samgov-updates.sh
```

---

## Manual Update Steps

If you prefer to run commands manually:

### 1. Fetch and Switch to Feature Branch

```bash
cd ~/MY_AI_AGENT
git fetch origin
git checkout claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e
git pull origin claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e
```

### 2. Update Backend

```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
npm install
```

### 3. Run Database Migration

```bash
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -f migrations/013_samgov_cache.sql
```

**Note**: If you see "relation already exists" errors, that's okay - it means the tables are already created.

### 4. Restart Backend

```bash
pm2 restart myaiagent-backend
```

Or if that fails:

```bash
pm2 delete myaiagent-backend
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
pm2 start npm --name "myaiagent-backend" -- start
```

### 5. Update Frontend

```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/frontend
npm install
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
```

### 6. Verify Deployment

Check backend health:
```bash
curl http://localhost:3000/health
```

Check PM2 status:
```bash
pm2 list
pm2 logs myaiagent-backend --lines 50
```

Check database tables:
```bash
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -c "\dt"
```

Verify SAM.gov cache tables exist:
```bash
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -c "SELECT COUNT(*) FROM samgov_opportunities_cache;"
```

---

## Troubleshooting

### If Port 3000 is Already in Use

```bash
sudo lsof -ti:3000 | xargs -r sudo kill -9
pm2 delete all
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
pm2 start npm --name "myaiagent-backend" -- start
```

### If Git Pull Fails with Authentication

You may need to use a personal access token:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Use the token as your password when prompted

### Check What Branch You're On

```bash
git branch
git status
```

### View Recent Changes

```bash
git log --oneline -10
```

---

## Verify SAM.gov Features

After deployment, test these features:

1. **In Chat UI**: Search SAM.gov and verify you get more than 10 results
2. **Click Building Icon (🏢)**: Open the SAM.gov Cache panel in the UI
3. **Check Detailed Briefings**: Verify contacts, attachments, and NAICS codes are shown
4. **Run Same Search Twice**: Second search should show some opportunities as "EXISTING"

---

## Quick Reference

- **Backend Logs**: `pm2 logs myaiagent-backend`
- **Frontend Path**: `/var/www/html/`
- **Database**: `myaiagent_db` (user: `myaiagent_user`)
- **Application URL**: http://3.144.201.118
- **Branch**: `claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e`
