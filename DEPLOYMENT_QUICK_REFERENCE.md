# Quick Deployment Reference

This is a quick reference guide for the actual deployment process used on your EC2 instance.

## Deployment Workflow

The GitHub Actions workflow (`.github/workflows/deploy-to-ec2.yml`) automatically runs when you push to `main` branch.

### What It Does

1. **Build Phase** (GitHub Actions)
   - Installs dependencies
   - Builds frontend for production
   - Creates deployment package

2. **Deploy Phase** (On EC2)
   - Extracts code to deployment directory
   - Installs backend dependencies
   - **Runs database migrations** (`run-new-migrations.js`)
   - Builds frontend
   - Copies frontend to `/var/www/myaiagent/`
   - Restarts PM2 process `myaiagent-backend`

## Directory Structure on EC2

```
~/MY_AI_AGENT/myaiagent-mvp/    # Main deployment directory
├── backend/
│   ├── server.js
│   ├── run-new-migrations.js   # Database migrations
│   └── .env                     # Backend environment variables
└── frontend/
    └── dist/                    # Built frontend

/var/www/myaiagent/              # Frontend serving directory
└── (frontend dist files)

/var/log/myaiagent/              # Application logs
├── backend-error.log
└── backend-out.log
```

## Required GitHub Secrets

Configure in: GitHub repo → Settings → Secrets → Actions

| Secret | Example Value |
|--------|---------------|
| `EC2_SSH_KEY` | Contents of your `.pem` file |
| `EC2_HOST` | `54.123.45.67` or domain |
| `EC2_USER` | `ubuntu` or `ec2-user` |
| `EC2_DEPLOY_PATH` | `/home/ubuntu/MY_AI_AGENT/myaiagent-mvp` |

## Manual Deployment Steps

If you need to deploy manually:

```bash
# 1. SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-host

# 2. Navigate to project
cd ~/MY_AI_AGENT/myaiagent-mvp

# 3. Pull latest changes
git pull origin main

# 4. Install backend dependencies
cd backend
npm install

# 5. Run database migrations
node run-new-migrations.js

# 6. Build frontend
cd ../frontend
npm install
npm run build

# 7. Copy frontend to web directory
sudo cp -r dist/* /var/www/myaiagent/

# 8. Restart backend
pm2 restart myaiagent-backend

# 9. Check status
pm2 status
pm2 logs myaiagent-backend --lines 50
```

## PM2 Process Management

```bash
# View all processes
pm2 list

# View logs
pm2 logs myaiagent-backend
pm2 logs myaiagent-backend --lines 100
pm2 logs myaiagent-backend --err  # Error logs only

# Restart process
pm2 restart myaiagent-backend

# Stop process
pm2 stop myaiagent-backend

# Start process (if stopped)
pm2 start myaiagent-backend

# View detailed info
pm2 describe myaiagent-backend

# Monitor in real-time
pm2 monit

# Save current process list
pm2 save
```

## Database Migrations

The workflow automatically runs `run-new-migrations.js` after deploying backend code.

To run manually:
```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
node run-new-migrations.js
```

## Environment Variables

Backend environment variables are stored in:
```
~/MY_AI_AGENT/myaiagent-mvp/backend/.env
```

Edit with:
```bash
nano ~/MY_AI_AGENT/myaiagent-mvp/backend/.env
```

After editing, restart the backend:
```bash
pm2 restart myaiagent-backend
```

## Nginx Configuration

Frontend is served from: `/var/www/myaiagent/`

Nginx config: `/etc/nginx/sites-available/myaiagent`

Commands:
```bash
# Test config
sudo nginx -t

# Reload config
sudo nginx -s reload

# Restart nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Check if application is running
```bash
pm2 status
```

### View recent logs
```bash
pm2 logs myaiagent-backend --lines 100
```

### Check for errors
```bash
pm2 logs myaiagent-backend --err
# or
tail -f /var/log/myaiagent/backend-error.log
```

### Test backend API
```bash
curl http://localhost:3000/api/health
```

### Check disk space
```bash
df -h
```

### Check memory usage
```bash
free -h
pm2 monit
```

### Restart everything
```bash
pm2 restart all
sudo systemctl restart nginx
```

### Database connection issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database credentials in .env
cat ~/MY_AI_AGENT/myaiagent-mvp/backend/.env | grep DATABASE_URL
```

## SSL/HTTPS Setup

If you haven't set up SSL yet:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d werkules.com -d www.werkules.com

# Auto-renewal is set up automatically
# Test renewal
sudo certbot renew --dry-run
```

## Rollback

If deployment breaks something:

```bash
# 1. Check git history
cd ~/MY_AI_AGENT/myaiagent-mvp
git log --oneline -10

# 2. Revert to previous commit
git reset --hard <previous-commit-hash>

# 3. Rebuild and redeploy
cd frontend
npm install
npm run build
sudo cp -r dist/* /var/www/myaiagent/

# 4. Restart backend
pm2 restart myaiagent-backend
```

## Common File Locations

| What | Location |
|------|----------|
| Application Code | `~/MY_AI_AGENT/myaiagent-mvp/` |
| Frontend Build | `~/MY_AI_AGENT/myaiagent-mvp/frontend/dist/` |
| Frontend Serving | `/var/www/myaiagent/` |
| Backend .env | `~/MY_AI_AGENT/myaiagent-mvp/backend/.env` |
| Application Logs | `/var/log/myaiagent/` |
| Nginx Config | `/etc/nginx/sites-available/myaiagent` |
| PM2 Ecosystem | `~/MY_AI_AGENT/myaiagent-mvp/ecosystem.config.js` |

## Monitoring

### Watch logs in real-time
```bash
pm2 logs myaiagent-backend
```

### Monitor resource usage
```bash
pm2 monit
```

### Check application health
```bash
curl https://werkules.com/api/health
```

### View GitHub Actions deployment status
Go to: https://github.com/Onealgorithm1/MY_AI_AGENT/actions

## Support

If deployment fails:
1. Check GitHub Actions logs in the Actions tab
2. SSH to EC2 and check PM2 logs
3. Check nginx error logs
4. Verify environment variables are set correctly
5. Ensure PostgreSQL is running
6. Check disk space and memory
