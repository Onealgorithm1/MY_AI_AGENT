# Real-Time STT Issue - Root Cause & Solution

## Problem Summary
Real-time Speech-to-Text transcription is not showing in the chat bubble while speaking. The system is using the **standard REST STT** instead of the **enhanced WebSocket STT**.

## Console Evidence
```
useStreamingSTT.js:49 🎤 Recording started
useStreamingSTT.js:80 🎤 Audio recorded
useStreamingSTT.js:89 ✅ Transcript received: Testing. Testing, testing.
```
These logs confirm the **standard STT** is being used (REST API, no real-time updates).

## Root Cause Analysis

### 1. Environment Variable Not Baked Into Build
- `.env.production` has `VITE_ENABLE_ENHANCED_STT=true` ✅
- But the deployed JavaScript bundle was built WITHOUT this variable
- Vite only bakes `VITE_*` variables into the build at **build time**
- If you change `.env` after building, it won't affect the deployed app

### 2. Code Flow Explanation
**ChatPage.jsx line 109:**
```javascript
const useEnhancedMode = import.meta.env.VITE_ENABLE_ENHANCED_STT !== 'false';
```

**What this means:**
- If `VITE_ENABLE_ENHANCED_STT` is undefined → uses enhanced mode ✅
- If `VITE_ENABLE_ENHANCED_STT` is `'true'` → uses enhanced mode ✅
- If `VITE_ENABLE_ENHANCED_STT` is `'false'` → uses standard mode ❌

**Your deployed build** has this variable as `undefined` or `'false'`, causing standard STT to be used.

### 3. Backend Ready ✅
The backend WebSocket STT service is **fully implemented** and ready:
- `backend/src/websocket/sttStream.js` exists
- `createSTTWebSocketServer()` is initialized in server.js:368
- Route `/stt-stream` is configured

## Solution: Rebuild Frontend

### Step 1: Verify Environment File
```bash
cd myaiagent-mvp/frontend
cat .env.production
```

Should contain:
```
VITE_API_URL=https://werkules.com/api
VITE_WS_URL=wss://werkules.com
VITE_ENABLE_ENHANCED_STT=true
```

### Step 2: Clean Build
```bash
# Clean old build
rm -rf dist/

# Install dependencies (if needed)
npm install

# Build with production env
npm run build
```

### Step 3: Verify Build Contains Variable
```bash
# Check if VITE_ENABLE_ENHANCED_STT made it into the build
grep -r "VITE_ENABLE_ENHANCED_STT" dist/assets/ | head -3
```

Expected: Should find references to this variable in the bundled JS

### Step 4: Deploy New Build
```bash
# Copy new build to production
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
```

### Step 5: Clear Browser Cache
**Critical**: After deployment, clear browser cache or force refresh:
- Chrome/Firefox: `Ctrl + Shift + R` (Windows/Linux)
- Mac: `Cmd + Shift + R`
- Or use Incognito/Private browsing mode

### Step 6: Verify Real-Time STT
After reloading, you should see:
1. **Badge in chat bubble**: "Real-time" (green) instead of "Standard"
2. **Console logs**: `useEnhancedSTT.js` instead of `useStreamingSTT.js`
3. **Partial transcripts**: Text appears as you speak, not after you stop
4. **WebSocket connection**: `✅ WebSocket STT connected` in console

## Alternative: Quick Deploy Script
Create `redeploy-frontend.sh`:
```bash
#!/bin/bash
cd myaiagent-mvp/frontend
echo "Building frontend with production settings..."
rm -rf dist/
npm run build

echo "Deploying to production..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

echo "✅ Frontend redeployed!"
echo "🔄 Clear your browser cache and reload"
```

## Additional Issues Found

### Telemetry 403 Errors
```
POST https://werkules.com/api/telemetry/event 403 (Forbidden)
```

**Possible causes:**
1. CSRF token missing or invalid for telemetry endpoint
2. Telemetry endpoint requires authentication but token is expired
3. Rate limiting on telemetry endpoint

**Check:**
```bash
# Check telemetry route auth requirements
grep -A 10 "telemetry" myaiagent-mvp/backend/src/routes/telemetry.js
```

**Quick fix**: Disable telemetry temporarily if not critical:
```javascript
// In frontend .env.production
VITE_TELEMETRY_ENABLED=false
```

### Storage Quota Exceeded
```
Failed to cache audio: QuotaExceededError
```

**Already handled**: Code automatically prunes cache (audioCache.js:124)

## Troubleshooting

### If Real-Time STT Still Doesn't Work After Rebuild:

1. **Check WebSocket connection in browser console:**
   ```
   ✅ Should see: "WebSocket STT connected"
   ❌ If see: "WebSocket failed, falling back to REST"
   ```

2. **Check WebSocket URL is correct:**
   ```javascript
   // Should be: wss://werkules.com/stt-stream
   // Check browser Network tab → WS filter
   ```

3. **Check backend logs:**
   ```bash
   # Check if WebSocket server started
   sudo journalctl -u myaiagent-backend -f | grep STT
   ```

4. **Verify firewall allows WebSocket:**
   ```bash
   # WebSocket uses same port as HTTPS (443)
   sudo ufw status | grep 443
   ```

## Expected Behavior After Fix

### Before (Current - Standard STT):
- No text while speaking
- Badge shows "Standard"
- Transcript appears only after stopping
- Console: `useStreamingSTT.js`

### After (Enhanced STT):
- Text appears in real-time as you speak
- Badge shows "Real-time" with green Wi-Fi icon
- Partial transcripts update live
- Console: `useEnhancedSTT.js`, `WebSocket STT connected`
- VAD auto-stops after 1.5s of silence

## Summary
**The fix is simple**: Rebuild the frontend with `VITE_ENABLE_ENHANCED_STT=true` in the environment and redeploy. The backend is already fully ready for WebSocket streaming STT.
