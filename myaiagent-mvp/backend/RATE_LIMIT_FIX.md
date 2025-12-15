# Rate Limit Fix & Database Migration Guide

## Issues Fixed

### 1. Gemini API Rate Limit (429 Error)
**Problem**: The Gemini API free tier has a quota of 20 requests/day. When exceeded, requests fail with 429 (Too Many Requests) error.

**Solution**: Implemented automatic fallback to OpenAI when Gemini hits rate limits.

**Code Changes**:
- Updated `src/routes/messages.js` to import the fallback service
- Added `callAPIWithFallback()` helper function that:
  - Tries Gemini first
  - Catches 429 rate limit errors
  - Automatically falls back to OpenAI (`gpt-4o-mini`)
  - Falls back only if OpenAI API key is configured
- Updated both streaming and non-streaming API calls to use the fallback mechanism

### 2. Database Migration - Missing Columns
**Problem**: The `system_performance_metrics` table is missing required columns (`value`, `unit`, `metadata`), causing errors when the monitoring service tries to log metrics.

**Solution**: Created migration file `024_fix_metrics_columns.sql` that adds missing columns.

## How to Deploy the Fix

### On Production Server

Run the migration script with your production database URL:

```bash
cd myaiagent-mvp/backend

# Option 1: Using environment variable
DATABASE_URL="postgresql://user:password@host:5432/database" node run-remote-migration.js

# Option 2: Passing as argument
node run-remote-migration.js "postgresql://user:password@host:5432/database"
```

### Expected Output

```
🔄 Running database migrations...

📁 Found 24 migration files

⏳ Running migration: 001_initial_schema.sql
✅ Successfully applied: 001_initial_schema.sql

⏳ Running migration: 002_capability_gaps.sql
✅ Successfully applied: 002_capability_gaps.sql

... (other migrations)

⏳ Running migration: 024_fix_metrics_columns.sql
✅ Successfully applied: 024_fix_metrics_columns.sql

📊 Migration Summary:
   ✅ Succeeded: 24
   ⏭️  Skipped: 0
   ❌ Failed: 0

🎉 All migrations completed successfully!
```

## API Behavior After Fix

When Gemini API rate limit is hit:

1. **Request comes in** → System tries Gemini API first
2. **Gemini returns 429** → System detects rate limit error
3. **Fallback triggered** → System checks if OpenAI API key is configured
4. **OpenAI available** → Request is retried with OpenAI (gpt-4o-mini)
5. **Response returned** → User gets response from OpenAI instead

### Example Error Handling

If OpenAI is NOT configured:
```json
{
  "error": "Gemini API rate limited and OpenAI API key not configured. Please configure OpenAI in admin settings."
}
```

If fallback succeeds:
- Response is returned as normal (user doesn't see the fallback)
- Console logs show: `⚠️  Gemini rate limited (429). Attempting fallback to OpenAI...`

## Configuration Required

### API Keys Needed
- **Gemini API Key**: Primary AI provider (free tier: 20 requests/day)
- **OpenAI API Key**: Required for fallback (paid)

Both should be configured in the admin dashboard or environment variables.

### How to Configure
1. Log in to admin dashboard
2. Go to Settings → API Keys
3. Add/update OpenAI API key
4. Gemini will automatically fallback to OpenAI when rate limited

## Monitoring

### Check for Rate Limit Events
Look for these log messages:
```
⚠️  Gemini rate limited (429). Attempting fallback to OpenAI...
🟡 Falling back to OpenAI with gpt-4o-mini...
```

### Check Database Migration Status
After running migrations, verify the columns were added:

```sql
-- Check if columns exist in system_performance_metrics
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'system_performance_metrics'
ORDER BY ordinal_position;
```

Expected columns:
- `id` (SERIAL PRIMARY KEY)
- `timestamp` (TIMESTAMP)
- `metric_name` (VARCHAR)
- `value` (NUMERIC) ← NEW
- `unit` (VARCHAR) ← NEW  
- `tags` (JSONB)
- `metadata` (JSONB) ← NEW

## Troubleshooting

### Still Getting Rate Limit Errors?
1. Ensure OpenAI API key is configured
2. Verify OpenAI key is valid and has available quota
3. Check logs for specific error messages

### Migration Failed?
1. Ensure DATABASE_URL is correct
2. Check database connectivity: `psql <DATABASE_URL>`
3. Verify database user has DDL permissions (ALTER TABLE)
4. Run migration again - it's safe to re-run (already exists errors are skipped)

### Performance Issues?
If monitoring data logging is slowing down the system:
1. The monitoring service is non-blocking
2. Check that `system_performance_metrics` table has indexes
3. Consider archiving old monitoring data periodically

## Additional Resources

- Gemini API Rate Limits: https://ai.google.dev/gemini-api/docs/rate-limits
- OpenAI API Pricing: https://openai.com/pricing/
- Migration Scripts: See `migrations/` directory
