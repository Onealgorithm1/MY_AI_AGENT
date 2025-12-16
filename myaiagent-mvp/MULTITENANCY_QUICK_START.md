# 🚀 Multitenancy Quick Start Guide

## For Master Admins

### Access Master Admin Dashboard
```
URL: https://werkules.com/admin/system
Requirements: 
- Login with admin@myaiagent.com (or any master_admin role user)
```

### What You Can Do
- 📊 View system-wide statistics
- 🏢 List all organizations in the system
- 👥 View all users across all organizations
- 🔑 Audit all API keys with organization context
- 📈 Monitor system health and usage

### Key Features
| Feature | Location |
|---------|----------|
| System Stats | Overview tab |
| Organizations List | Organizations tab |
| API Keys Audit | API Keys tab |
| User Management | Users tab |

---

## For Organization Admins

### Access Organization Admin Dashboard
```
URL: https://werkules.com/admin/org
Requirements:
- Login with any organization admin/owner account
```

### User Management

#### Invite New User
```
1. Click "+ Invite User" button
2. Enter email and select role (member/admin/owner)
3. Send invitation
4. User receives email with activation link
```

#### Manage User Roles
```
1. Find user in Users tab
2. Click role badge to change
3. Select new role: owner/admin/member
4. Changes apply immediately
```

#### Reset User Password
```
1. Click "Reset PWD" button for user
2. Reset link sent to their email
3. User can set new password
4. Note: Password reset link valid for 24 hours
```

#### Deactivate User
```
1. Click "Remove" button for user
2. Confirm deactivation
3. User account deactivated (NOT deleted)
4. All their data (conversations, messages) preserved
```

### API Key Management

#### Create New API Key
```
1. Click "+ Add New Key" button
2. Select Service (OpenAI, Google, Anthropic, etc.)
3. Give it a label (e.g., "Production OpenAI Key")
4. Paste your API key value
5. Save and use immediately
```

#### Rotate API Key
```
1. Click "Rotate" on existing key
2. Paste new API key value
3. Old key automatically deactivated
4. New key active immediately
5. Zero downtime key rotation
```

#### Revoke API Key
```
1. Click "Revoke" on key
2. Key deactivated (not deleted)
3. New calls will fail with "API key not found"
4. Audit trail maintained
```

#### View API Key Usage
```
1. API Keys tab shows all keys
2. Status: Active / Inactive
3. Created date visible
4. Can be filtered by service
```

---

## For Regular Users

### No Changes to Your Workflow
- ✅ Chat works exactly the same
- ✅ Conversations preserved
- ✅ Messages continue to work
- ✅ API keys automatically used

### Organization Context
- Your organization is set automatically
- All your data scoped to your organization
- You can switch organizations from sidebar
- API calls automatically use org's keys

---

## Common Tasks

### How to Add Team Member to Organization

```bash
# Step 1: Go to Organization Admin Dashboard
https://werkules.com/admin/org

# Step 2: Click "Users" tab

# Step 3: Click "+ Invite User"

# Step 4: Enter their email

# Step 5: Select role:
#   - member: Can use app, cannot manage
#   - admin: Can manage users and API keys
#   - owner: Full organizational control

# Step 6: User gets email invitation
# They click link and join organization
```

### How to Add API Key for Service

```bash
# Step 1: Go to Organization Admin Dashboard
https://werkules.com/admin/org

# Step 2: Click "API Keys" tab

# Step 3: Click "+ Add New Key"

# Step 4: Choose Service
# Examples:
#   - OpenAI (for GPT models)
#   - Google/Gemini (for Gemini models)
#   - Anthropic (for Claude models)

# Step 5: Provide Label
# Example: "Production OpenAI Key"

# Step 6: Paste API Key Value
# Get from service provider (OpenAI, Google, etc.)

# Step 7: Save
# Key is now active and used for API calls
```

### How to Rotate API Key (Best Practice)

```bash
# Recommended quarterly or before expiration
# Zero-downtime process:

# Step 1: Get new key from service provider
# (OpenAI, Google, etc.)

# Step 2: Go to Organization Admin Dashboard
https://werkules.com/admin/org

# Step 3: Click "API Keys" tab

# Step 4: Find key to rotate

# Step 5: Click "Rotate"

# Step 6: Paste new key value

# Step 7: Done!
# - Old key automatically deactivated
# - New key immediately active
# - No service downtime
```

### How to Reset Organization Member Password

```bash
# Step 1: Go to Organization Admin Dashboard
https://werkules.com/admin/org

# Step 2: Click "Users" tab

# Step 3: Find user in list

# Step 4: Click "Reset PWD"

# Step 5: Confirmation message shown

# Step 6: User receives password reset email
# They check email and set new password

# Step 7: User logs in with new password
```

---

## API Endpoints for Developers

### Organization Admin Endpoints

```bash
# List organization users
GET /api/org/:orgId/users

# Invite user
POST /api/org/:orgId/users
Body: { email: "user@example.com", role: "member" }

# Change user role
PUT /api/org/:orgId/users/:userId/role
Body: { role: "admin" }

# Reset user password
POST /api/org/:orgId/users/:userId/reset-password

# Deactivate user
DELETE /api/org/:orgId/users/:userId

# List org API keys
GET /api/org/:orgId/api-keys

# Create API key
POST /api/org/:orgId/api-keys
Body: { 
  serviceName: "OpenAI",
  keyLabel: "Production Key",
  keyValue: "sk-..." 
}

# Rotate API key
POST /api/org/:orgId/api-keys/:keyId/rotate
Body: { newKeyValue: "sk-..." }

# Revoke API key
DELETE /api/org/:orgId/api-keys/:keyId
```

### Master Admin Endpoints

```bash
# List all organizations
GET /api/admin/organizations

# Get organization details
GET /api/admin/organizations/:orgId

# List users in organization
GET /api/admin/organizations/:orgId/users

# List all API keys (audit)
GET /api/admin/api-keys

# Get specific API key details
GET /api/admin/api-keys/:keyId

# Get system statistics
GET /api/admin/master-stats
```

---

## User Role Definitions

### Master Admin
- **System-Wide Access** - Can see everything
- **Organization Management** - Manage all organizations
- **User Management** - Manage all users across system
- **API Key Audit** - View all API keys with organization context
- **Cannot Delete** - User data preserved through deactivation

**Email:** admin@myaiagent.com (migrated during implementation)

### Organization Admin / Owner
- **Org-Specific Access** - Only their organization
- **User Management** - Invite, remove, manage org users
- **API Key Management** - Create, rotate, revoke keys for org
- **Role Assignment** - Change user roles within organization
- **Cannot** - Access other organizations, system settings

**Set By:** Master admin or organization owner

### Regular User / Member
- **Application Access** - Can use chat, SAM.gov, analytics
- **Organization Scope** - Only sees org's data
- **Automatic API Keys** - Uses organization's API keys
- **Cannot** - Manage users, manage keys, access admin features

**Assigned During:** Organization creation or user invitation

---

## Troubleshooting

### Issue: Cannot access admin dashboard
**Solution:** Check your role
```sql
-- As master admin, verify user role:
SELECT email, role FROM users WHERE email = 'your@email.com';
-- Should show role: 'master_admin'

-- As org admin, verify org role:
SELECT ou.role, o.name 
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = 123;
-- Should show role: 'admin' or 'owner'
```

### Issue: API key not working
**Solution:** Check organization context
```sql
-- Verify org has active API key:
SELECT * FROM api_secrets 
WHERE organization_id = 1 
AND service_name = 'OpenAI'
AND is_active = TRUE;

-- Check API key resolver is using correct key:
-- Backend logs will show which key is selected
```

### Issue: User cannot see conversations
**Solution:** Check organization membership
```sql
-- Verify user is in organization:
SELECT * FROM organization_users 
WHERE user_id = 123 AND organization_id = 1;

-- Verify conversations have org_id:
SELECT id, organization_id, user_id FROM conversations 
WHERE user_id = 123;
-- Should have matching organization_id
```

---

## Security Best Practices

### For Admins
1. ✅ Rotate API keys quarterly
2. ✅ Review API keys regularly for unused ones
3. ✅ Use strong passwords and 2FA when available
4. ✅ Monitor user activity in logs
5. ✅ Deactivate unused users (don't delete)
6. ✅ Review organization members monthly

### For Organizations
1. ✅ Keep API keys secure (never share in chat)
2. ✅ Use separate keys for production/development
3. ✅ Implement access controls for API keys
4. ✅ Monitor API usage and quota
5. ✅ Rotate keys after team member departure
6. ✅ Audit all admin actions

### For Users
1. ✅ Use strong unique passwords
2. ✅ Never share API keys
3. ✅ Report suspicious activity to admin
4. ✅ Keep passwords confidential
5. ✅ Log out when done (especially shared computers)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2024 | Initial multitenancy implementation |

---

## Support

### Questions?
- Check the full documentation: `MULTITENANCY_IMPLEMENTATION.md`
- Review API reference in backend route files
- Check admin dashboard for system status

### Issues?
- Backend logs: Check server console for errors
- Database logs: Check PostgreSQL logs
- Frontend logs: Check browser console (F12)
- Test endpoints with API client (Postman, curl)

---

**Last Updated:** December 2024
