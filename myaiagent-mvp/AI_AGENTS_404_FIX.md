# AI Agents 404 Error - Troubleshooting Guide

## Problem

Users receive `Request failed with status code 404` error when:
- Trying to load AI agents in the chat page
- Accessing the AI Agents management page
- The system tries to fetch available AI agents from `GET /api/ai-agents/my-agents` or `GET /api/ai-agents/providers`

## Root Cause

The 404 error indicates the `/api/ai-agents` endpoint is not registered on the backend server. This can happen due to:

1. **Backend code not deployed** - The latest code with AI agents routes hasn't been pushed to production
2. **Route not registered** - The `aiAgents.js` route file isn't imported or registered in `server.js`
3. **Server not restarted** - After code changes, the server needs to be restarted for changes to take effect
4. **Database tables missing** - The migration hasn't been run on the database

## Diagnosis Steps

### Step 1: Test the Endpoint Locally

If running locally, test the endpoint:

```bash
cd myaiagent-mvp/backend
npm run test:endpoints
```

This will tell you:
- ✅ Route exists (status 200 or 401)
- ❌ Route not found (status 404)
- ❌ Server not running

### Step 2: Check Backend Code

Verify the route is registered in `server.js`:

```bash
grep "ai-agents" myaiagent-mvp/backend/src/server.js
```

You should see:
```javascript
import aiAgentsRoutes from './routes/aiAgents.js';
...
app.use('/api/ai-agents', aiAgentsRoutes);
```

If missing, add it:
```javascript
// After line 62 in imports section
import aiAgentsRoutes from './routes/aiAgents.js';

// After line 332 in route registration section  
app.use('/api/ai-agents', aiAgentsRoutes);
```

### Step 3: Run Database Migrations

Ensure the AI agents tables exist:

```bash
cd myaiagent-mvp/backend
npm run migrate
```

This creates the required tables:
- `user_ai_agents` - Stores connected AI agents
- `ai_agent_providers` - Stores provider metadata

### Step 4: Restart the Backend

After code changes, restart the server:

```bash
# Development
npm run dev

# Production (Fly.io)
flyctl deploy
```

## Solution Checklist

- [ ] **Step 1**: Verify code includes `aiAgents.js` route file
  - File path: `myaiagent-mvp/backend/src/routes/aiAgents.js`
  
- [ ] **Step 2**: Verify `server.js` imports and registers the route
  ```javascript
  import aiAgentsRoutes from './routes/aiAgents.js';
  app.use('/api/ai-agents', aiAgentsRoutes);
  ```

- [ ] **Step 3**: Run database migrations
  ```bash
  npm run migrate
  ```

- [ ] **Step 4**: Restart backend server
  - For development: `npm run dev`
  - For Fly.io: `flyctl deploy`

- [ ] **Step 5**: Test the endpoint
  ```bash
  npm run test:endpoints
  ```

## Common Fixes

### Fix 1: Deploy Latest Code to Fly.io

If the code exists locally but 404 persists on production:

```bash
# From project root
cd myaiagent-mvp
flyctl deploy --no-cache
```

### Fix 2: Restart Fly.io App

```bash
flyctl restart
```

### Fix 3: Run Migrations on Production

```bash
# SSH into the Fly.io instance
flyctl ssh console

# Run migrations
cd /app/myaiagent-mvp/backend
npm run migrate
```

### Fix 4: Check Fly.io Logs

```bash
flyctl logs
```

Look for errors like:
- `Cannot find module './routes/aiAgents.js'`
- `database error` 
- `connection refused`

## Testing the Fix

After applying fixes, test that the endpoint works:

### Option A: Using npm script
```bash
npm run test:endpoints
```

### Option B: Using curl
```bash
curl http://localhost:3000/api/ai-agents/providers
# Expected: 401 (needs authentication) or 200 (success)
# NOT expected: 404 (not found)
```

### Option C: Using the Frontend
1. Open the application
2. Navigate to `/ai-agents` page
3. Should load without "404" error
4. Should show "No AI agents connected yet" message (if none are set up)

## Verified Working Configuration

The following confirms the fix is successful:

✅ **Frontend**: AIAgentSelector loads without errors
✅ **Backend**: `/api/ai-agents/providers` returns data
✅ **Database**: `user_ai_agents` table exists and is accessible
✅ **Logs**: No 404 errors for `/api/ai-agents` routes

## Files Involved

- **Backend Routes**: `myaiagent-mvp/backend/src/routes/aiAgents.js`
- **Server Registration**: `myaiagent-mvp/backend/src/server.js` (line 63, 333)
- **Database Migration**: `myaiagent-mvp/backend/migrations/020_add_user_ai_agents.sql`
- **Frontend Component**: `myaiagent-mvp/frontend/src/components/AIAgentSelector.jsx`
- **Frontend Page**: `myaiagent-mvp/frontend/src/pages/AIAgentsPage.jsx`
- **Test Script**: `myaiagent-mvp/backend/test-ai-agents-endpoint.js`

## If Problem Persists

1. **Check server logs**:
   ```bash
   # Local development
   npm run dev
   # Watch for errors

   # Production
   flyctl logs -f
   ```

2. **Verify database connectivity**:
   - Ensure `DATABASE_URL` environment variable is set
   - Test database connection: `psql $DATABASE_URL -c "SELECT 1"`

3. **Check Node.js version**:
   ```bash
   node --version
   # Should be v18 or higher
   ```

4. **Clear cache and rebuild**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

## Contact Support

If the issue persists after following these steps:
1. Run `npm run test:endpoints` and share the output
2. Share relevant backend logs from `flyctl logs`
3. Confirm code changes have been deployed with `git log --oneline -5`
4. Verify database migrations were run

## Prevention

To prevent this issue in the future:

1. **Always deploy after code changes**:
   ```bash
   flyctl deploy
   ```

2. **Run migrations on new deployments**:
   ```bash
   # After deployment, verify migrations:
   npm run migrate
   ```

3. **Monitor logs after deployment**:
   ```bash
   flyctl logs -f
   # Watch for errors during initial requests
   ```

4. **Test endpoints after deployment**:
   ```bash
   npm run test:endpoints
   ```
