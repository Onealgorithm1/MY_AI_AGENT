# AWS Deployment Guide

## Your Infrastructure

**EC2 Instance**:
- Instance ID: `i-07a9e5f44f8b65cb9`
- Public IP: `3.144.201.118`
- Public DNS: `ec2-3-144-201-118.us-east-2.compute.amazonaws.com`
- Instance Type: t3.small
- Region: us-east-2
- OS: Ubuntu 24.04

**API Gateway**:
- Invoke URL: `https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1`
- Stage: v1
- Rate Limit: 10,000 req/s
- Burst: 5,000

## Quick Deployment

### Step 1: Connect to EC2

```bash
ssh -i myaiagent-key.pem ubuntu@3.144.201.118
```

### Step 2: Pull Latest Code

```bash
cd MY_AI_AGENT
git pull origin claude/ci-explanation-011CUsrwSEuDosQFTJhFHSA2
```

### Step 3: Build Frontend for Production

```bash
cd myaiagent-mvp/frontend

# Set production API URL
echo "VITE_API_URL=https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api" > .env.production
echo "VITE_ENABLE_ENHANCED_STT=true" >> .env.production

# Build
npm run build
```

### Step 4: Restart Backend

```bash
cd ../backend

# If using PM2
pm2 restart all

# If using systemd
sudo systemctl restart myaiagent

# If running directly
# Kill existing process and restart
pkill -f "node.*server.js"
npm start &
```

### Step 5: Deploy Frontend

**Option A: Serve from EC2 with Nginx**

```bash
# Copy build to nginx directory
sudo cp -r dist/* /var/www/html/

# Restart nginx
sudo systemctl restart nginx
```

**Option B: Deploy to S3/CloudFront**

```bash
# Install AWS CLI if not installed
sudo apt-get install awscli -y

# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

**Option C: Deploy to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Configure CORS on API Gateway

Your frontend needs CORS enabled on API Gateway:

1. Go to AWS Console → API Gateway
2. Select your API
3. Click **Actions** → **Enable CORS**
4. Configure:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-CSRF-Token
   Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
   Access-Control-Allow-Credentials: true
   ```
5. Click **Enable CORS and replace existing CORS headers**
6. Click **Actions** → **Deploy API** → Stage: `v1`

## Environment Variables

### Backend (.env on EC2)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Security
JWT_SECRET=your-jwt-secret
CSRF_SECRET=your-csrf-secret
ENCRYPTION_KEY=your-encryption-key-32-bytes

# Node
NODE_ENV=production
PORT=3000

# API Keys (optional - can use database secrets manager)
OPENAI_API_KEY=sk-...
```

### Frontend (.env.production)

```bash
VITE_API_URL=https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api
VITE_ENABLE_ENHANCED_STT=true
```

## Verify Deployment

### Test Backend

```bash
# Health check
curl https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/health

# Should return:
# {"status":"healthy","timestamp":"...","uptime":123}
```

### Test Frontend

1. Open https://werkules.com (or your domain)
2. Open browser DevTools (F12) → Network tab
3. Login to the app
4. Check requests are going to: `https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api/*`

## Troubleshooting

### Frontend can't connect to backend

**Check 1: CORS Configuration**
```bash
curl -X OPTIONS https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api/health \
  -H "Origin: https://werkules.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

Should see `Access-Control-Allow-Origin` header in response.

**Check 2: API Gateway is routing to EC2**
```bash
# Test API Gateway
curl https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/health

# Test EC2 directly
curl http://3.144.201.118:3000/health
```

Both should return same response.

**Check 3: Frontend build has correct API URL**
```bash
cd myaiagent-mvp/frontend/dist
grep -r "bq9hqtmqif" .
```

Should find the API Gateway URL in the built files.

### 429 Rate Limiting Errors

The latest code has fixes for this. Make sure you've deployed:
- Commit `8c0c412` or later
- Frontend rebuild with disabled automatic polling
- Backend with simplified admin stats query

### Admin Dashboard Not Loading

1. Make sure you're an admin:
   ```bash
   cd myaiagent-mvp/backend
   node src/scripts/make-admin.js your-email@example.com
   ```

2. Clear browser cache (Ctrl+Shift+R)

3. Wait 15 minutes for rate limiter to reset

## Monitoring

### Check Backend Logs

```bash
# If using PM2
pm2 logs

# If using systemd
sudo journalctl -u myaiagent -f

# If running directly
tail -f /path/to/app/logs/*.log
```

### Check API Gateway Logs

1. Enable CloudWatch logs in API Gateway stage settings
2. View logs in AWS Console → CloudWatch → Log groups

### Monitor EC2 Instance

```bash
# CPU and Memory
top

# Disk space
df -h

# Network connections
netstat -tulpn | grep :3000
```

## Security Checklist

- [ ] HTTPS enabled (API Gateway handles this)
- [ ] CORS configured correctly
- [ ] JWT_SECRET is strong and unique
- [ ] ENCRYPTION_KEY is set (required for secrets)
- [ ] Database password is strong
- [ ] EC2 security group only allows necessary ports
- [ ] SSH key is secure (myaiagent-key.pem)
- [ ] Rate limiting enabled (API Gateway)
- [ ] Environment variables not committed to git

## Quick Commands Reference

```bash
# SSH to EC2
ssh -i myaiagent-key.pem ubuntu@3.144.201.118

# Pull updates
cd MY_AI_AGENT && git pull

# Rebuild frontend
cd myaiagent-mvp/frontend && npm run build

# Restart backend
cd ../backend && pm2 restart all

# Check status
pm2 status

# View logs
pm2 logs

# Check health
curl https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/health
```

## Automated Deployment Script

Save as `deploy.sh` on your EC2 instance:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest code
cd /home/ubuntu/MY_AI_AGENT
git pull origin claude/ci-explanation-011CUsrwSEuDosQFTJhFHSA2

# Build frontend
cd myaiagent-mvp/frontend
echo "VITE_API_URL=https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api" > .env.production
echo "VITE_ENABLE_ENHANCED_STT=true" >> .env.production
npm run build

# Deploy frontend
sudo cp -r dist/* /var/www/html/

# Restart backend
cd ../backend
pm2 restart all

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

**Your Current Setup:**
- Backend: EC2 @ 3.144.201.118
- API Gateway: https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1
- Frontend: werkules.com (needs rebuild with new API URL)

**Next Steps:**
1. SSH to EC2
2. Run deployment commands above
3. Rebuild frontend with production API URL
4. Enable CORS on API Gateway
5. Test connection
