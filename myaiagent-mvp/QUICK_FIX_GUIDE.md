# Quick Fix Guide: 404 and Authentication Errors

## Error 1: "404 Error - AI agents endpoint not registered"

### Root Cause
The `/api/ai-agents` endpoint is not registered on your backend server.

### Fix (Choose One)

**Option A: Deploy to Fly.io (PRODUCTION)**
```bash
cd myaiagent-mvp
flyctl deploy --no-cache
```

Wait for deployment to complete, then:
```bash
flyctl logs -f
```

You should see:
```
📡 Server running on port 3000
📍 Endpoints: ...
   - /api/ai-agents
```

**Option B: Run Locally (DEVELOPMENT)**
```bash
cd myaiagent-mvp/backend
npm run dev
```

Should show:
```
Server running on port 3000
Endpoints:
   - /api/ai-agents
```

### Verify the Fix
```bash
# Test the endpoint (replace TOKEN with your JWT token)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/ai-agents/providers

# Expected: 200 (success) or 401 (auth issue)
# NOT expected: 404 (not found)
```

If still 404 after deploy, the server may need to restart:
```bash
# For Fly.io
flyctl restart

# For local, restart the dev server
# Ctrl+C, then npm run dev again
```

---

## Error 2: "No authentication token found"

### Root Cause
The JWT token wasn't found in localStorage or the session expired.

### Quick Fixes

**Option 1: Log in again**
1. Go to the login page
2. Log in with your credentials
3. The token should be saved automatically
4. Try again

**Option 2: Hard refresh the browser**
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

**Option 3: Check if you're actually logged in**
- Can you see your profile/username in the top right?
- If not, you need to log in first
- AI Agents page requires authentication

**Option 4: Clear cache and cookies**
1. Open DevTools (F12)
2. Application → Storage → Local Storage
3. Look for `jwt` or `token` key
4. If empty/missing, log in again
5. Refresh the page

### Debug: Check if Token is Saved

Open browser DevTools (F12) and run:
```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('jwt') || localStorage.getItem('token'));

// Check if in cookies
console.log('Cookies:', document.cookie);
```

If empty, you need to log in. If present, the token might be invalid or expired.

---

## Checklist to Fix Both Issues

### For Production (Fly.io)

- [ ] Run: `cd myaiagent-mvp && flyctl deploy --no-cache`
- [ ] Wait for deployment to complete
- [ ] Check logs: `flyctl logs -f`
- [ ] Log in to the application
- [ ] Hard refresh: `Ctrl + Shift + R` (or `Cmd + Shift + R`)
- [ ] Navigate to `/ai-agents` page
- [ ] Should see "No AI Agents Connected" (NOT 404 error)

### For Local Development

- [ ] Run: `cd myaiagent-mvp/backend && npm run dev`
- [ ] Verify "Server running on port 3000" appears
- [ ] Log in to http://localhost:5000
- [ ] Navigate to `/ai-agents` page
- [ ] Should work without errors

---

## If Issues Persist

### For 404 Error Persisting

1. **Check if file exists on server**:
   ```bash
   flyctl ssh console
   ls -la /app/myaiagent-mvp/backend/src/routes/aiAgents.js
   ```
   If file doesn't exist, latest code wasn't deployed.

2. **Check if route is registered**:
   ```bash
   flyctl ssh console
   grep "ai-agents" /app/myaiagent-mvp/backend/src/server.js
   ```
   Should see: `app.use('/api/ai-agents', aiAgentsRoutes);`

3. **Check server logs for startup errors**:
   ```bash
   flyctl logs -f
   ```
   Look for "Cannot find module", "SyntaxError", or database errors

### For Authentication Issues

1. **Check browser console (F12)**:
   - Look for errors in the "Console" tab
   - Check "Network" tab to see if requests have `Authorization` header

2. **Verify token in storage**:
   ```javascript
   // In browser console
   localStorage.getItem('jwt') || localStorage.getItem('auth-storage')
   ```

3. **Test login API**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"your@email.com","password":"password"}'
   ```
   Should return JWT token

---

## Common Issues & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 404 Not Found | Backend not deployed | `flyctl deploy --no-cache` |
| 404 Not Found | Server not restarted | `flyctl restart` |
| No token found | Not logged in | Log in at `/login` |
| No token found | Session expired | Refresh page or log in again |
| 401 Unauthorized | Invalid/expired token | Log in again |
| 500 Server Error | Database issue | Check `flyctl logs -f` |

---

## Next Steps

Once both errors are fixed:

1. You should see "No AI Agents Connected" on `/ai-agents` page
2. Click "Connect Your First Agent"
3. Select a provider (e.g., OpenAI, Anthropic, Google)
4. Enter your API key and model name
5. Click "Connect"

If you configured OpenAI API key in the admin panel, it should show available providers automatically (coming soon feature).

---

## Support

If none of these fixes work:

1. **Collect debug info**:
   ```bash
   # Server logs
   flyctl logs -f > logs.txt
   
   # Check endpoint
   curl -v https://your-app.fly.dev/api/ai-agents/providers
   ```

2. **Share**:
   - Full error message from browser console
   - `flyctl logs` output
   - Whether you're on local or production (Fly.io)
   - Whether you can log in normally
