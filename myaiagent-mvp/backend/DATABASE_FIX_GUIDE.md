# Database Migration Fix Guide

## Problem

The backend is experiencing database errors:
```
❌ Query error: error: relation "ai_agent_providers" does not exist
❌ Query error: error: relation "user_ai_agents" does not exist
❌ Metrics flush error: column "value" of relation "system_performance_metrics" does not exist
```

These errors occur because:

1. **Broken Migration Splitting**: The original code splits SQL files by `;` semicolons, which breaks PostgreSQL's `$$..$$` PL/pgSQL blocks that contain internal semicolons
2. **Type Mismatches**: The `users.id` column is `SERIAL` (INTEGER), but many tables try to reference it as `UUID`
3. **Missing Foreign Key Constraints**: Type mismatches cause foreign key constraints to fail silently, leaving tables uncreated

## Solution Overview

We've implemented three fixes:

### 1. **Fixed Server Initialization** (src/server.js)
- Changed `initializeDatabaseTablesOnStartup()` to `initializeDatabaseMigrationsOnStartup()`
- Now executes entire SQL files as single transactions instead of splitting by semicolon
- Handles all migrations (001-021) instead of just migration 020

### 2. **Created Proper Migration Runner** (src/scripts/runAllMigrations.js)
- Standalone script to execute all migrations in order
- Can be run independently for troubleshooting
- Returns proper exit codes for CI/CD integration

### 3. **Added Type Fix Migration** (migrations/021_fix_type_mismatches.sql)
- Converts all problematic UUID user_id columns to INTEGER
- Fixes foreign key constraints to match the base `users.id` type
- Safely handles cases where tables don't exist yet

## Implementation Steps

### Option A: Automatic (Recommended)
When you restart the backend, it will automatically:
1. Detect missing tables
2. Execute all migrations in order
3. Fix type mismatches
4. Create all required database objects

**Action**: Just restart the backend service:
```bash
pm2 restart myaiagent-backend
```

### Option B: Manual on EC2 Server
If auto-initialization fails, run migrations manually:

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to backend directory
cd /path/to/myaiagent-mvp/backend

# Make the fix script executable
chmod +x fix-database.sh

# Run the migration fixer (ensure DATABASE_URL is set)
export DATABASE_URL="postgresql://user:password@localhost/your_database"
./fix-database.sh
```

### Option C: Using Node.js Script
If you prefer using the Node.js migration runner:

```bash
cd /path/to/myaiagent-mvp/backend
npm install
node src/scripts/runAllMigrations.js
```

## What Each Migration Does

| Migration | Purpose |
|-----------|---------|
| 001 | Initial schema (users, conversations, messages, etc.) |
| 002 | Capability gaps tracking |
| 003 | AI self-improvement system |
| 007 | TTS preferences |
| 008 | Performance monitoring metrics |
| 009 | Email categorization |
| 010 | Opportunities management |
| 011 | Search history |
| 012 | URL content cache |
| 013 | SAM.gov cache |
| 014 | SAM.gov document analysis |
| 015 | FPDS contract awards |
| 016 | EVM tracking |
| 017 | Collaboration tools |
| 018 | Market analytics |
| 019 | Fix user_id type mismatches (old approach) |
| 020 | AI agent management (openai, anthropic, google, etc.) |
| 021 | **NEW** - Fix remaining type mismatches |
| create_telemetry_tables | Telemetry system |

## Verifying the Fix

After running migrations, verify the tables are created:

```bash
# Connect to your database
psql $DATABASE_URL

# Check if ai_agent_providers table exists
\dt ai_agent_providers

# List all tables
\dt

# Check users table type
\d users

# Check conversations user_id type
\d conversations
```

Expected output for `\d conversations`:
```
user_id | integer | not null
```

## Troubleshooting

### Error: "cannot execute CREATE TABLE in a read-only transaction"
- Your database connection is read-only
- Check DATABASE_URL permissions

### Error: "role does not exist"
- The database user doesn't have correct privileges
- Ensure your DATABASE_URL user can create tables

### Error: "foreign key constraint ... does not exist"
- A referenced table hasn't been created yet
- Run migrations in order (001, 002, 003, etc.)
- The auto-runner handles this automatically

### Error: "operator does not exist: uuid = integer"
- Type mismatch still exists
- Run migration 021 specifically:
  ```bash
  psql $DATABASE_URL -f migrations/021_fix_type_mismatches.sql
  ```

### Slow migration execution
- Large databases may take time
- Don't interrupt the process
- Each migration should complete within a few minutes

## Rolling Back (if needed)

If something goes wrong, you can drop and recreate the database:

```bash
# WARNING: This will delete all data!
psql $DATABASE_URL -c "DROP DATABASE IF EXISTS your_database;"
psql $DATABASE_URL -c "CREATE DATABASE your_database;"

# Then re-run migrations
./fix-database.sh
```

## Environment Variables

Ensure these are set before running migrations:

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost/database_name

# Optional (for backend startup)
NODE_ENV=production
JWT_SECRET=your_secret_key
ENCRYPTION_KEY=your_encryption_key
```

## Contact & Support

If migrations still fail after following this guide:

1. Check the PM2 logs:
   ```bash
   pm2 logs myaiagent-backend
   ```

2. Check PostgreSQL logs:
   ```bash
   sudo journalctl -u postgresql -n 50
   ```

3. Verify database connectivity:
   ```bash
   psql -c "select version();"
   ```

4. Review the migration files for any SQL syntax errors

## Files Modified

- `src/server.js` - Updated database initialization function
- `src/scripts/runAllMigrations.js` - New proper migration runner
- `migrations/021_fix_type_mismatches.sql` - New migration to fix types
- `fix-database.sh` - Helper script for manual execution
- `migrations/001_initial_schema.sql` - Added UUID extension

## Performance Considerations

- Initial migrations may take 1-5 minutes depending on database size
- Add indexes in migrations for commonly queried columns
- Type conversions on large tables take time (migrations handle this)
- No data loss during type conversions (safe CAST operations)

---

**Last Updated**: 2025-12-15
**Version**: 1.0
