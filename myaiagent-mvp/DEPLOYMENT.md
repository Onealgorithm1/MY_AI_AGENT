# 🚀 Deployment Guide - My AI Agent

Complete guide for deploying to production.

## 📋 Pre-Deployment Checklist

- [ ] OpenAI API key ready
- [ ] Database backup strategy planned
- [ ] Domain name (optional)
- [ ] SSL certificate (production)
- [ ] Environment variables secured
- [ ] Change default admin password

## 🎯 Deployment Options

### Option 1: Railway (⭐ Recommended - Easiest)

**Time: 10 minutes**

1. **Prepare Repository**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-github-repo
git push -u origin main
```

2. **Deploy to Railway**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will auto-configure DATABASE_URL

4. **Configure Environment**
   - Click backend service → Variables
   - Add:
     ```
     OPENAI_API_KEY=sk-proj-...
     JWT_SECRET=your-random-32-char-string
     ENCRYPTION_KEY=your-random-64-char-hex
     NODE_ENV=production
     ```

5. **Deploy Frontend**
   - Railway will auto-detect and deploy
   - Set VITE_API_URL to your backend URL

6. **Run Database Setup**
   - In Railway backend service
   - Click "Deploy" → "Run Command"
   - Run: `npm run setup-db`

**Cost:** ~$5-20/month

---

### Option 2: Render

**Time: 15 minutes**

1. **Create Web Service (Backend)**
   - Go to https://render.com
   - New → Web Service
   - Connect GitHub repo
   - Settings:
     - Build Command: `cd backend && npm install`
     - Start Command: `cd backend && npm start`
     - Environment: Node

2. **Add PostgreSQL**
   - Dashboard → New → PostgreSQL
   - Copy "Internal Database URL"

3. **Environment Variables**
```
DATABASE_URL=postgres://...
OPENAI_API_KEY=sk-proj-...
JWT_SECRET=...
ENCRYPTION_KEY=...
NODE_ENV=production
```

4. **Create Static Site (Frontend)**
   - New → Static Site
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`

**Cost:** Free tier available, ~$7/month for production

---

### Option 3: Docker (VPS/Cloud)

**Time: 30 minutes**

1. **Prepare Server**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose
```

2. **Create .env file**
```bash
cat > .env << EOF
DB_PASSWORD=your-secure-password
OPENAI_API_KEY=sk-proj-...
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
EOF
```

3. **Deploy**
```bash
# Clone repo
git clone your-repo
cd myaiagent-mvp

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Setup database
docker-compose exec backend npm run setup-db
```

4. **Setup Nginx (Optional)**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    location /api {
        proxy_pass http://localhost:3000;
    }

    location /voice {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Cost:** $5-50/month depending on VPS provider

---

## 🔒 Security Checklist

### Before Going Live

1. **Change Default Credentials**
```sql
-- Connect to database
psql $DATABASE_URL

-- Change admin password
UPDATE users 
SET password_hash = crypt('your-new-password', gen_salt('bf')) 
WHERE email = 'admin@myaiagent.com';
```

2. **Generate Secure Secrets**
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **Enable HTTPS**
   - Use Cloudflare (free SSL)
   - Or Let's Encrypt with certbot
   - Railway/Render include SSL automatically

4. **Set CORS Origins**
```bash
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

5. **Rate Limiting**
```bash
# Adjust based on your needs
RATE_LIMIT_MESSAGES=50
RATE_LIMIT_VOICE_MINUTES=20
```

---

## 📊 Post-Deployment

### 1. Test Everything

```bash
# Test API
curl https://your-api-url/health

# Test login
curl -X POST https://your-api-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}'

# Test OpenAI connection
# Login to admin dashboard and test API keys
```

### 2. Monitor

- Check Admin Dashboard for errors
- Monitor OpenAI usage/costs
- Set up alerts for high usage
- Track response times

### 3. Backup Database

```bash
# Railway
railway run pg_dump > backup.sql

# Manual
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automated (crontab)
0 2 * * * pg_dump $DATABASE_URL > /backups/db-$(date +\%Y\%m\%d).sql
```

---

## 🔄 Updates & Maintenance

### Update Code

```bash
# Pull latest changes
git pull origin main

# Railway/Render - automatic
# Docker - rebuild:
docker-compose down
docker-compose up -d --build
```

### Database Migrations

```bash
# Create migration
psql $DATABASE_URL < migration.sql

# Or use the app
npm run migrate
```

---

## 🐛 Troubleshooting Production

### App Won't Start

```bash
# Check logs
docker-compose logs backend
# OR
railway logs

# Common issues:
# 1. DATABASE_URL not set
# 2. OpenAI API key missing
# 3. Port already in use
```

### Database Connection Failed

```bash
# Test connection
psql $DATABASE_URL

# Check if database exists
psql $DATABASE_URL -c "\l"

# Recreate if needed
npm run setup-db
```

### High API Costs

```bash
# Check usage in admin dashboard
# Reduce rate limits:
RATE_LIMIT_MESSAGES=25
RATE_LIMIT_VOICE_MINUTES=10

# Switch to cheaper model:
VITE_DEFAULT_MODEL=gpt-4o-mini
```

### Voice Not Working

```bash
# Check WebSocket connection
# Ensure wss:// (not ws://) for HTTPS
# Verify OpenAI Realtime API access
# Check firewall allows WebSocket
```

---

## 📈 Scaling Guide

### For 100-1K Users

```yaml
# Increase server resources
# Railway: Scale plan
# VPS: Upgrade to 2GB+ RAM

# Add Redis for sessions
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### For 1K-10K Users

```yaml
# Use load balancer
# Separate database server
# Enable CDN for frontend
# Add monitoring (Datadog, New Relic)
# Multiple backend instances
```

### For 10K+ Users

- Kubernetes cluster
- Auto-scaling
- Multi-region deployment
- Dedicated OpenAI org
- Advanced caching (Redis Cluster)

---

## 💰 Cost Estimation

### Monthly Costs

**Small (10-100 users):**
- Hosting: $5-20 (Railway/Render)
- Database: $0-10
- OpenAI API: $50-200
- **Total: $55-230/month**

**Medium (100-1K users):**
- Hosting: $20-50
- Database: $10-25
- OpenAI API: $200-1000
- **Total: $230-1075/month**

**Large (1K-10K users):**
- Hosting: $100-500
- Database: $50-200
- OpenAI API: $1000-5000
- **Total: $1150-5700/month**

---

## ✅ Production Checklist

- [ ] SSL/HTTPS enabled
- [ ] Environment variables secured
- [ ] Default password changed
- [ ] Database backups automated
- [ ] Error monitoring active
- [ ] Rate limits configured
- [ ] API keys tested
- [ ] CORS configured
- [ ] Health checks passing
- [ ] Documentation updated
- [ ] Monitoring dashboard setup
- [ ] Alerting configured

---

## 🎉 You're Live!

Your AI Agent is now running in production!

**Next Steps:**
1. Monitor usage in admin dashboard
2. Gather user feedback
3. Iterate and improve
4. Scale as needed

**Need Help?**
- Check logs first
- Review troubleshooting section
- Test in development environment
- Check OpenAI status page

---

Good luck! 🚀
