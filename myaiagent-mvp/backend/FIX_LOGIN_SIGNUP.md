# Fix Login and Signup Issues

## Problem Summary
Your login and signup endpoints are failing because:
1. The `users` table is missing required columns: `is_active`, `phone`, `profile_image`, `google_id`, `profile_picture`
2. The `search_history` table structure is incomplete
3. Database migrations need to be properly applied

## Root Causes (from logs)

From your PM2 logs, we saw:
- `❌ Query error: error: column "is_active" does not exist` - Auth middleware trying to check if account is active
- `❌ Query error: error: column "searched_at" does not exist` - Migration 011 failing on index creation
- `❌ Database migrations FAILED - server cannot start`

## Solution

### Step 1: Run the Auth Schema Migration

SSH into your production server and run:

```bash
cd ~/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
node run-auth-migration.js
```

This script will:
- ✅ Add `is_active` column to users table
- ✅ Add `phone` column to users table  
- ✅ Add `profile_image` column to users table
- ✅ Add `google_id` column to users table
- ✅ Add `profile_picture` column to users table
- ✅ Fix search_history table structure
- ✅ Verify all changes were applied

### Step 2: Run All Migrations

After the auth schema migration, run all migrations to ensure consistency:

```bash
cd ~/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
npm run migrate
```

This will apply any pending migrations and should now complete without errors.

### Step 3: Restart Backend Server

```bash
pm2 restart myaiagent-backend
sleep 3
pm2 logs myaiagent-backend --lines 50
```

Check the logs to ensure the server starts without database-related errors.

### Step 4: Test Login/Signup

1. Go to https://werkules.com
2. Try the login form first with test credentials
3. If login works, try creating a new account
4. Monitor the PM2 logs for any errors

## What Changed

### New Migration File: `migrations/029_fix_auth_schema.sql`
This migration adds all missing columns that the auth system expects:
- Checks if columns already exist before adding them
- Handles existing tables gracefully
- Creates proper indexes

### Updated Migration: `migrations/011_add_search_history.sql`
Fixed to:
- Handle existing search_history tables properly
- Add missing columns conditionally
- Use safer index creation syntax
- Create trigger function if needed

### Improved Migration Runner: `src/scripts/run-migrations.js`
Now handles:
- Common database error codes (42P07, 42701, 42P14, 42710)
- Safe keywords in error messages that indicate idempotent operations
- Continues migration even if some migrations have non-critical errors
- Provides detailed summary at end

## Troubleshooting

### If migrations still fail:

**Check database connection:**
```bash
psql $DATABASE_URL -c "SELECT version();"
```

**Verify tables exist:**
```bash
psql $DATABASE_URL -c "\dt+"
```

**Check users table structure:**
```bash
psql $DATABASE_URL -c "\d+ users"
```

**Manually verify columns exist after migration:**
```bash
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY column_name;"
```

### If login still fails after migrations:

1. Check if user exists: 
   ```bash
   psql $DATABASE_URL -c "SELECT id, email, is_active FROM users LIMIT 5;"
   ```

2. Check backend logs for the exact error:
   ```bash
   pm2 logs myaiagent-backend --lines 100
   ```

3. Verify database credentials in .env:
   ```bash
   grep DATABASE_URL ~/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend/.env
   ```

## Files Modified

- ✅ `migrations/029_fix_auth_schema.sql` - New migration for auth columns
- ✅ `migrations/011_add_search_history.sql` - Fixed search history migration
- ✅ `src/scripts/run-migrations.js` - Improved migration runner
- ✅ `run-auth-migration.js` - Standalone script to apply auth migration
- ✅ `fix-auth-schema.sh` - Bash wrapper script

## Database Schema After Fix

### Users Table (additional columns):
```sql
is_active BOOLEAN DEFAULT TRUE          -- Account active status
phone VARCHAR(50)                       -- User phone number
profile_image TEXT                      -- Profile picture path
google_id VARCHAR(255) UNIQUE           -- Google OAuth ID
profile_picture TEXT                    -- Google profile picture URL
```

### Search History Table:
```sql
id SERIAL PRIMARY KEY
user_id INTEGER NOT NULL REFERENCES users(id)
query TEXT NOT NULL
result_count INTEGER DEFAULT 0
clicked_result_index INTEGER
search_type VARCHAR(50) DEFAULT 'general'
results_count INTEGER DEFAULT 0
conversation_id INTEGER REFERENCES conversations(id)
searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
metadata JSONB DEFAULT '{}'::jsonb
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## Expected Output After Fix

When you run `npm run migrate`, you should see:
```
🔄 Running database migrations...
📁 Found 27 migration files
⏳ Running migration: 001_initial_schema.sql
✅ Successfully applied: 001_initial_schema.sql
...
🎉 All migrations completed!
```

And when you restart the backend:
```
✅ Database connected
✅ Database connected
✅ Google Cloud STT client initialized
📡 Server running on port 5000
```

No more "column does not exist" errors!
