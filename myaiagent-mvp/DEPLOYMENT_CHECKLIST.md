# AI Agents Deployment Checklist

## Issue

The AI Agents page shows "Request failed with status code 404" when trying to load agents. This indicates the `/api/ai-agents` endpoint is not accessible on the deployed server.

## Root Cause

The backend code changes for AI agents support either:
- Haven't been deployed to production (Fly.io)
- Were deployed but the server needs to be restarted
- The database migrations haven't been run

## Deployment Steps

### Step 1: Verify Backend Code is Complete ✓

Check that these files exist in your codebase:
- ✓ `myaiagent-mvp/backend/src/routes/aiAgents.js` - AI agents route handlers
- ✓ `myaiagent-mvp/backend/migrations/020_add_user_ai_agents.sql` - Database schema
- ✓ `myaiagent-mvp/backend/src/server.js` - Must import and register the route

Verify `server.js` contains:
```javascript
import aiAgentsRoutes from './routes/aiAgents.js';
...
app.use('/api/ai-agents', aiAgentsRoutes);
```

### Step 2: Deploy to Fly.io

From the project root:

```bash
# Option A: Standard deployment
cd myaiagent-mvp
flyctl deploy

# Option B: Force rebuild (if needed)
flyctl deploy --no-cache

# Option C: From parent directory
flyctl deploy -w myaiagent-mvp
```

Monitor deployment:
```bash
flyctl logs -f
```

You should see logs indicating successful startup:
```
📡 Server running on port 3000
🌍 Environment: production
📍 Endpoints: ...
   - /api/ai-agents
```

### Step 3: Run Database Migrations

After deployment succeeds, run migrations on production:

```bash
# SSH into Fly.io instance
flyctl ssh console

# Navigate to backend
cd /app/myaiagent-mvp/backend

# Run migrations
npm run migrate
```

You should see output like:
```
✅ Migration 020_add_user_ai_agents.sql completed
✓ Tables created successfully
```

### Step 4: Verify Endpoint is Accessible

Test the endpoint from your local machine:

```bash
# Get your Fly.io app URL
APP_URL=$(flyctl apps info -j | jq -r '.app.name + ".fly.dev"')

# Test the endpoint (should return 401 if not authenticated, NOT 404)
curl -i https://$APP_URL/api/ai-agents/providers

# Expected: 401 Unauthorized (needs authentication)
# NOT expected: 404 Not Found
```

Or test with curl including auth token:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.fly.dev/api/ai-agents/providers
```

### Step 5: Verify in Browser

1. Log in to your application
2. Navigate to `/ai-agents` page
3. Should load without "404" error
4. Should show either:
   - "No AI Agents Connected" message, OR
   - List of connected agents

### Step 6: Clear Frontend Cache (if needed)

If you still see the 404 error after deployment:

1. Hard refresh the browser:
   - **Windows/Linux**: Ctrl + Shift + R
   - **Mac**: Cmd + Shift + R

2. Or clear browser cache and reload

## Troubleshooting

### Deployment Failed

```bash
# Check deployment logs
flyctl logs -f

# Look for errors like:
# - "Cannot find module './routes/aiAgents.js'"
# - "SyntaxError" in aiAgents.js
# - Database connection errors
```

### Endpoint Still Returns 404

1. **Verify file exists on server**:
   ```bash
   flyctl ssh console
   ls -la /app/myaiagent-mvp/backend/src/routes/aiAgents.js
   ```

2. **Check if server.js has the import**:
   ```bash
   flyctl ssh console
   grep "aiAgents" /app/myaiagent-mvp/backend/src/server.js
   ```

3. **Restart the server**:
   ```bash
   flyctl restart
   ```

### Migrations Failed

```bash
# Check if oauth_tokens table exists
flyctl ssh console
psql $DATABASE_URL -c "SELECT * FROM oauth_tokens LIMIT 1;"

# If table doesn't exist, migrations haven't run
# Try running them again
npm run migrate

# Check migration logs
psql $DATABASE_URL -c "SELECT * FROM migrations;" 
```

### 500 Error Instead of 404

If you're now getting a 500 error:
- Check logs: `flyctl logs -f`
- Likely causes:
  - Database connection issue
  - Missing database table
  - Encryption key not set
  - API key missing

## Verification Checklist

- [ ] Backend code has `aiAgents.js` route file
- [ ] `server.js` imports and registers the route
- [ ] Deployed to Fly.io with `flyctl deploy`
- [ ] Database migrations ran successfully (`npm run migrate`)
- [ ] Endpoint returns 200/401, NOT 404
- [ ] AI Agents page loads without errors
- [ ] "No AI Agents Connected" message displays (if no agents)
- [ ] "Connect Agent" button works and opens modal

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 404 Not Found | Route not registered | Run `flyctl deploy` and restart |
| 500 Server Error | Database error | Run migrations: `npm run migrate` |
| Blank page | Frontend cache | Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R) |
| Can't connect agents | Auth issue | Check JWT token is valid |
| Migration fails | Table exists | Migrations are idempotent, safe to rerun |

## Files Modified in This Release

- ✅ `myaiagent-mvp/backend/src/routes/aiAgents.js` - Complete route handlers
- ✅ `myaiagent-mvp/backend/migrations/020_add_user_ai_agents.sql` - Database schema
- ✅ `myaiagent-mvp/backend/src/server.js` - Route registration
- ✅ `myaiagent-mvp/frontend/src/pages/AIAgentsPage.jsx` - Improved error handling
- ✅ `myaiagent-mvp/frontend/src/components/AIAgentSelector.jsx` - Error handling
- ✅ `myaiagent-mvp/frontend/src/components/ConnectAIAgentModal.jsx` - UI improvements

## Quick Command Reference

```bash
# Deploy code
cd myaiagent-mvp && flyctl deploy

# Monitor deployment
flyctl logs -f

# Run migrations
flyctl ssh console
npm run migrate

# Restart server
flyctl restart

# Test endpoint
curl -H "Authorization: Bearer TOKEN" \
  https://your-app.fly.dev/api/ai-agents/providers
```

## Support

If issues persist after following these steps:
1. Check `flyctl logs -f` for specific error messages
2. Share the full error log
3. Verify database is running: `flyctl status`
4. Confirm DATABASE_URL environment variable is set: `flyctl config show`
