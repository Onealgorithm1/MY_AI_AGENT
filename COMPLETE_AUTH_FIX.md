# Complete Authentication Fix Guide

## Current Issues
1. ❌ Cannot login as admin
2. ❌ Normal users getting logged out immediately after signup
3. ❌ Nginx stripping `/api` from requests
4. ❌ JWT cookies not persisting

## Root Causes
1. **Nginx Configuration**: `proxy_pass http://localhost:5000` strips `/api` prefix
2. **Cookie Settings**: SameSite=None requires Secure flag (HTTPS)
3. **CORS Headers**: Not properly configured through nginx

---

## Fix 1: Nginx Configuration

### Current (WRONG):
```nginx
location /api/ {
    proxy_pass http://localhost:5000;  # ❌ This strips /api
}
```

### Fixed (CORRECT):
```nginx
location /api/ {
    proxy_pass http://localhost:5000/api/;  # ✅ This preserves /api

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # Don't override Origin - let it pass through
    # proxy_set_header Origin $http_origin;  # Remove this line

    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
}
```

### Apply the fix:
```bash
sudo nano /etc/nginx/sites-available/myaiagent

# Change line:
#   proxy_pass http://localhost:5000;
# To:
#   proxy_pass http://localhost:5000/api/;

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Fix 2: Backend Server Configuration

Check that server.js has correct CORS settings for production:

```javascript
// In server.js around line 128-187
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin requests)
    if (!origin) {
      return callback(null, true);
    }

    // Allow werkules.com and www.werkules.com
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject all other origins in production
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,  // ✅ CRITICAL for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};
```

---

## Testing Steps

### Step 1: Verify Nginx Configuration
```bash
# Check the proxy_pass line
sudo cat /etc/nginx/sites-available/myaiagent | grep -A 5 "location /api"

# Should show:
# location /api/ {
#     proxy_pass http://localhost:5000/api/;
```

### Step 2: Test Backend Directly
```bash
# Get CSRF token
curl -s -c /tmp/cookies.txt https://werkules.com/api/csrf-token | jq .

# Extract CSRF token
CSRF_TOKEN=$(curl -s -c /tmp/cookies.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)

# Test login (should return 200 with JWT cookie)
curl -v -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/cookies.txt \
  -c /tmp/cookies.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}'

# Check if JWT cookie was set
cat /tmp/cookies.txt | grep jwt
```

### Step 3: Check Backend Logs
```bash
# Clear logs and watch
pm2 flush
pm2 logs myaiagent-backend --lines 0

# In another terminal, try to login from browser
# Watch for these patterns in logs:
# ✅ POST /api/auth/login - 200    (GOOD)
# ❌ POST /login - 401             (BAD - nginx stripping /api)
```

### Step 4: Test Full Flow in Browser

1. **Open Browser DevTools** (F12) → Network tab
2. **Navigate to** `https://werkules.com/login`
3. **Watch for CSRF token request**:
   - Should be: `GET https://werkules.com/api/csrf-token` → 200 OK
   - Should set cookie: `csrf-token=...`
4. **Try to login** with `admin@myaiagent.com` / `admin123`
   - Request should be: `POST https://werkules.com/api/auth/login`
   - Should return: 200 OK with JWT cookie
5. **Check cookies**:
   - Application tab → Cookies → `https://werkules.com`
   - Should see: `jwt`, `csrf-token`
6. **Should redirect to dashboard** and stay logged in

---

## Common Issues and Solutions

### Issue: "Invalid CSRF token"
**Cause**: CSRF cookie not being sent with request
**Fix**: Clear browser cookies and try again

### Issue: "POST /login - 401" in logs (missing /api)
**Cause**: Nginx stripping `/api` prefix
**Fix**: Update nginx `proxy_pass` to include `/api/`

### Issue: User logged out immediately after login/signup
**Cause**: JWT cookie not being set or not sent
**Fix**:
1. Check browser cookies after login
2. Verify `withCredentials: true` in frontend API config
3. Check CORS `credentials: true` in backend

### Issue: CORS error in browser
**Cause**: Origin not allowed
**Fix**: Add origin to `allowedOrigins` in server.js

---

## Quick Fix Script

Run this on EC2 to apply all fixes:

```bash
#!/bin/bash

echo "🔧 Applying Complete Authentication Fix..."

# 1. Fix Nginx Configuration
sudo sed -i 's|proxy_pass http://localhost:5000;|proxy_pass http://localhost:5000/api/;|g' \
  /etc/nginx/sites-available/myaiagent

# 2. Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx

# 3. Restart backend
pm2 restart myaiagent-backend

# 4. Wait for startup
sleep 5

# 5. Test login
CSRF_TOKEN=$(curl -s -c /tmp/cookies.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)

echo "Testing login..."
curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/cookies.txt \
  -c /tmp/cookies.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}' | jq .

# 6. Check logs
echo ""
echo "Recent backend logs:"
pm2 logs myaiagent-backend --lines 10 --nostream

echo ""
echo "✅ Fix applied! Test in browser: https://werkules.com/login"
```

---

## Verification Checklist

- [ ] Nginx shows `proxy_pass http://localhost:5000/api/;`
- [ ] Backend logs show `POST /api/auth/login - 200`
- [ ] Browser Network tab shows `/api/csrf-token` → 200 OK
- [ ] Browser Network tab shows `/api/auth/login` → 200 OK
- [ ] Browser cookies include `jwt` and `csrf-token`
- [ ] After login, user stays logged in (not redirected to login)
- [ ] After signup, user stays logged in (not redirected to login)
- [ ] Refreshing page keeps user logged in

---

## Emergency Reset

If nothing works, reset everything:

```bash
# 1. Kill all backend processes
pm2 delete all
sudo killall -9 node

# 2. Reset nginx config from template
sudo cp /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/nginx.conf \
     /etc/nginx/sites-available/myaiagent

# Edit to add /api/ to proxy_pass line
sudo nano /etc/nginx/sites-available/myaiagent

# 3. Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# 4. Start backend fresh
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
pm2 start npm --name "myaiagent-backend" -- start
pm2 save

# 5. Clear browser cookies and test
```
