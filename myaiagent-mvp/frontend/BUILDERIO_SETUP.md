# Builder.io Development Environment Setup

This document explains how to configure the Werkules frontend for Builder.io's Fusion Execution Environment.

## Overview

The frontend is configured to work in multiple environments:
- **Local Development**: Uses `http://localhost:3000/api` with Vite proxy
- **Builder.io Environment**: Uses `https://werkules.com/api` directly
- **Production**: Uses relative path `/api` (same domain)

## Builder.io Configuration

### Setup Script
```bash
cd myaiagent-mvp/frontend
npm install
```

### Development Server Command
```bash
npm run dev
```

**Note:** You can use either `npm run dev` or `npm run dev:builderio`. The frontend now automatically detects Builder.io preview domains (fly.dev) and uses the production API.

### Development Server URL
```
http://localhost:5000
```
✅ Auto-detect dev server URL (enabled)

### Environment Variables (Optional)

The frontend automatically detects Builder.io preview domains and uses `https://werkules.com/api`. However, you can optionally set these variables in Builder.io's Environment Variables section for explicit configuration:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://werkules.com/api` | (Optional) Explicit API endpoint |
| `VITE_ENABLE_ENHANCED_STT` | `true` | Enable enhanced speech-to-text features |

**Automatic Detection:** The app automatically detects:
- Production domain (`werkules.com`) → Uses `/api`
- Builder.io preview (`*.fly.dev`, `*.builder.io`) → Uses `https://werkules.com/api`
- Localhost → Uses `http://localhost:3000/api` or `VITE_API_URL` if set

## How It Works

### Environment Files

1. **`.env.example`** - Template with localhost defaults for local development
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_ENABLE_ENHANCED_STT=true
   ```

2. **`.env.builderio`** - Builder.io specific configuration
   ```env
   VITE_API_URL=https://werkules.com/api
   VITE_ENABLE_ENHANCED_STT=true
   ```

3. **`.env.production`** - Production build configuration
   ```env
   VITE_API_URL=/api
   VITE_ENABLE_ENHANCED_STT=true
   ```

### NPM Scripts

- `npm run dev` - Local development (uses localhost backend)
- `npm run dev:builderio` - Builder.io development (uses production API)
- `npm run build` - Production build
- `npm run build:builderio` - Builder.io production build

### API Configuration

The `src/services/api.js` file automatically detects the environment with smart detection:

1. **Production Domain Detection**: If hostname is "werkules.com", uses `/api` (same-domain)
2. **Builder.io Preview Detection**: If hostname contains "fly.dev" or "builder.io", uses `https://werkules.com/api`
3. **Environment Variable**: Uses `VITE_API_URL` if set (highest priority for explicit config)
4. **Fallback**: Uses `http://localhost:3000/api` for local development

This means **Builder.io works automatically without any configuration!** The app detects it's running on a Builder.io preview domain and automatically connects to the production Werkules API.

### Vite Configuration

The `vite.config.js` is mode-aware:
- In `development` mode: Proxies API calls to localhost backend
- In `builderio` mode: Skips proxy, sends requests directly to production API
- In `production` mode: No proxy, uses same-domain `/api`

## Testing the Configuration

### 1. Verify Automatic Detection
When the app starts in Builder.io, check the browser console for:
```
🎯 Detected Builder.io preview - using production API
🔧 API Configuration: {
  hostname: "d856358853fa4bc3b3ca9164c3223a33-xxxxx.fly.dev",
  apiBaseURL: "https://werkules.com/api",
  mode: "development",
  viteApiUrl: undefined
}
```

You should see:
- ✅ "Detected Builder.io preview" message
- ✅ `apiBaseURL: "https://werkules.com/api"`
- ✅ No localhost references

### 2. Test Login
1. Navigate to `/login`
2. Use test credentials: `admin@myaiagent.com` / `admin123`
3. Check Network tab - API calls should go to `https://werkules.com/api/auth/login`
4. No errors about `localhost:3000`

### 3. Verify CORS
Ensure the backend at `https://werkules.com` has CORS configured to allow:
- Origin: Builder.io preview domains (*.fly.dev)
- Credentials: true (for cookies)

**Backend CORS Configuration Example:**
```javascript
// Add to your backend CORS config
const allowedOrigins = [
  'https://werkules.com',
  'https://www.werkules.com',
  /\.fly\.dev$/,  // Allow all Builder.io preview domains
  /\.builder\.io$/
];
```

## Troubleshooting

### Still Connecting to Localhost
**Symptoms**: Console shows `http://localhost:3000/api` instead of production API

**Solution**:
1. Check browser console for detection message
2. Verify hostname contains "fly.dev" or "builder.io"
3. Hard reload the page (Ctrl+Shift+R or Cmd+Shift+R)
4. Clear browser cache completely
5. Check if you're running in an iframe (Builder.io uses iframes for preview)

**Debug**: Open console and run:
```javascript
console.log('Hostname:', window.location.hostname);
```

If hostname doesn't contain "fly.dev", the automatic detection won't work. In this case, manually set the environment variable.

### API Calls Failing with CORS Errors
**Symptoms**: Network tab shows CORS preflight failures or blocked requests

**Solution**: Update backend CORS configuration to allow Builder.io preview domains

**Backend Configuration** (Express example):
```javascript
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://werkules.com',
      'https://www.werkules.com'
    ];

    // Allow Builder.io preview domains
    if (!origin ||
        allowedOrigins.includes(origin) ||
        origin.includes('.fly.dev') ||
        origin.includes('.builder.io')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
```

### Using Wrong API URL
**Solution**:
1. The app now auto-detects Builder.io domains, no manual configuration needed
2. If you still want to override, set `VITE_API_URL` in Builder.io environment variables
3. Restart dev server after changing environment variables
4. Clear browser cache and hard reload

### Authentication Issues
**Solution**:
1. Ensure `withCredentials: true` is set in axios (already configured)
2. Check that cookies are being sent with requests (Network tab → Request Headers)
3. Verify backend allows credentials in CORS (see above)
4. Check JWT token validity

### WebSocket Connection Failures
**Solution**:
1. Check if production API supports WebSocket connections
2. Verify WebSocket endpoint is accessible at `wss://werkules.com/ws`
3. Ensure CORS allows WebSocket upgrade headers

## Security Notes

- All API calls use `withCredentials: true` for secure cookie-based authentication
- CSRF tokens are automatically fetched and included in state-changing requests
- Environment variables prefixed with `VITE_` are safe to expose to the client

## Main Branch

Set in Builder.io: `main`

All pull requests will be sent to the main branch.
