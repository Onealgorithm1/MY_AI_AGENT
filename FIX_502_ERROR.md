# 🔧 Fix 502 Bad Gateway Error - Quick Guide

## Problem
- Frontend shows: `GET /api/csrf-token 502 (Bad Gateway)`
- Backend is not responding on port 5000
- Missing environment configuration

## Solution Steps

### Step 1: Check if Backend is Running

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Check PM2 status
pm2 status

# Check if anything is listening on port 5000
sudo lsof -i :5000
```

**Expected Output:**
- PM2 should show `myaiagent-backend` with status `online`
- Port 5000 should be in use by Node.js

### Step 2: Check Backend Logs

```bash
# View PM2 logs
pm2 logs myaiagent-backend --lines 50

# Check for errors
pm2 logs myaiagent-backend --err
```

**Common Errors to Look For:**
- ❌ `JWT_SECRET environment variable is required`
- ❌ `CSRF_SECRET or HMAC_SECRET environment variable is required`
- ❌ Database connection errors
- ❌ Port already in use

### Step 3: Configure Environment Variables

```bash
# Navigate to backend directory
cd /home/ubuntu/MY_AI_AGENT/myaiagent-mvp/backend

# Check if .env exists
ls -la .env

# If missing, copy from example
cp .env.example .env

# Edit .env file
nano .env
```

**Required Environment Variables:**

```bash
# Minimum required configuration
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://myaiagent_user:YOUR_PASSWORD@localhost:5432/myaiagent

# Security Secrets (REQUIRED - Generate these!)
JWT_SECRET=<generate-this>
HMAC_SECRET=<generate-this>
CSRF_SECRET=<generate-this>
ENCRYPTION_KEY=<generate-this>

# Generate secrets with:
# node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Step 4: Generate Secrets

```bash
# Generate JWT_SECRET
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")"

# Generate HMAC_SECRET
echo "HMAC_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")"

# Generate CSRF_SECRET
echo "CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")"

# Generate ENCRYPTION_KEY (must be 64 hex characters - 32 bytes in hex)
echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

Copy these values into your `.env` file.

### Step 5: Setup Database (if not done)

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Check if database exists
sudo -u postgres psql -l | grep myaiagent

# If database doesn't exist, create it
sudo -u postgres psql <<EOF
CREATE DATABASE myaiagent;
CREATE USER myaiagent_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE myaiagent TO myaiagent_user;
\c myaiagent
GRANT ALL ON SCHEMA public TO myaiagent_user;
EOF
```

### Step 6: Install Dependencies & Restart Backend

```bash
# Navigate to backend directory
cd /home/ubuntu/MY_AI_AGENT/myaiagent-mvp/backend

# Install dependencies (if not already done)
npm install

# Delete old PM2 process
pm2 delete myaiagent-backend

# Start fresh
pm2 start npm --name "myaiagent-backend" -- start

# Save PM2 configuration
pm2 save

# View logs
pm2 logs myaiagent-backend
```

### Step 7: Verify Backend is Running

```bash
# Check PM2 status
pm2 status

# Test backend directly
curl http://localhost:5000/health

# Should return: {"status":"healthy",...}

# Test CSRF endpoint
curl http://localhost:5000/api/csrf-token

# Should return: {"csrfToken":"..."}
```

### Step 8: Check Nginx Configuration

```bash
# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Step 9: Test from Browser

1. Open browser to: `http://your-ec2-ip`
2. Check browser console
3. Should see: `✅ CSRF token fetched successfully`

## Quick Fix Script

Run this automated fix:

```bash
# Create and run fix script
cd /home/ubuntu/MY_AI_AGENT/myaiagent-mvp/backend

# Generate secrets automatically
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://myaiagent_user:CHANGE_THIS@localhost:5432/myaiagent
EOF

# Add generated secrets
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")" >> .env
echo "HMAC_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")" >> .env
echo "CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")" >> .env
echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env

# Restart backend
pm2 restart myaiagent-backend || pm2 start npm --name "myaiagent-backend" -- start
pm2 save

# Wait a moment
sleep 3

# Test
curl http://localhost:5000/health
```

## Common Issues

### Backend Won't Start
- **Error:** `JWT_SECRET required`
  - **Fix:** Add all required secrets to `.env`

### Database Connection Failed
- **Error:** `could not connect to server`
  - **Fix:** Ensure PostgreSQL is running and database is created

### Port Already in Use
- **Error:** `EADDRINUSE`
  - **Fix:** Kill process using port 5000: `sudo kill $(sudo lsof -t -i:5000)`

### PM2 Process Crashes
- **Check logs:** `pm2 logs myaiagent-backend --err`
- **Restart:** `pm2 restart myaiagent-backend`

## Verification Checklist

- [ ] PostgreSQL is running: `sudo systemctl status postgresql`
- [ ] Database exists: `sudo -u postgres psql -l | grep myaiagent`
- [ ] `.env` file exists with all secrets: `cat /home/ubuntu/MY_AI_AGENT/myaiagent-mvp/backend/.env`
- [ ] Backend is running: `pm2 status`
- [ ] Backend responds on port 5000: `curl http://localhost:5000/health`
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] No Nginx errors: `sudo tail /var/log/nginx/error.log`
- [ ] Frontend loads: Open browser to EC2 IP

## Need More Help?

1. **Check Backend Logs:**
   ```bash
   pm2 logs myaiagent-backend --lines 100
   ```

2. **Check Nginx Logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

3. **Test Backend Directly:**
   ```bash
   curl -v http://localhost:5000/api/csrf-token
   ```

4. **Check System Resources:**
   ```bash
   free -h  # Memory
   df -h    # Disk space
   top      # CPU usage
   ```
