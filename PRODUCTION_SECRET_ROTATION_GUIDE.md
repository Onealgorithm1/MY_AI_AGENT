# Production Secret Rotation Guide

**Purpose:** Secure rotation of all critical secrets before staging/production deployment  
**Priority:** CRITICAL (Priority 1, Item 4)  
**Date:** November 3, 2025

---

## Executive Summary

Before deploying to staging or production environments, **ALL** development secrets MUST be rotated with new production-grade secrets. Development secrets may have been:
- Accidentally logged
- Committed to Git (even if later removed)
- Shared during development/debugging
- Exposed through error messages
- Used in insecure contexts

**This is non-negotiable for production security.**

---

## Table of Contents

1. [Critical Secrets to Rotate](#critical-secrets-to-rotate)
2. [Secret Generation Guidelines](#secret-generation-guidelines)
3. [Step-by-Step Rotation Process](#step-by-step-rotation-process)
4. [AWS Deployment Configuration](#aws-deployment-configuration)
5. [Validation Checklist](#validation-checklist)
6. [Emergency Rotation Procedure](#emergency-rotation-procedure)

---

## 1. Critical Secrets to Rotate

### 1.1 Application Secrets (MUST ROTATE)

| Secret Name | Current Usage | Production Requirement |
|-------------|---------------|------------------------|
| `JWT_SECRET` | JWT signing and verification | 64+ random characters, never reused |
| `HMAC_SECRET` | OAuth state signing | 64+ random characters, different from JWT |
| `CSRF_SECRET` | CSRF token generation | 64+ random characters, unique |
| `ENCRYPTION_KEY` | OAuth token encryption | Exactly 64 hex characters (32 bytes) |

**Why rotate?**
- Development values may have been exposed in logs
- Security best practice for production isolation
- Prevents session hijacking from development environments

### 1.2 External API Keys (VERIFY & ROTATE IF NEEDED)

| Service | Key Name | Action Required |
|---------|----------|-----------------|
| Google Gemini | `GEMINI_API_KEY` | Create **production-only** API key |
| ElevenLabs | `ELEVENLABS_API_KEY` | Verify key, create new if shared |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Create new OAuth client for production domain |
| Google Search | `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID` | Verify restrictions, rotate if needed |

**Best Practice:** Use separate API keys for production to:
- Enable quota/cost tracking per environment
- Allow key rotation without affecting development
- Implement stricter rate limits in production

### 1.3 Database Credentials

| Credential | Development | Production |
|------------|-------------|------------|
| `DATABASE_URL` | Local PostgreSQL | AWS RDS connection string |
| Connection pooling | Low limits | Production-optimized |

---

## 2. Secret Generation Guidelines

### 2.1 High-Entropy Secrets (JWT, HMAC, CSRF)

**Requirement:** 64+ random characters from full ASCII printable set

**Recommended Method (Node.js):**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Output Example:**
```
x7K9mP3vR8sW2nF5jQ1eT4yU6hG0bN9cV7xZ8aL3kM2dS5fJ1wE4tY6rH8iO0pQ9
```

**Alternative (OpenSSL):**
```bash
openssl rand -base64 64
```

### 2.2 Encryption Key (AES-256)

**Requirement:** EXACTLY 64 hexadecimal characters (32 bytes for AES-256)

**Recommended Method (Node.js):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Output Example:**
```
f4a8c3e7b2d1569f03e8a7c4b6d2f9e1a5c8b3d7f2e4a6c9b1d8e3f7a2c5b9d4
```

**Validation:**
```bash
# Must be exactly 64 characters and only hex digits (0-9, a-f)
echo "YOUR_KEY_HERE" | wc -c  # Should output 65 (64 + newline)
```

### 2.3 API Keys

**Google Gemini:**
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key" → Select production project
3. Copy key (starts with `AIza...`)
4. Set restrictions:
   - IP restrictions (AWS server IPs)
   - API restrictions (Gemini API only)

**Google OAuth Client:**
1. Visit: https://console.cloud.google.com/apis/credentials
2. Create new OAuth 2.0 Client ID
3. **Authorized redirect URIs:**
   ```
   https://yourdomain.com/api/auth/google/callback
   ```
4. Download JSON credentials
5. Extract `client_id` and `client_secret`

**ElevenLabs:**
1. Visit: https://elevenlabs.io/app/settings/api-keys
2. Create new API key
3. Name it "Production - My AI Agent"
4. Copy key immediately (only shown once)

---

## 3. Step-by-Step Rotation Process

### Phase 1: Generate All Production Secrets

```bash
# Run on your LOCAL machine (NOT on server)

# 1. Generate JWT Secret
export PROD_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
echo "JWT_SECRET=$PROD_JWT_SECRET"

# 2. Generate HMAC Secret
export PROD_HMAC_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
echo "HMAC_SECRET=$PROD_HMAC_SECRET"

# 3. Generate CSRF Secret
export PROD_CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
echo "CSRF_SECRET=$PROD_CSRF_SECRET"

# 4. Generate Encryption Key (EXACTLY 64 hex chars)
export PROD_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "ENCRYPTION_KEY=$PROD_ENCRYPTION_KEY"

# 5. Validate Encryption Key Length
echo -n "$PROD_ENCRYPTION_KEY" | wc -c  # MUST output 64
```

**⚠️ CRITICAL:** Save these values immediately to a secure password manager or AWS Secrets Manager.

### Phase 2: Configure Production Environment

**Option A: AWS Secrets Manager (Recommended)**

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name myaiagent/production/secrets \
  --secret-string "{
    \"JWT_SECRET\":\"$PROD_JWT_SECRET\",
    \"HMAC_SECRET\":\"$PROD_HMAC_SECRET\",
    \"CSRF_SECRET\":\"$PROD_CSRF_SECRET\",
    \"ENCRYPTION_KEY\":\"$PROD_ENCRYPTION_KEY\"
  }"

# Configure application to read from Secrets Manager
# (Requires IAM role with secretsmanager:GetSecretValue permission)
```

**Option B: Environment Variables (Alternative)**

```bash
# Set environment variables in AWS Elastic Beanstalk, ECS, Lambda, etc.
# Never commit these to Git or expose in logs

export NODE_ENV=production
export JWT_SECRET="$PROD_JWT_SECRET"
export HMAC_SECRET="$PROD_HMAC_SECRET"
export CSRF_SECRET="$PROD_CSRF_SECRET"
export ENCRYPTION_KEY="$PROD_ENCRYPTION_KEY"

# External API keys
export GEMINI_API_KEY="AIzaSy...YOUR_PRODUCTION_KEY"
export ELEVENLABS_API_KEY="...YOUR_PRODUCTION_KEY"

# Google OAuth
export GOOGLE_CLIENT_ID="...YOUR_PRODUCTION_ID"
export GOOGLE_CLIENT_SECRET="...YOUR_PRODUCTION_SECRET"

# Database
export DATABASE_URL="postgresql://user:pass@production-db.amazonaws.com:5432/myaiagent"
```

### Phase 3: Update OAuth Redirect URLs

**Google Cloud Console:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Select your production OAuth client
3. Update **Authorized redirect URIs:**
   ```
   https://api.yourdomain.com/api/auth/google/callback
   ```
4. Update **Authorized JavaScript origins:**
   ```
   https://yourdomain.com
   https://www.yourdomain.com
   ```

### Phase 4: Invalidate All Existing Sessions

```sql
-- Run in production database to force all users to re-login
-- (This ensures old JWT tokens from development are invalid)

-- Option 1: Clear OAuth tokens (forces Google re-auth)
TRUNCATE oauth_tokens;

-- Option 2: Mark all users as requiring password reset (extreme)
-- UPDATE users SET password_hash = NULL WHERE password_hash IS NOT NULL;
```

**Note:** Users will need to log in again after deployment. Announce this in advance.

---

## 4. AWS Deployment Configuration

### 4.1 Environment Variables Template

Create a `.env.production` file (for reference only, NEVER commit):

```bash
# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

# Security Secrets (GENERATED IN PHASE 1)
JWT_SECRET=<FROM_PHASE_1>
HMAC_SECRET=<FROM_PHASE_1>
CSRF_SECRET=<FROM_PHASE_1>
ENCRYPTION_KEY=<FROM_PHASE_1>

# Database
DATABASE_URL=postgresql://user:password@prod-db.amazonaws.com:5432/myaiagent

# AI Services
GEMINI_API_KEY=AIzaSy...
ELEVENLABS_API_KEY=...

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Google Services
GOOGLE_SEARCH_API_KEY=AIzaSy...
GOOGLE_SEARCH_ENGINE_ID=123456789

# CORS (production domain)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Session
SESSION_DURATION_HOURS=24
```

### 4.2 Secrets Manager Integration (Recommended)

**IAM Policy Required:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:region:account-id:secret:myaiagent/production/*"
    }
  ]
}
```

**Node.js Code to Load Secrets:**
```javascript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function loadSecretsFromAWS() {
  const client = new SecretsManagerClient({ region: "us-east-1" });
  
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: "myaiagent/production/secrets",
      })
    );
    
    const secrets = JSON.parse(response.SecretString);
    process.env.JWT_SECRET = secrets.JWT_SECRET;
    process.env.HMAC_SECRET = secrets.HMAC_SECRET;
    process.env.CSRF_SECRET = secrets.CSRF_SECRET;
    process.env.ENCRYPTION_KEY = secrets.ENCRYPTION_KEY;
    
    console.log('✅ Secrets loaded from AWS Secrets Manager');
  } catch (error) {
    console.error('❌ Failed to load secrets:', error);
    process.exit(1);
  }
}
```

---

## 5. Validation Checklist

Use this checklist to verify production secret rotation:

### Pre-Deployment Validation

- [ ] All 4 application secrets generated with correct entropy
- [ ] ENCRYPTION_KEY is exactly 64 hex characters
- [ ] JWT_SECRET, HMAC_SECRET, CSRF_SECRET are different from each other
- [ ] All secrets are different from development values
- [ ] Secrets saved to AWS Secrets Manager or secure storage
- [ ] Production Google OAuth client created with correct redirect URLs
- [ ] Production Gemini API key obtained with restrictions
- [ ] Production ElevenLabs API key created
- [ ] Database credentials point to production RDS instance

### Post-Deployment Validation

```bash
# Test JWT creation and verification
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Test CSRF protection
curl -X GET https://api.yourdomain.com/api/csrf-token \
  -b cookies.txt

# Test Google OAuth
curl https://api.yourdomain.com/api/auth/google

# Test API with cookie authentication
curl https://api.yourdomain.com/api/auth/me \
  -b cookies.txt
```

**Expected Results:**
- [ ] Login succeeds and sets HTTP-only cookie
- [ ] CSRF token endpoint returns valid token
- [ ] Google OAuth redirect works correctly
- [ ] Protected endpoints authenticate via cookie

### Security Validation

- [ ] No secrets visible in application logs
- [ ] No secrets committed to Git repository
- [ ] HTTP-only cookie flag is set (`Secure; HttpOnly; SameSite=Strict`)
- [ ] CSRF protection blocks requests without valid token
- [ ] Old development JWT tokens do NOT work in production
- [ ] Session expires after configured duration (24 hours)

---

## 6. Emergency Rotation Procedure

**When to use:** Secret compromised, suspected breach, regulatory requirement

### Immediate Actions (Within 1 Hour)

1. **Generate new secrets:**
   ```bash
   NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
   ```

2. **Update AWS Secrets Manager:**
   ```bash
   aws secretsmanager update-secret \
     --secret-id myaiagent/production/secrets \
     --secret-string "{\"JWT_SECRET\":\"$NEW_JWT_SECRET\",...}"
   ```

3. **Restart application:**
   ```bash
   # Forces application to reload secrets
   aws elasticbeanstalk restart-app-server \
     --environment-name myaiagent-production
   ```

4. **Invalidate all sessions:**
   ```sql
   TRUNCATE oauth_tokens;
   ```

5. **Notify users:**
   - Email all users about security update
   - Require re-login for all sessions
   - Monitor for suspicious activity

### Post-Incident Review (Within 24 Hours)

- [ ] Identify how secret was compromised
- [ ] Review all access logs for suspicious activity
- [ ] Update security procedures to prevent recurrence
- [ ] Document incident in security log
- [ ] Consider rotating other secrets as precaution

---

## 7. Secret Rotation Schedule

### Regular Rotation (Recommended)

| Secret Type | Rotation Frequency | Automation |
|-------------|-------------------|------------|
| JWT_SECRET | Every 90 days | Manual |
| HMAC_SECRET | Every 90 days | Manual |
| CSRF_SECRET | Every 90 days | Manual |
| ENCRYPTION_KEY | Every 180 days | Manual (complex) |
| API Keys | Every 365 days | Manual |
| OAuth Credentials | As needed | Manual |

**Note:** Rotating ENCRYPTION_KEY requires re-encrypting all OAuth tokens in database.

### Automation Script (Optional)

```javascript
// scripts/rotate-secrets.js
import { SecretsManagerClient, UpdateSecretCommand } from "@aws-sdk/client-secrets-manager";
import crypto from 'crypto';

async function rotateApplicationSecrets() {
  const newSecrets = {
    JWT_SECRET: crypto.randomBytes(64).toString('base64'),
    HMAC_SECRET: crypto.randomBytes(64).toString('base64'),
    CSRF_SECRET: crypto.randomBytes(64).toString('base64'),
  };
  
  const client = new SecretsManagerClient({ region: "us-east-1" });
  
  await client.send(new UpdateSecretCommand({
    SecretId: "myaiagent/production/secrets",
    SecretString: JSON.stringify(newSecrets),
  }));
  
  console.log('✅ Secrets rotated successfully');
  console.log('⚠️ Application restart required');
}
```

---

## 8. Compliance & Audit

### Secret Access Logging

```bash
# Enable CloudTrail logging for Secrets Manager
aws cloudtrail create-trail \
  --name myaiagent-secrets-audit \
  --s3-bucket-name myaiagent-audit-logs

# Monitor who accessed secrets
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=myaiagent/production/secrets
```

### Compliance Checklist

- [ ] Secrets never stored in plaintext
- [ ] Secrets never logged or exposed in errors
- [ ] Access to secrets logged and auditable
- [ ] Secrets rotated according to policy
- [ ] Old secrets immediately invalidated
- [ ] Incident response plan tested

---

## 9. Common Pitfalls & Solutions

### Pitfall 1: Reusing Development Secrets

**Problem:** Using same JWT_SECRET in development and production  
**Risk:** Development tokens work in production  
**Solution:** ALWAYS generate new secrets for each environment

### Pitfall 2: ENCRYPTION_KEY Wrong Length

**Problem:** ENCRYPTION_KEY not exactly 64 hex characters  
**Symptom:** Server crashes on startup with "Invalid key length"  
**Solution:** Use the exact generation command provided in Section 2.2

### Pitfall 3: Secrets in Git History

**Problem:** Accidentally committed secrets, then removed  
**Risk:** Still visible in Git history  
**Solution:** 
```bash
# Remove from history (DANGEROUS - coordinate with team)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.production" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: rewrites history)
git push origin --force --all
```

### Pitfall 4: OAuth Redirect Mismatch

**Problem:** OAuth callback fails with "redirect_uri_mismatch"  
**Solution:** Ensure exact match in Google Console (including trailing slash)

---

## 10. Support Resources

### Documentation
- **AWS Secrets Manager:** https://docs.aws.amazon.com/secretsmanager/
- **Google OAuth Setup:** https://developers.google.com/identity/protocols/oauth2
- **Node.js Crypto:** https://nodejs.org/api/crypto.html

### Security Standards
- **OWASP Secrets Management:** https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- **NIST Password Guidelines:** https://pages.nist.gov/800-63-3/

---

## Final Checklist

Before deploying to production, confirm:

- [ ] All secrets rotated with production-grade values
- [ ] Secrets stored securely (AWS Secrets Manager or encrypted storage)
- [ ] OAuth redirect URLs updated for production domain
- [ ] Database points to production RDS instance
- [ ] All API keys restricted to production IPs/domains
- [ ] Emergency rotation procedure tested
- [ ] Team trained on secret handling procedures
- [ ] Monitoring enabled for secret access
- [ ] Backup of all secrets stored securely offline

---

**STATUS:** Ready for implementation before staging deployment  
**PRIORITY:** CRITICAL  
**ESTIMATED TIME:** 2-4 hours (including validation)

**Contact:** Development team for assistance with AWS configuration or secret generation.

---

**END OF PRODUCTION SECRET ROTATION GUIDE**
