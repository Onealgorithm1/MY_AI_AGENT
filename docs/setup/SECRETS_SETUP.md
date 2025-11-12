# Quick Secrets Setup

## Add SAM.gov API Key

Your SAM.gov API key: `SAM-4722a397-88b2-402b-b6b7-d84b2e726046`

### Option 1: Automated Script (Recommended)

```bash
# On your EC2 instance or wherever backend is running
cd myaiagent-mvp/backend

# Run the secrets setup script
node src/scripts/add-secrets.js
```

This will automatically add:
- ✅ SAM.gov API key (SAM-4722a397-88b2-402b-b6b7-d84b2e726046)

### Option 2: Via Admin Dashboard UI

1. Navigate to **Admin Dashboard** → **API Keys**
2. Scroll down to find **SAM.gov** category
3. Click **"Add SAM.gov API Key"**
4. Enter key: `SAM-4722a397-88b2-402b-b6b7-d84b2e726046`
5. Click **"Save Key"**
6. Click **"Test"** to verify ✅

### Option 3: Manual SQL (If script fails)

```sql
-- Connect to your database
psql $DATABASE_URL

-- Get admin user ID
SELECT id FROM users WHERE role IN ('admin', 'superadmin') LIMIT 1;

-- Replace YOUR_ADMIN_ID and YOUR_ENCRYPTED_KEY below
INSERT INTO api_secrets
  (key_name, key_value, service_name, key_label, key_type, description, docs_url, is_active, is_default, created_by)
VALUES
  ('SAM_GOV_API_KEY',
   'ENCRYPTED_VALUE_HERE',  -- Run through encryption first
   'SAM.gov',
   'Production Key',
   'other',
   'SAM.gov API key for federal procurement data',
   'https://open.gsa.gov/api/sam-entity-api/',
   true,
   true,
   YOUR_ADMIN_ID);
```

## Required Environment Variables

Make sure these are set in your `.env` file:

```bash
# CRITICAL - Required for encrypting API keys
ENCRYPTION_KEY=your-32-byte-hex-key

# Generate if not set:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Security
JWT_SECRET=your-jwt-secret-here
CSRF_SECRET=your-csrf-secret-here

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Optional - Can use database secrets manager instead
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
```

## Verify Setup

### Test via API:

```bash
# Get all secrets (requires admin)
curl https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api/secrets \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Test SAM.gov key
curl -X POST https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api/secrets/test/SECRET_ID \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

### Test SAM.gov API:

```bash
# Search entities
curl -X POST https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api/sam-gov/search/entities \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{"limit": 1}'
```

## Adding More Secrets

### Via Script

Edit `src/scripts/add-secrets.js` and add to the `secrets` array:

```javascript
const secrets = [
  {
    keyName: 'SAM_GOV_API_KEY',
    serviceName: 'SAM.gov',
    keyValue: 'SAM-4722a397-88b2-402b-b6b7-d84b2e726046',
    keyLabel: 'Production Key',
    description: 'SAM.gov API key',
    docsUrl: 'https://open.gsa.gov/api/sam-entity-api/',
    keyType: 'other',
  },
  {
    keyName: 'OPENAI_API_KEY',
    serviceName: 'OpenAI',
    keyValue: 'sk-proj-YOUR-KEY-HERE',
    keyLabel: 'Project Key',
    description: 'OpenAI API key for GPT models',
    docsUrl: 'https://platform.openai.com/api-keys',
    keyType: 'project',
  },
  // Add more here...
];
```

Then run:
```bash
node src/scripts/add-secrets.js
```

### Via Admin UI

1. Go to **Admin Dashboard** → **API Keys**
2. Find the service category (OpenAI, Google APIs, etc.)
3. Click **"Add [Service] API Key"**
4. Enter your key
5. Click **"Save"** then **"Test"**

## Troubleshooting

### "ENCRYPTION_KEY not set"

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
echo "ENCRYPTION_KEY=YOUR_GENERATED_KEY" >> .env

# Restart backend
pm2 restart all
```

### "Invalid API key format"

Check server logs for details:
```bash
pm2 logs
```

The logs will show:
- What keyName was received
- Expected format
- First 10 chars of your key

### "No admin user found"

Create an admin user first:
```bash
node src/scripts/make-admin.js your-email@example.com
```

## Security Notes

- ✅ All secrets are encrypted in database using AES-256-GCM
- ✅ Only admin users can manage secrets
- ✅ Keys are masked in UI (last 4 chars only)
- ✅ Test endpoint validates keys before use
- ✅ Automatic key rotation support
- ⚠️ Never commit `.env` to git
- ⚠️ Keep ENCRYPTION_KEY secure - losing it means losing all secrets

## Quick Reference

```bash
# Add secrets
node src/scripts/add-secrets.js

# Make user admin
node src/scripts/make-admin.js email@example.com

# Test SAM.gov integration
curl -X POST http://localhost:3000/api/sam-gov/search/entities \
  -H "Content-Type: application/json" \
  -d '{"limit": 1}'
```

---

**Your SAM.gov API Key**: `SAM-4722a397-88b2-402b-b6b7-d84b2e726046`

Run: `node src/scripts/add-secrets.js` to add it automatically! ✅
