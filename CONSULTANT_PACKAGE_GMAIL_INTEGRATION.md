# Gmail Integration - Consultant Package
**Date:** November 2, 2025  
**Project:** My AI Agent MVP  
**Purpose:** Complete diagnostic package for Gmail integration debugging

---

## 📦 Package Contents

This package contains all technical documentation, diagnostic reports, and implementation details for the Gmail integration in My AI Agent MVP.

### Included Documents

1. **GMAIL_INTEGRATION_TECHNICAL_REPORT.md** ⭐ **NEW**
   - Comprehensive architecture overview
   - OAuth 2.0 flow documentation
   - Token management details
   - Gmail API function reference
   - Enhanced action detection implementation
   - Current issues and diagnostics
   - Testing guide
   - Code locations and debugging queries

2. **GOOGLE_SERVICES_BUG_REPORT.md**
   - Original bug report for Google services
   - Initial diagnostic findings

3. **GOOGLE_ACCESS_DIAGNOSTIC_REPORT.md**
   - Detailed diagnostic analysis
   - Access pattern investigation

4. **DIAGNOSTIC_PACKAGE_FOR_DEV_TEAM.md**
   - Developer-focused diagnostic package

---

## 🎯 Quick Summary

### What's Working ✅

1. **OAuth 2.0 Implementation**
   - Google login/signup flow functional
   - Account linking working
   - State token validation with HMAC-SHA256
   - Secure token storage with AES-256-GCM encryption

2. **Token Management**
   - Automatic token refresh (5 minutes before expiry)
   - Graceful error handling
   - Token revocation on disconnect
   - Database persistence

3. **Gmail API Integration**
   - All 7 Gmail functions implemented:
     - `readEmails` - Read inbox messages
     - `searchEmails` - Search with Gmail query syntax
     - `sendEmail` - Send emails with HTML support
     - `markEmailAsRead` - Mark messages as read
     - `archiveEmail` - Archive messages
     - `deleteEmail` - Delete messages
     - `getUnreadCount` - Get unread count

4. **Enhanced Action Detection** (Deployed Nov 2, 2025)
   - Expanded natural language patterns
   - Keyword-based Google service detection
   - Smart function passing logic
   - Comprehensive debug logging

### What's Broken ❌

**CRITICAL ISSUE: OpenAI 400 Bad Request**

When AI tries to call Gmail functions:
```
Error: Request failed with status code 400
Status: 400 Bad Request
```

**Symptoms:**
- Action detection works correctly ✅
- Functions are identified and passed to OpenAI (26 functions) ✅
- User has Google access ✅
- OpenAI API rejects the request ❌

**Root Cause (Suspected):**
One or more of the following:
1. Function payload too large (26 functions may exceed limits)
2. Invalid function schema format
3. Model incompatibility (gpt-4o-mini limitations)
4. Total request size exceeds token limits

---

## 🔍 Current Diagnostic State

### Action Detection Log (Working)
```javascript
📋 Action Detection: {
  query: 'search my gmail',
  isAction: false,              // Not a traditional action verb
  mentionsGoogle: true,          // ✅ Keyword detected
  hasGoogleAccess: true,         // ✅ User connected
  shouldPassFunctions: true,     // ✅ Logic working
  functionsCount: 26             // ✅ All functions passed
}
```

### OpenAI Request (Failing)
```javascript
OpenAI chat error: {
  status: 400,
  statusText: 'Bad Request',
  message: 'Request failed with status code 400'
}
```

### User State (Verified)
- ✅ User has `google_id` in database
- ✅ OAuth tokens exist and are valid
- ✅ Tokens auto-refresh successfully
- ✅ Gmail API functions execute correctly when called directly

---

## 🚨 Priority Actions for Consultant

### PRIORITY 1: Debug OpenAI 400 Error

**Immediate Actions:**
1. **Capture Full Request Payload**
   ```javascript
   // Add to backend/src/services/openai.js before axios call
   console.log('🔍 Full OpenAI Request:', {
     model,
     messages: messages.length,
     functions: functions?.length,
     functionSchemas: JSON.stringify(functions, null, 2),
     totalPayloadSize: JSON.stringify({ model, messages, functions }).length
   });
   ```

2. **Test with Minimal Functions**
   - Try passing only Gmail functions (6 functions instead of 26)
   - Verify if the error is due to function count

3. **Validate Function Schema**
   - Ensure all 26 functions conform to OpenAI function calling spec
   - Check for:
     - Missing required fields
     - Invalid property types
     - Malformed JSON schema
     - Unsupported features

4. **Test Different Models**
   - Try with `gpt-4o` instead of `gpt-4o-mini`
   - Verify model supports function calling

### PRIORITY 2: Function Schema Validation

Review all functions in `backend/src/services/uiFunctions.js`:
- Confirm JSON schema validity
- Check parameter types
- Verify required fields
- Test individual function schemas

### PRIORITY 3: Request Size Analysis

Calculate total request size:
```javascript
const totalSize = JSON.stringify({
  model: selectedModel,
  messages: messages,
  functions: functionsToPass,
  stream: true
}).length;

console.log('📊 Request size:', {
  totalBytes: totalSize,
  totalKB: (totalSize / 1024).toFixed(2),
  estimatedTokens: Math.ceil(totalSize / 4),
  messageCount: messages.length,
  functionCount: functionsToPass.length
});
```

---

## 🔧 Recommended Testing Approach

### Phase 1: Isolate the Problem

**Test 1: No Functions**
```javascript
// In messages.js, temporarily set:
const functionsToPass = null;
```
Expected: AI responds normally without function calling

**Test 2: Single Function**
```javascript
// Pass only one Gmail function
const functionsToPass = [UI_FUNCTIONS.find(f => f.name === 'readEmails')];
```
Expected: If this works, problem is function count or schema

**Test 3: Gmail Functions Only**
```javascript
// Pass only Gmail-related functions (6 total)
const gmailFunctionNames = ['readEmails', 'searchEmails', 'sendEmail', 
                             'markEmailAsRead', 'archiveEmail', 'deleteEmail'];
const functionsToPass = UI_FUNCTIONS.filter(f => gmailFunctionNames.includes(f.name));
```
Expected: Narrow down if issue is specific to Gmail functions

### Phase 2: Validate Function Schema

For each function, verify:
```javascript
{
  name: string,                    // ✅ Required
  description: string,             // ✅ Required
  parameters: {
    type: 'object',               // ✅ Must be 'object'
    properties: {                 // ✅ Required
      [key]: {
        type: string,             // ✅ Valid JSON type
        description: string,      // ✅ Recommended
        default: any,             // ⚠️ Optional
        enum: array               // ⚠️ If applicable
      }
    },
    required: string[]            // ✅ Array of required param names
  }
}
```

### Phase 3: Monitor Token Usage

Check if combined size exceeds limits:
- **gpt-4o-mini context:** 128,000 tokens
- **gpt-4o context:** 128,000 tokens
- **Messages + Functions + Prompt:** Calculate total

---

## 📋 Function Schema Reference

### Example Gmail Function (readEmails)
```javascript
{
  name: 'readEmails',
  description: 'Read emails from the user\'s Gmail inbox. Use this when the user asks to check emails, read messages, show inbox, or wants to see their recent emails.',
  parameters: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'number',
        description: 'Number of emails to retrieve (default: 10, max: 50)',
        default: 10
      },
      query: {
        type: 'string',
        description: 'Optional search query (e.g., "from:example@gmail.com", "is:unread", "subject:important")'
      }
    },
    required: []
  }
}
```

### All 26 Functions Currently Passed
1. changeModel
2. createNewChat
3. deleteConversation
4. renameConversation
5. pinConversation
6. navigateToConversation
7. uploadFile
8. initiateVoiceChat
9. webSearch
10. readEmails ⭐
11. searchEmails ⭐
12. sendEmail ⭐
13. markEmailAsRead ⭐
14. archiveEmail ⭐
15. deleteEmail ⭐
16. listCalendarEvents
17. createCalendarEvent
18. deleteCalendarEvent
19. listDriveFiles
20. searchDriveFiles
21. shareDriveFile
22. deleteDriveFile
23. createDocument
24. readDocument
25. createSpreadsheet
26. readSpreadsheet

---

## 💡 Suggested Solutions

### Solution A: Reduce Function Count
```javascript
// Only pass Gmail functions when Gmail is mentioned
if (mentionsGoogle && hasGoogleAccess) {
  const googleFunctions = UI_FUNCTIONS.filter(f => 
    f.name.includes('Email') || 
    f.name.includes('Calendar') ||
    f.name.includes('Drive') ||
    f.name.includes('Document') ||
    f.name.includes('Spreadsheet')
  );
  functionsToPass = googleFunctions;
} else if (isActionCommand) {
  functionsToPass = UI_FUNCTIONS; // All UI functions
}
```

### Solution B: Validate All Schemas
```javascript
// Add schema validation before sending to OpenAI
function validateFunctionSchema(func) {
  if (!func.name || typeof func.name !== 'string') return false;
  if (!func.description || typeof func.description !== 'string') return false;
  if (!func.parameters || func.parameters.type !== 'object') return false;
  if (!func.parameters.properties) return false;
  return true;
}

const validFunctions = functionsToPass.filter(validateFunctionSchema);
```

### Solution C: Use Function Calling Optimized Model
```javascript
// Force gpt-4o for Gmail queries
if (mentionsGoogle && hasGoogleAccess) {
  selectedModel = 'gpt-4o'; // Better function calling support
}
```

---

## 📊 Database Verification Queries

```sql
-- Check user's Google connection
SELECT 
  u.id,
  u.email,
  u.google_id,
  u.profile_picture,
  ot.expires_at,
  ot.scope,
  ot.last_refreshed_at,
  (ot.expires_at < NOW()) as token_expired
FROM users u
LEFT JOIN oauth_tokens ot ON u.id = ot.user_id AND ot.provider = 'google'
WHERE u.email = 'admin@myaiagent.com';

-- Check recent Gmail function calls (from logs)
-- Note: This requires log parsing, not a direct query
```

---

## 🎓 Technical Context

### OpenAI Function Calling Requirements

**Official Documentation:**
- Function names: lowercase, underscores allowed
- Parameters: Must be JSON Schema compatible
- Required fields: name, description, parameters
- Max functions: Not officially documented, but 100+ known to work

**Known Limitations:**
- Very large function sets may cause timeouts
- Complex nested schemas can cause issues
- Model-specific support varies (gpt-4o > gpt-4o-mini)

### Our Implementation
- 26 total functions defined
- Each function properly structured
- All required fields present
- Action detection working correctly

**The gap:** OpenAI accepting the functions payload

---

## 📞 Next Steps

1. **Consultant reviews this package**
2. **Implement diagnostic logging** (capture full OpenAI request)
3. **Run isolation tests** (no functions → 1 function → Gmail only → all)
4. **Analyze error details** from OpenAI response body
5. **Apply recommended solution** based on findings
6. **Test end-to-end** Gmail integration
7. **Document resolution** for future reference

---

## 📁 File Locations for Quick Reference

```
Project Root/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── google-auth.js          # OAuth endpoints
│   │   │   └── messages.js             # Action detection (lines 154-204)
│   │   └── services/
│   │       ├── gmail.js                # Gmail API functions
│   │       ├── tokenManager.js         # Token management
│   │       ├── uiFunctions.js          # Function schemas & execution
│   │       └── openai.js               # OpenAI API calls
│   └── database/
│       └── schema.sql                  # Database schema
│
└── Documentation/
    ├── GMAIL_INTEGRATION_TECHNICAL_REPORT.md       ⭐ THIS IS THE MAIN DOC
    ├── GOOGLE_SERVICES_BUG_REPORT.md
    ├── GOOGLE_ACCESS_DIAGNOSTIC_REPORT.md
    ├── DIAGNOSTIC_PACKAGE_FOR_DEV_TEAM.md
    └── CONSULTANT_PACKAGE_GMAIL_INTEGRATION.md     ⭐ YOU ARE HERE
```

---

## ✅ Checklist for Consultant

- [ ] Read GMAIL_INTEGRATION_TECHNICAL_REPORT.md
- [ ] Review enhanced action detection code (messages.js:154-204)
- [ ] Add diagnostic logging to capture OpenAI request payload
- [ ] Run isolation tests (no functions → 1 function → all)
- [ ] Analyze 400 error response body for details
- [ ] Validate all 26 function schemas
- [ ] Test with different models (gpt-4o vs gpt-4o-mini)
- [ ] Calculate total request size and token count
- [ ] Implement recommended solution
- [ ] Verify Gmail integration end-to-end
- [ ] Document findings and resolution

---

**Status:** Ready for consultant review  
**Last Updated:** November 2, 2025  
**Contact:** Development Team

---

## 📝 Summary for Consultant

We have a **complete Gmail integration** with:
- ✅ Secure OAuth 2.0 implementation
- ✅ Token management with auto-refresh
- ✅ 6 Gmail API functions fully implemented
- ✅ Enhanced action detection (deployed today)
- ✅ Proper security and error handling

**The only blocker** is an OpenAI 400 error when passing functions. Action detection correctly identifies Gmail queries and passes 26 functions to OpenAI, but OpenAI rejects the request.

**Your mission:** Diagnose why OpenAI returns 400, identify if it's function count/schema/size related, and implement the fix.

All documentation, code locations, diagnostic queries, and recommended solutions are provided in this package.
