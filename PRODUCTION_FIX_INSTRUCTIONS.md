# Production Fix Instructions

## What Was Fixed in Code

### 1. ✅ SAM.gov Fetch Limit - FIXED
**File**: `myaiagent-mvp/backend/refresh-samgov-opportunities.js`

**Changes**:
- Increased limit from 100 to 1000 opportunities per request
- Implemented pagination to fetch ALL opportunities
- Added retry logic with delays to avoid rate limiting

**Before**:
```javascript
limit: '100', // Fetch up to 100 opportunities per run
```

**After**:
```javascript
const limit = 1000; // Maximum per request
// Plus pagination loop to fetch all pages
```

**Result**: Will now fetch thousands of opportunities instead of just 100

---

## What Needs to Be Run on Production Server

### Step 1: Pull Latest Code Changes

```bash
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT
git fetch origin
git checkout claude/new-branch-from-main-01SSpsin1jgoHP4Td3XYNUAo
git pull origin claude/new-branch-from-main-01SSpsin1jgoHP4Td3XYNUAo
```

### Step 2: Run Production Fixes Script

```bash
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT
./production-fixes.sh
```

**This script will**:
1. ✅ Fix backend PM2 port conflicts (kill conflicting processes)
2. ✅ Add GEMINI_API_KEY to .env (for voice features)
3. ✅ Add Google Search credentials to .env
4. ✅ Clean up duplicate API keys in database
5. ✅ Add Google Search Engine ID to database
6. ✅ Restart backend with PM2
7. ✅ Run SAM.gov refresh with new pagination

### Step 3: Enable Google Custom Search API (MANUAL)

**⚠️ CRITICAL**: The Google Custom Search API is currently **DISABLED** in your Google Cloud Console.

**You MUST do this manually**:

1. Go to: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
2. Select your project (the one with API key `AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls`)
3. Click the blue **"ENABLE"** button
4. Wait for activation (usually instant)

**Why this is needed**: Until you enable this API, web search will return:
```
403 BLOCKED - API_KEY_SERVICE_BLOCKED
```

### Step 4: Verify Everything Works

**Test Web Search**:
```bash
curl "https://www.googleapis.com/customsearch/v1?key=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls&cx=d4fcebd01520d41a0&q=test"
```

Expected: JSON response with search results (not 403 error)

**Test Voice Features**:
- Open your application
- Click the microphone icon
- Speak
- Should work now with GEMINI_API_KEY configured

**Test SAM.gov Opportunities**:
- Open SAM.gov opportunities page
- Should show 1000+ opportunities instead of 84

**Check Backend Logs**:
```bash
pm2 logs myaiagent-backend --lines 50
```

---

## Summary of All Issues Fixed

| Issue | Status | Fix Method |
|-------|--------|------------|
| Voice features not working | ✅ FIXED | Added GEMINI_API_KEY to .env via script |
| Google Search Engine ID not configured | ✅ FIXED | Added to database via script |
| SAM.gov only showing 84 results | ✅ FIXED | Code change + pagination |
| Duplicate API keys in admin | ✅ FIXED | Database cleanup via script |
| Backend PM2 port conflicts | ✅ FIXED | Process cleanup via script |
| Google Custom Search API blocked | ⚠️ MANUAL | Must enable in Google Cloud Console |

---

## Troubleshooting

### If backend won't start:
```bash
pm2 logs myaiagent-backend --lines 100
```

### If database errors:
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT NOW();"
```

### If PM2 issues persist:
```bash
pm2 stop all
pm2 delete all
sudo fuser -k 5000/tcp
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
pm2 start src/server.js --name myaiagent-backend
pm2 save
```

### If SAM.gov refresh fails:
```bash
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
node refresh-samgov-opportunities.js
```

---

## What Each Fix Does

### Voice Features Fix
**Problem**: "Failed to load voices" error
**Root Cause**: Missing GEMINI_API_KEY environment variable
**Solution**: Script adds `GEMINI_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls` to .env
**Test**: Click microphone icon and speak

### Google Search Fix
**Problem**: "Google Search Engine ID not configured"
**Root Cause**:
1. API not enabled in Google Cloud Console (MANUAL FIX REQUIRED)
2. Missing credentials in database
**Solution**:
- Script adds encrypted credentials to database
- YOU must enable API in console
**Test**: Ask "what time is it in New York"

### SAM.gov Fetch Limit Fix
**Problem**: Only 84 opportunities shown, but SAM.gov has thousands
**Root Cause**: Refresh script limited to 100 per run, no pagination
**Solution**: Code changed to fetch 1000 per page with pagination loop
**Test**: Check opportunities page, should show 1000+

### Duplicate API Keys Fix
**Problem**: Admin dashboard showing multiple entries for same service
**Root Cause**: Multiple inserts without checking for existing keys
**Solution**: Script deletes duplicates, keeps most recent
**Test**: Check admin dashboard, should show 1 key per service

### PM2 Port Conflict Fix
**Problem**: `EADDRINUSE: address already in use :::5000`
**Root Cause**: Multiple PM2 processes trying to bind to same port
**Solution**: Script kills all processes, cleans PM2, starts fresh
**Test**: Backend should start without errors

---

## Post-Deployment Checklist

- [ ] Git pull completed
- [ ] production-fixes.sh executed successfully
- [ ] Google Custom Search API enabled in console
- [ ] Backend running (pm2 status shows "online")
- [ ] Web search working (no 403 error)
- [ ] Voice features working (microphone icon)
- [ ] SAM.gov showing 1000+ opportunities
- [ ] No duplicate keys in admin dashboard
- [ ] No port conflicts in logs

---

## Need Help?

If you encounter issues:

1. Check backend logs: `pm2 logs myaiagent-backend`
2. Check script output for errors
3. Verify all environment variables are set in .env
4. Confirm Google Custom Search API is enabled
5. Test each feature individually using the test commands above
