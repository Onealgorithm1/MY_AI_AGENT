# 🔄 Manual Database Migration Guide

## Overview
You need to run **3 migrations** in order to enable the multitenancy role-based system. These are safe, backward-compatible migrations.

**Run in this order:**
1. Migration 037 - Expand Role System
2. Migration 038 - Link API Keys to Organizations  
3. Migration 039 - Update Organization User Roles

---

## How to Connect to Your Database

### Option 1: Using `psql` (PostgreSQL CLI)
```bash
psql -h <your-host> -U <your-username> -d <your-database>
```

### Option 2: Using your database client
- **pgAdmin**: Web interface
- **DBeaver**: Desktop app
- **VS Code**: SQL extension
- **Neon Console**: If using Neon hosting

---

## Migration 1️⃣: Expand Role System (037)

**Purpose:** Add `master_admin` and `superadmin` roles to the users table

**Copy and paste this entire script:**

```sql
-- Migration 037: Expand Role System
-- Purpose: Add master_admin and superadmin roles to support hierarchical access control
-- This migration is backward compatible - existing 'admin' role remains unchanged

DO $$
BEGIN
  -- Check if users table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Drop existing role constraint
    BEGIN
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;

    -- Add new constraint with expanded roles
    ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('user', 'admin', 'moderator', 'master_admin', 'superadmin'));

    -- Migrate existing admin@myaiagent.com to master_admin role
    UPDATE users SET role = 'master_admin' 
    WHERE email = 'admin@myaiagent.com' AND role = 'admin';

    RAISE NOTICE 'Successfully updated users table with expanded role system';
  ELSE
    RAISE NOTICE 'Users table does not exist yet';
  END IF;
END $$;

-- Create indexes for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role_master ON users(role) 
  WHERE role IN ('master_admin', 'superadmin');
```

**Expected output:**
```
NOTICE:  Successfully updated users table with expanded role system
NOTICE:  CREATE INDEX
```

---

## Migration 2️⃣: Link API Keys to Organizations (038)

**Purpose:** Add organization_id column to api_secrets table for per-org API keys

**Copy and paste this entire script:**

```sql
-- Migration 038: Link API Keys to Organizations
-- Purpose: Allow each organization to have their own API keys while maintaining backward compatibility
-- Existing keys (organization_id = NULL) are treated as global system keys

DO $$
BEGIN
  -- Check if api_secrets table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_secrets') THEN
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'api_secrets' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE api_secrets ADD COLUMN organization_id INTEGER;
      
      -- Add foreign key constraint
      ALTER TABLE api_secrets ADD CONSTRAINT fk_api_secrets_org_id
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
      
      RAISE NOTICE 'Added organization_id column to api_secrets table';
    ELSE
      RAISE NOTICE 'organization_id column already exists on api_secrets table';
    END IF;

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_api_secrets_org ON api_secrets(organization_id);
    CREATE INDEX IF NOT EXISTS idx_api_secrets_org_service ON api_secrets(organization_id, service_name);
    CREATE INDEX IF NOT EXISTS idx_api_secrets_active_org ON api_secrets(is_active, organization_id);

  ELSE
    RAISE NOTICE 'api_secrets table does not exist yet';
  END IF;
END $$;

-- Document the migration:
-- - Existing API keys have organization_id = NULL (system/global keys)
-- - New keys created by org admins will have organization_id set
-- - API key resolution: try org key first, then fall back to global key
-- - This maintains backward compatibility with existing system
```

**Expected output:**
```
NOTICE:  Added organization_id column to api_secrets table
NOTICE:  CREATE INDEX (x3)
```

---

## Migration 3️⃣: Update Organization User Roles (039)

**Purpose:** Ensure organization_users role constraint supports admin/member/owner roles

**Copy and paste this entire script:**

```sql
-- Migration 039: Update Organization User Roles
-- Purpose: Ensure organization_users.role constraint is properly set for role-based access control

DO $$
BEGIN
  -- Check if organization_users table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_users') THEN
    -- Drop existing role constraint if present
    BEGIN
      ALTER TABLE organization_users DROP CONSTRAINT IF EXISTS organization_users_role_check;
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;

    -- Add constraint with all required roles: owner, admin, member
    ALTER TABLE organization_users ADD CONSTRAINT organization_users_role_check 
      CHECK (role IN ('owner', 'admin', 'member'));

    -- Create indexes for role-based queries
    CREATE INDEX IF NOT EXISTS idx_org_users_role_admin ON organization_users(organization_id, role)
      WHERE role IN ('admin', 'owner');

    RAISE NOTICE 'Successfully updated organization_users table role constraints';
  ELSE
    RAISE NOTICE 'organization_users table does not exist yet';
  END IF;
END $$;

-- Role Hierarchy:
-- - owner: Created automatically when user creates organization
-- - admin: Can manage org users, API keys, settings
-- - member: Regular user with access to org features only
```

**Expected output:**
```
NOTICE:  Successfully updated organization_users table role constraints
NOTICE:  CREATE INDEX
```

---

## Verification

After running all 3 migrations, verify they worked:

### Check if roles were added correctly:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';
```

### Check if admin@myaiagent.com was migrated:
```sql
SELECT id, email, role FROM users WHERE email = 'admin@myaiagent.com';
```
Expected: role should be `master_admin`

### Check if api_secrets.organization_id was added:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'api_secrets' AND column_name = 'organization_id';
```
Expected: Returns one row with `organization_id`

### Check organization_users constraints:
```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'organization_users' AND constraint_name LIKE '%role%';
```
Expected: Returns constraint names

### Verify all indexes were created:
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('users', 'api_secrets', 'organization_users') 
ORDER BY indexname;
```

---

## What Each Migration Does

| Migration | Changes | Impact |
|-----------|---------|--------|
| **037** | Adds `master_admin`, `superadmin` to users.role | System admins can now manage entire system |
| **038** | Adds `organization_id` to api_secrets | Organizations can have separate API keys |
| **039** | Updates organization_users role constraint | Proper role hierarchy (owner/admin/member) |

---

## ⚠️ Important Notes

1. **Run migrations in order** - They build on each other
2. **These are safe** - All use `IF NOT EXISTS` checks for safety
3. **Backward compatible** - Existing data is preserved
4. **No data loss** - No deletions, only additions
5. **Reversible** - If needed, migrations can be undone (ask for rollback scripts)

---

## Troubleshooting

### Error: "relation 'users' does not exist"
Your database schema hasn't been initialized yet. Run the main schema migrations first.

### Error: "column 'organization_id' already exists"
Migration 038 already ran - this is safe, just skip it.

### Error: "constraint already exists"
The constraint is already defined - this is safe, just skip it.

### Error: "foreign key constraint fails"
Ensure the `organizations` table exists before running migration 038.

---

## Next Steps After Migrations

1. **Restart your backend server** to load the new schema
2. **Test master admin access** - Login with admin@myaiagent.com
3. **Visit /admin/system** - Master admin dashboard
4. **Visit /admin/org** - Organization admin dashboard
5. **Create org API keys** - Test per-org key functionality

---

## Rollback (If Needed)

If you need to undo these migrations, run these **in reverse order**:

```sql
-- Undo 039
ALTER TABLE organization_users DROP CONSTRAINT IF EXISTS organization_users_role_check;

-- Undo 038
ALTER TABLE api_secrets DROP CONSTRAINT IF EXISTS fk_api_secrets_org_id;
ALTER TABLE api_secrets DROP COLUMN IF EXISTS organization_id;

-- Undo 037
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('user', 'admin', 'moderator'));
UPDATE users SET role = 'admin' WHERE email = 'admin@myaiagent.com' AND role = 'master_admin';
```

---

## Questions?

- Check the migration files in: `myaiagent-mvp/backend/migrations/037_*.sql` (and 038, 039)
- Review the implementation status: `MULTITENANCY_IMPLEMENTATION_STATUS.md`
- Backend code: `myaiagent-mvp/backend/src/middleware/auth.js`, `routes/org-admin.js`, `services/apiKeyResolver.js`
