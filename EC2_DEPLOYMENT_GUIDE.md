# 🚀 EC2 Deployment Guide

## Quick Deploy to EC2

Follow these steps to push your latest changes to EC2.

---

## Method 1: Automated Update Script (Recommended)

### Step 1: SSH into your EC2 instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Step 2: Navigate to project directory

```bash
cd ~/MY_AI_AGENT/myaiagent-mvp
```

### Step 3: Run the update script

```bash
./update-ec2.sh
```

This script will automatically:
- ✅ Pull latest code from git
- ✅ Install/update dependencies
- ✅ Run database migrations
- ✅ Build frontend
- ✅ Update Nginx files
- ✅ Restart backend (PM2)
- ✅ Restart Nginx
- ✅ Verify deployment

---

## Method 2: Manual Deployment

If you prefer to do it step-by-step:

### 1. SSH into EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
cd ~/MY_AI_AGENT
```

### 2. Pull latest code

```bash
git pull origin main
# Or your branch: git pull origin claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e
```

### 3. Update backend

```bash
cd myaiagent-mvp/backend
npm install
npm run migrate  # Run database migrations
```

### 4. Update frontend

```bash
cd ../frontend
npm install
npm run build
```

### 5. Deploy frontend to Nginx

```bash
sudo rm -rf /var/www/myaiagent/*
sudo cp -r dist/* /var/www/myaiagent/
sudo chown -R www-data:www-data /var/www/myaiagent
```

### 6. Restart services

```bash
# Restart backend
pm2 restart myaiagent-backend

# Restart Nginx
sudo systemctl restart nginx
```

### 7. Verify deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs myaiagent-backend

# Test backend health
curl http://localhost:3000/health

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## Deploying SAM.gov Cache Feature

For the SAM.gov caching feature you just implemented:

### 1. SSH and pull code

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
cd ~/MY_AI_AGENT
git pull origin claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e
```

### 2. Run the migration for the new tables

```bash
cd myaiagent-mvp/backend
npm run migrate
```

This will create:
- `samgov_opportunities_cache` table
- `samgov_search_history` table

### 3. Install any new dependencies

```bash
npm install
cd ../frontend
npm install
npm run build
```

### 4. Deploy

```bash
# Update frontend
sudo rm -rf /var/www/myaiagent/*
sudo cp -r dist/* /var/www/myaiagent/
sudo chown -R www-data:www-data /var/www/myaiagent

# Restart backend
pm2 restart myaiagent-backend
sudo systemctl restart nginx
```

### 5. Test the feature

1. Open your app in browser
2. Click the Building icon (🏢) in the header
3. Search for SAM.gov opportunities
4. Verify the cache panel shows search history

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
pm2 logs myaiagent-backend

# Check if port is in use
sudo lsof -i :3000

# Restart from scratch
pm2 delete myaiagent-backend
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
pm2 start npm --name "myaiagent-backend" -- start
pm2 save
```

### Frontend not updating

```bash
# Clear Nginx cache
sudo rm -rf /var/www/myaiagent/*

# Rebuild and redeploy
cd ~/MY_AI_AGENT/myaiagent-mvp/frontend
npm run build
sudo cp -r dist/* /var/www/myaiagent/
sudo chown -R www-data:www-data /var/www/myaiagent

# Hard refresh in browser (Ctrl+Shift+R)
```

### Database migration fails

```bash
# Check if database is running
sudo systemctl status postgresql

# Connect to database
psql -U myaiagent_user -d myaiagent

# Manually run migration
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
psql -U myaiagent_user -d myaiagent -f migrations/013_samgov_cache.sql
```

### Permission denied errors

```bash
# Fix Nginx permissions
sudo chown -R www-data:www-data /var/www/myaiagent
sudo chmod -R 755 /var/www/myaiagent

# Fix backend permissions
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
chmod +x update-ec2.sh
```

---

## Useful Commands

### PM2 Commands

```bash
pm2 status                    # Check all processes
pm2 logs myaiagent-backend   # View logs
pm2 restart myaiagent-backend # Restart backend
pm2 stop myaiagent-backend   # Stop backend
pm2 start myaiagent-backend  # Start backend
pm2 save                      # Save process list
pm2 monit                     # Monitor in real-time
```

### Nginx Commands

```bash
sudo systemctl status nginx   # Check status
sudo systemctl restart nginx  # Restart Nginx
sudo systemctl reload nginx   # Reload config
sudo nginx -t                 # Test config
sudo tail -f /var/log/nginx/error.log  # View error logs
sudo tail -f /var/log/nginx/access.log # View access logs
```

### Database Commands

```bash
# Connect to database
psql -U myaiagent_user -d myaiagent

# List tables
\dt

# View table structure
\d samgov_opportunities_cache

# Check recent searches
SELECT * FROM samgov_search_history ORDER BY searched_at DESC LIMIT 10;

# Check cached opportunities
SELECT notice_id, title, first_seen_at, seen_count
FROM samgov_opportunities_cache
ORDER BY first_seen_at DESC LIMIT 10;
```

### Git Commands

```bash
# Check current branch
git branch

# Pull latest from specific branch
git pull origin branch-name

# Check status
git status

# View recent commits
git log --oneline -10
```

---

## Rollback (If Something Goes Wrong)

### Quick Rollback

```bash
# Go back to previous commit
cd ~/MY_AI_AGENT
git log --oneline -5  # Find previous commit hash
git checkout <previous-commit-hash>

# Rebuild and restart
cd myaiagent-mvp/backend
pm2 restart myaiagent-backend

cd ../frontend
npm run build
sudo cp -r dist/* /var/www/myaiagent/
```

### Database Rollback

```bash
# Restore from backup
psql -U myaiagent_user -d myaiagent < backup.sql

# Or drop new tables
psql -U myaiagent_user -d myaiagent -c "DROP TABLE IF EXISTS samgov_opportunities_cache, samgov_search_history CASCADE;"
```

---

## Monitoring After Deployment

### 1. Check Backend Health

```bash
curl http://localhost:3000/health
curl http://your-ec2-ip:3000/health
```

### 2. Monitor Logs

```bash
# Backend logs (in real-time)
pm2 logs myaiagent-backend --lines 100

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

### 3. Test SAM.gov Feature

```bash
# Test SAM.gov search endpoint
curl -X POST http://localhost:3000/api/sam-gov/search/opportunities \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"keyword": "test", "limit": 10}'

# Test cache endpoint
curl http://localhost:3000/api/sam-gov/search-history \
  -H "Cookie: your-session-cookie"
```

---

## Performance Optimization

### After Deployment

```bash
# Clear npm cache
npm cache clean --force

# Clear PM2 logs
pm2 flush

# Optimize database
psql -U myaiagent_user -d myaiagent -c "VACUUM ANALYZE;"

# Check disk space
df -h

# Check memory usage
free -h
pm2 monit
```

---

## Security Checklist

After deploying to production:

- [ ] HTTPS/SSL enabled (use Certbot)
- [ ] Firewall configured (only allow 80, 443, 22)
- [ ] Database passwords changed from defaults
- [ ] JWT secrets regenerated
- [ ] API keys secured in .env file
- [ ] CORS origins properly configured
- [ ] Rate limiting enabled
- [ ] Logs monitoring setup

---

## Need Help?

### Common Issues

1. **502 Bad Gateway** - Backend not running, check `pm2 status`
2. **504 Gateway Timeout** - Backend slow, check `pm2 logs`
3. **Database connection error** - Check PostgreSQL status
4. **Frontend not loading** - Check Nginx config and `/var/www/myaiagent/`

### Get Support

- Check logs: `pm2 logs myaiagent-backend`
- Check Nginx: `sudo tail -f /var/log/nginx/error.log`
- Test locally first before deploying
- Keep a backup before major updates

---

## 🎉 Deployment Complete!

Your SAM.gov cache feature is now live on EC2!

**Test it:**
1. Visit your EC2 URL
2. Click the Building icon (🏢) in header
3. Search for opportunities
4. View the cache panel

**Monitor:**
- PM2 dashboard: `pm2 monit`
- Backend logs: `pm2 logs myaiagent-backend`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
