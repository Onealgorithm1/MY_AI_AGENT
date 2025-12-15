# Deployment Guide - All Fixes Ready

## Status: ✅ READY TO DEPLOY

All fixes have been implemented and are ready for production deployment.

---

## What Was Fixed

### 1. Database Migrations ✅
- Fixed SQL syntax errors in 6 migration files
- Added 3 new comprehensive safety migrations
- Migration execution now handles DO blocks correctly

### 2. Database Schema ✅
- All required tables now have proper columns
- All indexes created with IF NOT EXISTS
- Triggers properly managed and deduplicated

### 3. API Fallback ✅
- Gemini API rate limits now automatically fallback to OpenAI
- Retry mechanism with up to 2 attempts
- User-friendly error messages

---

## Pre-Deployment Checklist

- [ ] All code changes reviewed
- [ ] No uncommitted changes in working directory
- [ ] Database backups created (if applicable)
- [ ] Team notified of deployment window
- [ ] Monitoring/alerting configured
- [ ] Rollback plan documented

---

## Deployment Steps

### Step 1: Push Code to Repository
```bash
cd /path/to/myaiagent-mvp
git status  # Verify changes
git add .
git commit -m "Fix: Database migrations, API fallback, and database schema consistency"
git push origin main
```

### Step 2: Pull on Production Server
```bash
cd /path/to/myaiagent-mvp
git pull origin main
```

### Step 3: Restart Backend Service

**Option A: Using PM2**
```bash
pm2 restart myaiagent-backend
pm2 logs myaiagent-backend

# Wait for these log messages:
# ✅ Database migrations completed
# ✅ Server listening on port 5000
```

**Option B: Using Docker**
```bash
docker-compose restart myaiagent-backend
docker-compose logs -f myaiagent-backend

# Wait for service to be healthy
```

**Option C: Manual Node.js**
```bash
cd myaiagent-mvp/backend
node src/server.js

# Wait for startup logs
```

### Step 4: Verify Deployment

```bash
# Test 1: Check migrations ran
curl https://werkules.com/api/ai-agents/configured-services \
  -H "Cookie: session=YOUR_SESSION" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "services": [...],
#   "total": 2,
#   "message": "2 service(s) configured..."
# }

# Test 2: Send test message
curl -X POST https://werkules.com/api/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION" \
  -d '{
    "content": "Hello, test message",
    "conversationId": 123,
    "model": "gemini-2.5-flash"
  }'

# Expected: 200 OK with response from AI
```

### Step 5: Monitor Logs

Watch backend logs for first 15 minutes:
```bash
pm2 logs myaiagent-backend --lines 50
```

**Good signs:**
```
✅ Database migrations completed (X executed, Y skipped)
✅ DO block executed successfully
✅ AI Agent tables initialized successfully
GET /configured-services - 200
POST /messages - 200
```

**Bad signs:**
```
❌ Critical migration failure
❌ syntax error at or near
❌ relation "X" does not exist
```

---

## Post-Deployment Verification

### Immediate (0-5 minutes)
- [ ] Backend service is running
- [ ] No error messages in logs
- [ ] `/api/ai-agents/configured-services` returns data
- [ ] Frontend loads without errors

### Short-term (5-30 minutes)
- [ ] Send test messages through UI
- [ ] Verify responses are received
- [ ] Check for any streaming issues
- [ ] Monitor error logs

### Extended (30 minutes - 1 hour)
- [ ] Test with multiple users
- [ ] Test with different message types
- [ ] Verify function calling works
- [ ] Check memory extraction

---

## Rollback Procedure

If critical issues are found:

### Quick Rollback (Last working commit)
```bash
cd /path/to/myaiagent-mvp
git revert HEAD  # Creates new commit that undoes latest changes
git push origin main
pm2 restart myaiagent-backend
```

### Full Rollback (To specific commit)
```bash
cd /path/to/myaiagent-mvp
git log --oneline  # Find good commit
git reset --hard <commit-hash>
git push origin main --force  # WARNING: Force push
pm2 restart myaiagent-backend
```

---

## Expected Log Output

### Successful Migration
```
🔍 Running database migrations...
📝 Executing DO block for table creation...
✅ DO block executed successfully
📝 Executing remaining migration statements...
📝 Found 41 remaining statements to execute
⏭️  Skipped (already exists): CREATE TABLE IF NOT EXISTS...
✅ Database migrations completed (X executed, 41 skipped)
🚀 werkules - Backend Server
📡 Server running on port 5000
```

### API Call Success
```
✅ Database connected
✅ CORS: Allowing request...
POST /messages - 200 (125ms)
📡 Starting streaming response to client...
✅ Streaming complete. Total chunks: 15, Response length: 450
```

### Graceful Fallback
```
⚠️ GEMINI RATE LIMIT DETECTED
🔄 Retrying with fallback provider: openai (gpt-4o)
✅ Streaming complete
```

---

## Monitoring & Alerts

### Key Metrics to Watch
1. **API Response Time**: Should be < 1 second for first chunk
2. **Error Rate**: Should be 0% for normal operations
3. **Fallback Rate**: Monitor if > 5% fallbacks per hour
4. **Database Connections**: Should not exceed pool limit

### Alert Thresholds
- [ ] Alert if API latency > 5 seconds
- [ ] Alert if error rate > 1%
- [ ] Alert if database connection fails
- [ ] Alert if migrations fail on restart

---

## After Deployment Support

### User-Facing Changes
None - all changes are internal fixes and improvements

### Monitoring Commands

```bash
# View recent logs
pm2 logs myaiagent-backend --lines 100

# View error logs
pm2 logs myaiagent-backend --err --lines 50

# View specific time period
pm2 logs myaiagent-backend --since "10 minutes ago"

# Monitor in real-time
pm2 monit
```

### Manual Health Check Script
```bash
#!/bin/bash
echo "=== Health Check ==="

# Test API endpoint
echo "Testing API endpoint..."
curl -s https://werkules.com/api/ai-agents/configured-services \
  -H "Cookie: session=test" | jq '.' || echo "FAILED"

# Check database
echo "Checking database connection..."
pm2 logs myaiagent-backend --lines 5 | grep -i "database connected"

# Check migrations
echo "Checking migrations..."
pm2 logs myaiagent-backend --lines 20 | grep -i "migration"

echo "=== End Health Check ==="
```

---

## Troubleshooting

### Issue: "Database initialization failed"
```bash
# Check logs for specific error
pm2 logs myaiagent-backend --err

# Solutions:
# 1. Wait 30 seconds and restart
pm2 restart myaiagent-backend

# 2. Run migration manually
psql $DATABASE_URL -f migrations/026_database_consistency.sql

# 3. Check database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Issue: "API returns 500 on messages"
```bash
# Check logs
pm2 logs myaiagent-backend --err --lines 50

# Check if it's a fallback error
pm2 logs myaiagent-backend | grep -i "fallback"

# Check API keys
curl https://werkules.com/api/secrets \
  -H "Cookie: session=YOUR_SESSION"
```

### Issue: "Streaming not working"
```bash
# Check for streaming errors
pm2 logs myaiagent-backend | grep -i "stream"

# Verify SSE headers
curl -i https://werkules.com/api/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION" \
  -d '{"content":"test","conversationId":1}'
```

---

## Success Criteria

### Deployment is successful if:
- ✅ Backend starts without errors
- ✅ All migrations complete successfully
- ✅ No "database initialization failed" errors
- ✅ API endpoints return 200 OK
- ✅ Messages are sent and received properly
- ✅ Streaming responses work smoothly
- ✅ No spike in error logs
- ✅ Response times are normal (< 2 seconds)

### Deployment has issues if:
- ❌ Migration errors appear in logs
- ❌ 500 errors from API endpoints
- ❌ Messages fail to send
- ❌ Streaming breaks
- ❌ Error rate > 1%
- ❌ Database connection errors

---

## Communication

### During Deployment
- Notify team: "Deploying database and API fallback fixes"
- Estimated duration: 5-10 minutes
- Potential impact: Brief service interruption

### After Deployment
- Confirm deployment successful
- Share log summary
- Highlight improvements:
  - Database migrations now stable
  - API fallback working (Gemini → OpenAI)
  - Better error messages

---

## Documentation References

See these files for detailed information:
- **DATABASE_FIXES_CHECKLIST.md** - Database migration details
- **API_FALLBACK_FIXES.md** - API fallback implementation details
- **COMPLETE_FIX_SUMMARY.md** - Complete overview of all fixes

---

## Deployment Complete ✅

Once all post-deployment verification passes, the deployment is complete.

Monitor for 24 hours for any issues. If no critical issues arise, all systems are functioning correctly.

Good luck with the deployment!
