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
npm run dev:builderio
```

### Development Server URL
```
http://localhost:5000
```
✅ Auto-detect dev server URL (enabled)

### Environment Variables

Set these in Builder.io's Environment Variables section:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://werkules.com/api` | Production Werkules API endpoint |
| `VITE_ENABLE_ENHANCED_STT` | `true` | Enable enhanced speech-to-text features |

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

The `src/services/api.js` file automatically detects the environment:

1. **Production Domain Detection**: If hostname contains "werkules.com", uses `/api`
2. **Environment Variable**: Uses `VITE_API_URL` if set
3. **Fallback**: Uses `http://localhost:3000/api` for local development

### Vite Configuration

The `vite.config.js` is mode-aware:
- In `development` mode: Proxies API calls to localhost backend
- In `builderio` mode: Skips proxy, sends requests directly to production API
- In `production` mode: No proxy, uses same-domain `/api`

## Testing the Configuration

### 1. Verify Environment Variables
When the app starts, check the browser console:
```
🔧 Vite Config Mode: builderio
🔧 VITE_API_URL: https://werkules.com/api
🔧 API Configuration: {
  hostname: "localhost",
  apiBaseURL: "https://werkules.com/api",
  mode: "builderio",
  viteApiUrl: "https://werkules.com/api"
}
```

### 2. Test Login
1. Navigate to `/login`
2. Use test credentials: `admin@myaiagent.com` / `admin123`
3. Check Network tab - API calls should go to `https://werkules.com/api/auth/login`

### 3. Verify CORS
Ensure the backend at `https://werkules.com` has CORS configured to allow:
- Origin: Builder.io preview domain
- Credentials: true (for cookies)

## Troubleshooting

### API Calls Failing with CORS Errors
**Solution**: Update backend CORS configuration to allow Builder.io preview domain

### Using Wrong API URL
**Solution**:
1. Check `VITE_API_URL` environment variable in Builder.io
2. Restart dev server after changing environment variables
3. Clear browser cache and hard reload

### Authentication Issues
**Solution**:
1. Ensure `withCredentials: true` is set in axios (already configured)
2. Check that cookies are being sent with requests
3. Verify JWT token is valid

### WebSocket Connection Failures
**Solution**:
1. Check if production API supports WebSocket connections
2. Verify WebSocket endpoint is accessible at `wss://werkules.com/ws`

## Security Notes

- All API calls use `withCredentials: true` for secure cookie-based authentication
- CSRF tokens are automatically fetched and included in state-changing requests
- Environment variables prefixed with `VITE_` are safe to expose to the client

## Main Branch

Set in Builder.io: `main`

All pull requests will be sent to the main branch.
