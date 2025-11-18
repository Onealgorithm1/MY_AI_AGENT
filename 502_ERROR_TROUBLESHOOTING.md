# 502 Bad Gateway Error - Troubleshooting Guide

## What's Happening

You're seeing a **502 Bad Gateway** error on **werkules.com**, which means:
- Nginx (the reverse proxy) is running
- But it can't reach the backend Node.js server on port 3000
- The backend is either crashed, stopped, or not responding

The error logs also show:
- **CSRF token missing** - because the frontend couldn't fetch it (backend is down)
- **Login failed** - because no backend to authenticate against

---

## Quick Fix (Run on EC2 via SSH)

### Option 1: Automated Fix Script

```bash
cd ~/MY_AI_AGENT
chmod +x fix-502-error.sh
./fix-502-error.sh
```

### Option 2: Manual Fix Commands

```bash
# Kill any stuck processes on port 3000
sudo lsof -ti:3000 | xargs -r sudo kill -9

# Restart the backend
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
pm2 restart myaiagent-backend

# If restart fails, start fresh
pm2 delete myaiagent-backend
pm2 start npm --name "myaiagent-backend" -- start

# Restart Nginx
sudo systemctl restart nginx

# Verify it's working
curl http://localhost:3000/health
```

---

## Diagnosis (Run on EC2)

### Check Backend Status

```bash
pm2 list
pm2 logs myaiagent-backend --lines 50
```

**Look for:**
- Status should be "online" (not "errored" or "stopped")
- No error messages in logs

### Check if Port 3000 is Listening

```bash
sudo lsof -i :3000
```

**Expected output:**
```
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    12345 user   20u  IPv6 123456      0t0  TCP *:3000 (LISTEN)
```

### Test Backend Directly

```bash
curl http://localhost:3000/health
```

**Expected output:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### Check Nginx Configuration

```bash
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/default
```

**Look for:** proxy_pass should point to `http://localhost:3000`

---

## Common Causes & Solutions

### 1. Backend Crashed

**Symptoms:**
- PM2 shows status "errored"
- Logs show error messages

**Solution:**
```bash
pm2 logs myaiagent-backend --lines 100  # Check what caused crash
pm2 restart myaiagent-backend
```

### 2. Backend Not Started

**Symptoms:**
- PM2 list shows "stopped" or no process listed
- Nothing running on port 3000

**Solution:**
```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
pm2 start npm --name "myaiagent-backend" -- start
```

### 3. Port 3000 Occupied by Different Process

**Symptoms:**
- PM2 shows error "EADDRINUSE"
- Backend can't start

**Solution:**
```bash
sudo lsof -ti:3000 | xargs -r sudo kill -9
pm2 restart myaiagent-backend
```

### 4. Database Connection Failed

**Symptoms:**
- Backend logs show "connection refused" or "authentication failed"
- Backend starts but crashes immediately

**Solution:**
```bash
# Check database is running
sudo systemctl status postgresql

# Test connection
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -c "SELECT 1;"

# Check environment variables
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
cat .env | grep DATABASE
```

### 5. Missing Environment Variables

**Symptoms:**
- Backend starts but features don't work
- Errors about undefined config values

**Solution:**
```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
ls -la .env  # Should exist
cat .env     # Check all required variables

# If missing, recreate .env file with all required variables
```

### 6. Nginx Not Proxying Correctly

**Symptoms:**
- Backend is running and healthy
- But still getting 502 from domain

**Solution:**
```bash
# Check Nginx config
sudo cat /etc/nginx/sites-enabled/default

# Look for backend proxy configuration
# Should have: proxy_pass http://localhost:3000;

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx error logs
sudo tail -50 /var/log/nginx/error.log
```

---

## Complete Diagnostic Script

Run this to get a full picture:

```bash
cd ~/MY_AI_AGENT
chmod +x diagnose-502-error.sh
./diagnose-502-error.sh
```

---

## Verification Steps

After applying fixes, verify everything works:

### 1. Check Backend Health
```bash
curl http://localhost:3000/health
```

### 2. Check PM2 Status
```bash
pm2 list
```

### 3. Test API Endpoint
```bash
curl http://localhost:3000/api/health
```

### 4. Test from Domain
```bash
curl https://werkules.com/api/health
```

### 5. Test CSRF Token Endpoint
```bash
curl https://werkules.com/api/csrf-token
```

### 6. Check Frontend
Open browser: https://werkules.com
- Should load login page
- Check browser console for errors

---

## Monitoring

Keep an eye on logs:

```bash
# Watch backend logs in real-time
pm2 logs myaiagent-backend

# Watch Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Watch Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Prevent Future Issues

### 1. Set PM2 to Auto-Restart on Crashes

```bash
pm2 startup
pm2 save
```

### 2. Increase PM2 Max Restarts

```bash
pm2 start npm --name "myaiagent-backend" -- start --max-restarts 10
```

### 3. Set Up Health Check Monitoring

Create a cron job to check health:

```bash
crontab -e
```

Add:
```
*/5 * * * * curl -f http://localhost:3000/health || (cd ~/MY_AI_AGENT/myaiagent-mvp/backend && pm2 restart myaiagent-backend)
```

---

## Still Not Working?

If none of the above fixes work:

1. **Check disk space:**
   ```bash
   df -h
   ```

2. **Check system resources:**
   ```bash
   free -h
   top
   ```

3. **Check system logs:**
   ```bash
   sudo journalctl -xe | tail -50
   ```

4. **Reboot the server (last resort):**
   ```bash
   sudo reboot
   ```

5. **After reboot, restart services:**
   ```bash
   pm2 resurrect
   sudo systemctl start nginx
   ```

---

## Contact Information

If you need to share diagnostic info, run:

```bash
cd ~/MY_AI_AGENT
./diagnose-502-error.sh > diagnostic-output.txt 2>&1
cat diagnostic-output.txt
```

Share the output for further assistance.
