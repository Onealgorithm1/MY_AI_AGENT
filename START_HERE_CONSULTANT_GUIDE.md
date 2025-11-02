# 📖 START HERE - CONSULTANT GUIDE
**Gmail Integration Issue - Complete Documentation Package**

---

## 🎯 QUICK START

### What You Need to Know in 60 Seconds

**The Problem:**
- User asks: "what do you see in my gmail"
- Backend correctly detects Gmail query ✅
- Backend prepares 26 functions to send to OpenAI ✅
- **OpenAI returns 400 Bad Request** ❌
- Gmail integration blocked

**What's Working:**
- OAuth 2.0 flow ✅
- Token management ✅
- Gmail API ✅
- Action detection ✅

**What's Broken:**
- OpenAI function calling ❌

---

## 📚 DOCUMENTATION FILES

### **Option 1: Read One File (Recommended)**

**`CONSULTANT_COMPLETE_PACKAGE.md`** ⭐⭐⭐
- **Everything in one place**
- README & architecture
- Complete source code (7 files, 2,000+ lines)
- Folder structure
- Logs & test evidence
- Environment configuration
- Database schema
- Issue analysis
- Recommended fixes

**Length:** ~15,000 lines  
**Use Case:** You want everything in a single document

---

### **Option 2: Read Multiple Files (Detailed)**

**1. CONSULTANT_PACKAGE_GMAIL_INTEGRATION.md**
- Executive summary
- What works / what's broken
- Priority actions (ranked 1-3)
- Quick checklist

**2. COMPLETE_GMAIL_INTEGRATION_MASTER_DOCUMENT.md**
- Complete code listings
- All 26 function schemas
- Database schema
- API reference
- Testing procedures

**3. GMAIL_INTEGRATION_COMPLETE_WORKFLOW.md**
- Step-by-step workflows
- Visual data flow diagrams
- Exact failure point location

**4. GMAIL_INTEGRATION_TECHNICAL_REPORT.md**
- Architecture overview
- OAuth 2.0 flow
- Token management details
- Enhanced action detection

---

## 🚀 RECOMMENDED APPROACH

### Step 1: Understand the System (15 minutes)

Read: `CONSULTANT_COMPLETE_PACKAGE.md`
- Section: Executive Summary
- Section: Architecture
- Section: Current Issue Analysis

**Key Points:**
- Custom OAuth 2.0 (not Replit connector)
- Per-user authentication (each user uses their own Gmail)
- AES-256-GCM encryption for tokens
- Auto-refresh 5 minutes before expiry
- Enhanced action detection deployed Nov 2, 2025

### Step 2: Reproduce the Issue (10 minutes)

**Requirements:**
- Replit environment access
- Backend running on port 3000
- Frontend running on port 5000
- User account with Google connected

**Test:**
1. Login to app
2. Connect Google account in Settings
3. Type in chat: "what do you see in my gmail"
4. Check backend logs for action detection ✅
5. Check backend logs for OpenAI error ❌

**Expected Logs:**
```
📋 Action Detection: {
  mentionsGoogle: true,
  hasGoogleAccess: true,
  shouldPassFunctions: true,
  functionsCount: 26
}

OpenAI Error: {
  status: 400,
  statusText: 'Bad Request'
}
```

### Step 3: Add Diagnostic Logging (15 minutes)

**File:** `backend/src/services/openai.js`

**Add before axios.post():**
```javascript
console.log('🔍 OpenAI Request:', {
  model,
  messageCount: messages.length,
  functionsCount: functions?.length,
  functionNames: functions?.map(f => f.name),
  payloadSize: JSON.stringify({ model, messages, functions }).length
});

// Save to file for inspection
fs.writeFileSync('/tmp/openai-request.json', 
  JSON.stringify({ model, messages, functions }, null, 2));
```

**Add in catch block:**
```javascript
console.error('OpenAI Error Details:', {
  status: error.response?.status,
  data: error.response?.data,  // ← THIS is what we need
  message: error.message
});

fs.writeFileSync('/tmp/openai-error.json', 
  JSON.stringify(error.response?.data, null, 2));
```

**Restart backend and test again:**
```bash
cat /tmp/openai-error.json
```

This will show the ACTUAL error from OpenAI.

### Step 4: Run Isolation Tests (20 minutes)

**Test A: No Functions**
```javascript
// In backend/src/routes/messages.js, line ~200
const functionsToPass = null; // Disable functions
```
Expected: AI responds normally

**Test B: Single Function**
```javascript
const functionsToPass = [UI_FUNCTIONS.find(f => f.name === 'readEmails')];
```
Expected: If works, issue is function count

**Test C: Gmail Functions Only (6 functions)**
```javascript
const gmailFunctions = UI_FUNCTIONS.filter(f => 
  ['readEmails', 'searchEmails', 'sendEmail', 
   'markEmailAsRead', 'archiveEmail', 'deleteEmail'].includes(f.name)
);
const functionsToPass = gmailFunctions;
```
Expected: Narrows down if issue is total count

**Test D: Different Model**
```javascript
// In backend/src/routes/messages.js
const selectedModel = 'gpt-4o'; // Instead of gpt-4o-mini
```
Expected: Check if model limitation

### Step 5: Validate Function Schemas (30 minutes)

**Check each function in `backend/src/services/uiFunctions.js`:**

Required structure:
```javascript
{
  name: string,           // ✅ Required
  description: string,    // ✅ Required
  parameters: {           // ✅ Required
    type: 'object',       // ✅ Must be 'object'
    properties: {...},    // ✅ Required
    required: [...]       // Optional
  }
}
```

**Common issues to look for:**
- Missing `name`, `description`, or `parameters`
- `parameters.type` not set to `'object'`
- Empty `parameters.properties`
- Invalid property types
- Enum values that don't match usage

### Step 6: Implement Fix (varies)

**Based on findings:**

**If function count is the issue:**
- Reduce to Gmail-only functions (6 instead of 26)
- Or implement dynamic function selection

**If specific function is invalid:**
- Fix the schema
- Validate against OpenAI spec

**If request too large:**
- Reduce conversation history
- Simplify function descriptions
- Split into multiple function sets

**If model incompatibility:**
- Switch to gpt-4o
- Or use new "tools" API instead of "functions"

---

## 🔍 KEY FILES TO REVIEW

### Backend Code (Gmail Integration)

```
myaiagent-mvp/backend/src/
├── routes/
│   ├── google-auth.js       ⭐ OAuth endpoints (187 lines)
│   └── messages.js          ⭐ Action detection (528 lines)
├── services/
│   ├── googleOAuth.js       ⭐ OAuth service (184 lines)
│   ├── tokenManager.js      ⭐ Token lifecycle (157 lines)
│   ├── gmail.js             ⭐ Gmail API (284 lines)
│   ├── uiFunctions.js       ⭐ Function schemas (852 lines) ← CHECK THIS
│   └── openai.js            ⭐ OpenAI client ← ADD LOGGING HERE
├── utils/
│   └── encryption.js        AES-256-GCM (72 lines)
└── config/
    └── googleOAuth.js       OAuth config (41 lines)
```

### Environment Setup

```bash
# Required ENV variables
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
OPENAI_API_KEY=...
ENCRYPTION_KEY=... # Must be 64 hex chars
DATABASE_URL=...
JWT_SECRET=...
```

### Database Tables

```sql
users (id, email, google_id, ...)
oauth_tokens (user_id, provider, access_token, refresh_token, expires_at, ...)
messages (conversation_id, role, content, ...)
```

---

## 🐛 DEBUGGING CHECKLIST

### Phase 1: Environment Verification
- [ ] Backend server running (port 3000)
- [ ] Frontend server running (port 5000)
- [ ] Database connected
- [ ] All ENV variables set
- [ ] Google OAuth credentials valid
- [ ] OpenAI API key valid

### Phase 2: OAuth Verification
- [ ] User can connect Google account
- [ ] OAuth callback processes successfully
- [ ] Tokens stored in database (encrypted)
- [ ] google_id linked to user
- [ ] Token refresh working

### Phase 3: Gmail API Verification
- [ ] Gmail client authentication works
- [ ] listEmails() returns data
- [ ] Gmail API quota not exceeded
- [ ] All 6 Gmail functions tested

### Phase 4: Action Detection Verification
- [ ] "what do you see in my gmail" triggers detection
- [ ] mentionsGoogle = true
- [ ] hasGoogleAccess = true
- [ ] shouldPassFunctions = true
- [ ] functionsCount = 26

### Phase 5: OpenAI Issue Diagnosis
- [ ] Detailed logging added
- [ ] Error response captured
- [ ] Request payload saved
- [ ] Isolation tests completed
- [ ] Function schemas validated

### Phase 6: Fix Implementation
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Tests passing
- [ ] End-to-end flow works

---

## 💡 LIKELY SOLUTIONS

### Solution 1: Invalid Function Schema (80% probability)

**Problem:** One or more of the 26 functions has malformed schema

**Fix:**
1. Review `backend/src/services/uiFunctions.js`
2. Validate each function against OpenAI spec
3. Fix any missing required fields
4. Test with corrected schemas

### Solution 2: Too Many Functions (15% probability)

**Problem:** 26 functions exceeds OpenAI limit

**Fix:**
1. Reduce to Gmail-only functions (6)
2. Or implement dynamic function selection
3. Pass only relevant functions based on query

### Solution 3: Model Limitation (5% probability)

**Problem:** gpt-4o-mini doesn't support this many functions

**Fix:**
1. Switch to gpt-4o
2. Or use new "tools" API (OpenAI's replacement for "functions")

---

## 📊 SUCCESS CRITERIA

**Issue is resolved when:**
1. User asks: "what do you see in my gmail"
2. Action detection triggers ✅
3. OpenAI receives function list ✅
4. OpenAI calls readEmails function ✅
5. Backend executes Gmail API call ✅
6. Frontend displays email list ✅

---

## 📞 ADDITIONAL RESOURCES

### OpenAI Function Calling Documentation
https://platform.openai.com/docs/guides/function-calling

### Google Gmail API Documentation
https://developers.google.com/gmail/api/reference/rest

### OAuth 2.0 Flow
https://developers.google.com/identity/protocols/oauth2

### AES-256-GCM Encryption
Node.js crypto module documentation

---

## 🎯 EXPECTED TIMELINE

| Task | Est. Time |
|------|-----------|
| Review documentation | 15 min |
| Reproduce issue | 10 min |
| Add diagnostic logging | 15 min |
| Run isolation tests | 20 min |
| Validate schemas | 30 min |
| Identify root cause | 15 min |
| Implement fix | 30 min |
| Test end-to-end | 15 min |
| **TOTAL** | **~2.5 hours** |

---

## ✅ FINAL CHECKLIST

Before considering this issue resolved:

- [ ] Identified exact OpenAI error message
- [ ] Identified root cause
- [ ] Implemented fix
- [ ] Tested with: "what do you see in my gmail"
- [ ] OpenAI successfully calls readEmails function
- [ ] Gmail API returns email data
- [ ] Frontend displays emails
- [ ] No errors in logs
- [ ] Tested with other Gmail queries
- [ ] Documented the solution

---

**Good luck! The system is 95% complete - just need to fix the OpenAI function calling issue.**

If you get stuck, the detailed error from OpenAI (`error.response.data`) will point you to the exact problem.
