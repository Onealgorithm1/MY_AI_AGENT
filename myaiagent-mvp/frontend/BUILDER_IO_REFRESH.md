# Refreshing Builder.io to Pick Up Latest Changes

The Builder.io automatic detection fix has been deployed to the `main` branch. To get Builder.io to use the latest code, follow these steps:

## Quick Fix

1. **Stop the current development session** in Builder.io
2. **Start a new session** - Builder.io will pull the latest code from `main`
3. **Clear browser cache** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)

## Detailed Steps

### 1. Stop Current Session

In Builder.io's Fusion interface:
- Click the "Stop" button or close the current development session
- This ensures Builder.io doesn't reuse cached code

### 2. Start New Session

- Click "Start Development" again
- Builder.io will:
  - Clone the latest code from the `main` branch
  - Run `cd myaiagent-mvp/frontend && npm install`
  - Run `npm run dev:builderio`

### 3. Verify Latest Code Is Loaded

Once the dev server starts, open the browser console and look for:

```
🎯 Detected Builder.io preview - using production API
🔧 API Configuration: {
  hostname: "d856358853fa4bc3b3ca9164c3223a33-xxxxx.fly.dev",
  apiBaseURL: "https://werkules.com/api",
  ...
}
```

**What you should see:**
- ✅ "Detected Builder.io preview" message
- ✅ `apiBaseURL: "https://werkules.com/api"`
- ✅ No localhost references
- ✅ No "ERR_CONNECTION_REFUSED" errors

**What you should NOT see:**
- ❌ "Using fallback: http://localhost:3000/api"
- ❌ `apiBaseURL: "http://localhost:3000/api"`
- ❌ Connection refused errors

### 4. Hard Refresh Browser

Even after Builder.io pulls new code, your browser might cache the old JavaScript bundle:

**Chrome/Edge:**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Firefox:**
- Windows/Linux: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Or manually:**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## Alternative: Force Code Update

If stopping/starting the session doesn't work:

### Option 1: Make a Small Commit

Sometimes Builder.io needs to see a new commit to pull:

```bash
# Make a trivial change
echo "# Updated $(date)" >> myaiagent-mvp/frontend/README.md
git add .
git commit -m "Trigger Builder.io refresh"
git push origin main
```

Then restart the Builder.io session.

### Option 2: Check Builder.io Git Settings

Verify Builder.io is pointing to the right branch:

1. Go to Builder.io project settings
2. Check "Main Branch Name" is set to: `main`
3. Check "Connected Repository" is: `Onealgorithm1/MY_AI_AGENT`

### Option 3: Disconnect and Reconnect Repository

1. Go to Builder.io project settings
2. Disconnect the repository
3. Reconnect it
4. This forces a fresh clone

## Troubleshooting

### Still Seeing Localhost in Console

**Problem:** Console still shows `http://localhost:3000/api`

**Solutions:**
1. Verify you're on the latest code:
   - In Builder.io terminal, run: `git log --oneline -3`
   - Should show: `ebf632b Fix Builder.io environment to automatically use production API`

2. Check the actual api.js file:
   ```bash
   cat myaiagent-mvp/frontend/src/services/api.js | grep -A 5 "fly.dev"
   ```

   Should show:
   ```javascript
   // If on Builder.io preview domain (fly.dev), use production API
   if (hostname.includes('fly.dev') || hostname.includes('builder.io')) {
     console.log('🎯 Detected Builder.io preview - using production API');
     return 'https://werkules.com/api';
   }
   ```

3. Clear ALL caches:
   - Builder.io: Restart session
   - Browser: Hard refresh + clear cache
   - Vite: Stop server, delete `node_modules/.vite`, restart

### Verification Commands

Run these in Builder.io's terminal to verify:

```bash
# Check you're on main branch with latest code
git branch
git log --oneline -3

# Verify the fix is in the code
grep -n "fly.dev" myaiagent-mvp/frontend/src/services/api.js

# Should output:
# 16:    if (hostname.includes('fly.dev') || hostname.includes('builder.io')) {
```

## Expected Result

After following these steps, when you open your app in Builder.io preview:

1. **Console shows:**
   ```
   🎯 Detected Builder.io preview - using production API
   🔧 API Configuration: {
     apiBaseURL: "https://werkules.com/api",
     ...
   }
   ```

2. **Network tab shows:**
   - All API calls go to `https://werkules.com/api/*`
   - No localhost references
   - No connection errors

3. **Login works:**
   - Can login with `admin@myaiagent.com` / `admin123`
   - Cookies are set correctly
   - No CORS errors (if backend CORS is configured)

## Still Having Issues?

If after all these steps it still doesn't work:

1. Check the browser's **actual** hostname:
   ```javascript
   // In browser console
   console.log('Hostname:', window.location.hostname);
   // Should contain: fly.dev
   ```

2. Check if code is being served from iframe:
   ```javascript
   // In browser console
   console.log('In iframe:', window !== window.top);
   ```

3. Check the git commit hash in Builder.io:
   ```bash
   git rev-parse HEAD
   # Should be: ebf632b or later
   ```

4. Look for JavaScript errors in console that might prevent code from loading

5. Check Builder.io logs for build errors

## Summary

**Quickest fix:**
1. Stop Builder.io session
2. Start new Builder.io session
3. Hard refresh browser (Ctrl+Shift+R)
4. Check console for "Detected Builder.io preview" message

The fix is already on `main` - Builder.io just needs to pull it!
