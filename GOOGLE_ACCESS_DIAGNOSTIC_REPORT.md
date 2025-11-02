# Google Services Access - Complete Diagnostic Report
**For Dev Team Consultant Review**

**Report Date**: November 2, 2025  
**Current Status**: AI can see Google connection but cannot access services  
**Severity**: HIGH - Blocking Gmail, Calendar, Drive, Docs, Sheets functionality  

---

## Executive Summary

The AI agent is now correctly detecting that users have Google accounts connected (after the `googleId` fix), but it's still unable to execute Gmail/Google service functions. The root cause appears to be a **function calling pipeline issue** where functions are either:
1. Not being passed to the OpenAI API due to action detection failures
2. Being passed but OpenAI is not calling them
3. Being called but failing silently without error logs

This report provides a complete diagnostic analysis, data flow breakdown, and step-by-step debugging procedures.

---

## PART 1: googleId Context Fix (COMPLETED ✅)

### Issue Found
The user context object sent to the AI system prompt was missing the `googleId` field, causing the AI to always think Google wasn't connected.

### Fixes Applied

#### 1. Updated Auth Middleware
**File**: `myaiagent-mvp/backend/src/middleware/auth.js`

**Before**:
```javascript
const result = await query(
  `SELECT id, email, full_name, role, is_active, phone, profile_image, 
          created_at, last_login_at, settings, preferences 
   FROM users WHERE id = $1`,
  [decoded.id]
);
```

**After**:
```javascript
const result = await query(
  `SELECT id, email, full_name, role, is_active, phone, profile_image, 
          created_at, last_login_at, settings, preferences, google_id  // ← ADDED
   FROM users WHERE id = $1`,
  [decoded.id]
);
```

**Impact**: `req.user.google_id` now contains the user's Google ID from database.

---

#### 2. Updated UI Context Builder
**File**: `myaiagent-mvp/backend/src/middleware/uiContext.js`

**Before**:
```javascript
export const buildEnhancedContext = (req) => {
  const context = {
    ui: req.uiContext || {},
    user: {
      id: req.user?.id,
      email: req.user?.email,
      fullName: req.user?.full_name,
      role: req.user?.role,
      phone: req.user?.phone,
      profileImage: req.user?.profile_image,
      createdAt: req.user?.created_at,
      lastLoginAt: req.user?.last_login_at,
      settings: req.user?.settings,
      preferences: req.user?.preferences
      // ❌ googleId was MISSING
    },
    timestamp: new Date().toISOString(),
    features: req.fullUISchema?.features || {}
  };
  return context;
};
```

**After**:
```javascript
export const buildEnhancedContext = (req) => {
  const context = {
    ui: req.uiContext || {},
    user: {
      id: req.user?.id,
      email: req.user?.email,
      fullName: req.user?.full_name,
      role: req.user?.role,
      phone: req.user?.phone,
      profileImage: req.user?.profile_image,
      createdAt: req.user?.created_at,
      lastLoginAt: req.user?.last_login_at,
      settings: req.user?.settings,
      preferences: req.user?.preferences,
      googleId: req.user?.google_id  // ✅ ADDED
    },
    timestamp: new Date().toISOString(),
    features: req.fullUISchema?.features || {}
  };
  return context;
};
```

**Impact**: User context now includes `googleId`, which flows to `generateUIAwarePrompt()`.

---

#### 3. System Prompt Generation
**File**: `myaiagent-mvp/backend/src/middleware/uiContext.js` (Lines 52-60)

```javascript
// Google OAuth status
if (userContext.googleId) {
  userInfo += `\n- **Google Account**: ✅ Connected (Gmail, Calendar, Drive access available)`;
  userInfo += `\n  - You CAN call Gmail functions (readEmails, searchEmails, sendEmail, etc.)`;
} else {
  userInfo += `\n- **Google Account**: ❌ Not Connected`;
  userInfo += `\n  - Gmail functions are NOT available`;
  userInfo += `\n  - If user asks about email access, guide them to connect Google in Settings`;
}
```

**Status**: Now correctly shows "✅ Connected" for users with Google linked.

---

## PART 2: Function Calling Pipeline Analysis

### Data Flow: User Query → Google Function Execution

```
1. User sends message: "read my latest emails"
   ↓
2. POST /api/conversations/:id/messages (routes/messages.js)
   ↓
3. Auth middleware adds req.user (with google_id)
   ↓
4. UI context middleware builds enhanced context
   ↓
5. generateUIAwarePrompt() creates system message with Google status
   ↓
6. ACTION DETECTION LOGIC (Line 151-172):
   - Checks if message contains action verbs
   - Determines functionsToPass = isActionCommand ? UI_FUNCTIONS : null
   ↓
7. createChatCompletion(messages, model, stream, functionsToPass)
   ↓
8. OpenAI API receives:
   - System prompt: "Google Account: ✅ Connected, you CAN call Gmail functions"
   - Functions: Array of 30+ UI_FUNCTIONS (if action detected)
   - User message: "read my latest emails"
   ↓
9. OpenAI decides whether to call function or respond with text
   ↓
10. IF function called:
    - Streaming: Function detected in delta.function_call
    - executeUIFunction() called with function name and args
    - Gmail service executes readEmails(userId, options)
    - Result returned to AI for final response
```

### Critical Checkpoints

**Checkpoint 1: Action Detection** (Line 169)
```javascript
const actionVerbs = [
  'switch to', 'change to', 'use ', 'select ', 'set model',
  'create a', 'create new', 'make a', 'make new', 'start a',
  'delete ', 'remove ', 'clear ', 'trash ',
  'rename ',
  'pin ', 'unpin ',
  'navigate to', 'go to', 'open ',
  'upload ', 'attach ',
  'call ', 'dial ',
  'send email', 'send a', 'compose', 'write email', 'email ',
  'read my', 'show my', 'list my', 'get my', 'check my',  // ← Gmail triggers
  'search for', 'find ', 'look for',
  'schedule ', 'book ', 'add event', 'add to calendar',
  'share ', 'give access',
];

const lowercaseContent = content.toLowerCase();
const isActionCommand = actionVerbs.some(verb => lowercaseContent.includes(verb));
const functionsToPass = isActionCommand ? UI_FUNCTIONS : null;
```

**Issue**: Phrases like "what do you see in my gmail" do NOT contain action verbs:
- ❌ "see in my" ≠ "show my"
- ❌ "tell me my" ≠ "read my"
- ✅ "read my emails" = contains "read my"
- ✅ "show my inbox" = contains "show my"

**Checkpoint 2: Function Passing** (Line 188/326)
```javascript
const completion = await createChatCompletion(messages, selectedModel, true, functionsToPass);
```

If `functionsToPass` is `null`, OpenAI API never receives function definitions.

**Checkpoint 3: OpenAI Function Calling**
Even if functions are passed, OpenAI may choose NOT to call them if:
- The query doesn't seem like an action
- The system prompt is ambiguous
- The model selected (gpt-3.5-turbo) has poor function calling

**Checkpoint 4: Function Execution** (Line 201-208 for streaming)
```javascript
if (delta?.function_call) {
  if (delta.function_call.name) {
    functionName = delta.function_call.name;
  }
  if (delta.function_call.arguments) {
    functionArgs += delta.function_call.arguments;
  }
  functionCall = { name: functionName, arguments: functionArgs };
}
```

---

## PART 3: Diagnostic Evidence

### From Backend Logs (Latest Session):

```
🤖 Auto-selected model: gpt-4o for query: "can you see updates now..."
POST / - 200 (1656ms)

🤖 Auto-selected model: gpt-4o for query: "what do you see in my gmail..."
POST / - 200 (1300ms)

🤖 Auto-selected model: gpt-3.5-turbo for query: "no tell me my first new email..."
POST / - 200 (962ms)

🤖 Auto-selected model: gpt-4o-mini for query: "whatb is taking so long..."
POST / - 200 (1178ms)
```

**Critical Observation**: NO function calls logged!

Expected logs if functions were called:
```
📋 Gmail function called: readEmails
📋 Executing Gmail function with userId: xxxxx
```

**Conclusion**: Either:
1. Functions not passed to OpenAI (action detection failed)
2. Functions passed but OpenAI didn't call them
3. Functions called but execution failed silently

---

## PART 4: Debug Instrumentation Added

### New Debug Logging
**File**: `myaiagent-mvp/backend/src/routes/messages.js` (Line 177-183)

```javascript
// Debug logging for function calling
console.log('📋 Action Detection:', {
  query: content.substring(0, 50),
  isAction: isActionCommand,
  functionsCount: functionsToPass ? functionsToPass.length : 0,
  hasGoogleId: !!req.user.google_id
});
```

This will show:
```javascript
📋 Action Detection: {
  query: 'what do you see in my gmail',
  isAction: false,  // ← If false, functions NOT passed!
  functionsCount: 0,
  hasGoogleId: true
}
```

### Testing After Backend Restart

**Step 1**: Restart backend to activate debug logging
**Step 2**: User asks: "read my latest emails"
**Step 3**: Check logs for:
```
📋 Action Detection: {
  query: 'read my latest emails',
  isAction: true,     // ← Should be true
  functionsCount: 30, // ← Should have functions
  hasGoogleId: true   // ← Should be true
}
```

**Step 4**: If `isAction: false`, then action verb detection is failing
**Step 5**: If `isAction: true` but no function call logged, then OpenAI is not calling the function

---

## PART 5: Probable Root Causes & Solutions

### Root Cause #1: Action Verb Detection Too Narrow

**Problem**: Queries like these don't trigger function passing:
- "what do you see in my gmail" (contains "see" but not "show my")
- "tell me my first new email" (contains "tell" but not "read my")
- "can you access my inbox" (contains "access" but not any action verb)

**Solution A - Expand Action Verbs**:
```javascript
const actionVerbs = [
  // ... existing verbs ...
  'read my', 'show my', 'list my', 'get my', 'check my',
  'see my', 'view my', 'tell me my', 'what are my', 'what is my',  // ADD THESE
  'access my', 'open my', 'display my',  // ADD THESE
];
```

**Solution B - Always Pass Functions for Gmail Keywords**:
```javascript
const gmailKeywords = ['email', 'gmail', 'inbox', 'message'];
const calendarKeywords = ['calendar', 'event', 'meeting', 'appointment'];
const driveKeywords = ['drive', 'file', 'document', 'folder'];

const hasGoogleKeyword = [
  ...gmailKeywords, 
  ...calendarKeywords, 
  ...driveKeywords
].some(keyword => lowercaseContent.includes(keyword));

// Pass functions if action verb OR Google keyword + user has google_id
const functionsToPass = (isActionCommand || (hasGoogleKeyword && req.user.google_id)) 
  ? UI_FUNCTIONS 
  : null;
```

**Solution C - Smart Context Detection (RECOMMENDED)**:
```javascript
// If user has Google connected AND mentions Google services, pass functions
const googleKeywords = ['email', 'gmail', 'inbox', 'calendar', 'drive', 'doc', 'sheet'];
const mentionsGoogle = googleKeywords.some(kw => lowercaseContent.includes(kw));
const hasGoogleAccess = !!req.user.google_id;

const shouldPassFunctions = isActionCommand || (mentionsGoogle && hasGoogleAccess);
const functionsToPass = shouldPassFunctions ? UI_FUNCTIONS : null;
```

---

### Root Cause #2: Model Selection Incompatibility

**Problem**: From logs, user queries are getting routed to different models:
- gpt-4o (good function calling)
- gpt-3.5-turbo (poor function calling)
- gpt-4o-mini (moderate function calling)

**Evidence**:
```
🤖 Auto-selected model: gpt-3.5-turbo for query: "no tell me my first new email..."
```

`gpt-3.5-turbo` has known issues with function calling reliability.

**Solution**: Force gpt-4o or gpt-4o-mini for Google service queries:
```javascript
// Model selection override for Google services
if (shouldPassFunctions && hasGoogleAccess) {
  selectedModel = 'gpt-4o'; // Force best model for function calling
  console.log('🔧 Overriding model to gpt-4o for Google services');
}
```

---

### Root Cause #3: System Prompt Ambiguity

**Problem**: System prompt says "you CAN call Gmail functions" but doesn't INSTRUCT the AI to do so.

**Current Prompt** (Line 149):
```javascript
**Google Services** (when connected): Gmail (readEmails, sendEmail, searchEmails), 
Calendar (listEvents, createEvent, deleteEvent), Drive (listFiles, searchFiles, 
shareFile, deleteFile), Docs (createDoc, readDoc, updateDoc), Sheets (createSheet, 
readSheet, updateSheet, appendRow)
```

**Enhanced Prompt**:
```javascript
**Google Services** (when connected): 
- **Gmail**: readEmails, sendEmail, searchEmails, archiveEmail, deleteEmail
  → When user asks about emails/inbox, CALL readEmails() function
- **Calendar**: listEvents, createEvent, deleteEvent
  → When user asks about calendar/events, CALL listEvents() function
- **Drive**: listFiles, searchFiles, shareFile, deleteFile
  → When user asks about files/drive, CALL listFiles() function
- **Docs**: createDoc, readDoc, updateDoc
- **Sheets**: createSheet, readSheet, updateSheet, appendRow

**IMPORTANT**: When user mentions email/calendar/drive, use the function instead of saying you can't access it.
```

---

### Root Cause #4: Gmail Routes Admin-Only Restriction

**Problem**: Gmail functions might be restricted to admin users only.

**Check This**:
**File**: `myaiagent-mvp/backend/src/routes/google-gmail.js`

```javascript
router.get('/gmail/emails', authenticate, requireAdmin, async (req, res) => {
  // ← Does this have requireAdmin middleware?
});
```

If Gmail routes require admin role, but your user is role='user', they CAN'T access Gmail.

**Solution**: Remove `requireAdmin` if it exists:
```javascript
router.get('/gmail/emails', authenticate, async (req, res) => {
  // Now any authenticated user with Google can access
});
```

**But check function execution**:
**File**: `myaiagent-mvp/backend/src/services/uiFunctions.js` (Line 528-535)

```javascript
if (gmailFunctions.includes(functionName)) {
  if (!context.user) {
    return {
      success: false,
      message: 'You must be logged in to access Gmail',
      data: null,
    };
  }
  // ❓ Does it check context.user.role === 'admin' here?
}
```

---

## PART 6: Step-by-Step Debugging Procedure

### For Your Dev Consultant

#### Step 1: Verify googleId is in User Context
```bash
# Restart backend to get fresh logs
npm run dev

# In browser console or backend logs, check:
# When user sends message, look for:
```

**Expected in logs**:
```javascript
User context: { googleId: '102018369222117193487', ... }
```

**Test Query**: Have user send ANY message, check if `googleId` appears in context logs.

---

#### Step 2: Test Action Detection
```bash
# User sends: "read my latest emails"
# Check logs for:
```

**Expected**:
```javascript
📋 Action Detection: {
  query: 'read my latest emails',
  isAction: true,        // ← MUST be true
  functionsCount: 30,    // ← MUST have functions
  hasGoogleId: true      // ← MUST be true
}
```

**If `isAction: false`**: Action verb detection is failing → Apply Root Cause #1 solution

**If `functionsCount: 0`**: Functions not being passed → Check `UI_FUNCTIONS` export

---

#### Step 3: Test Function Calling
```bash
# User sends: "read my emails"
# Check logs for function execution:
```

**Expected**:
```javascript
📋 Gmail function called: readEmails
📋 Executing function: readEmails with args: {...}
```

**If NO function call logged**:
- OpenAI is receiving functions but not calling them
- Apply Root Cause #2 (model selection) or #3 (system prompt)

---

#### Step 4: Test Function Execution
```bash
# If function IS called, check for errors:
```

**Expected**:
```javascript
✅ Gmail service: emails retrieved successfully
```

**Possible errors**:
```javascript
Error: Gmail access token expired. Please reconnect...
Error: You must be logged in to access Gmail  // ← Admin-only check
Error: Google Calendar API error: 403 Forbidden  // ← Permission issue
```

---

#### Step 5: Database Verification
```sql
-- Verify user has google_id and OAuth tokens
SELECT 
  u.id, 
  u.email, 
  u.google_id,
  u.role,
  (SELECT COUNT(*) FROM oauth_tokens WHERE user_id = u.id) as token_count
FROM users u
WHERE u.email = 'netwerkinc19@gmail.com';
```

**Expected Result**:
```
id      | email                  | google_id            | role | token_count
--------|------------------------|----------------------|------|------------
uuid... | netwerkinc19@gmail.com | 102018369222117193  | user | 1
```

**If token_count = 0**: User doesn't have OAuth tokens → Need to reconnect Google

**If google_id = null**: OAuth didn't complete → Need to reconnect Google

**If role = 'user' AND Gmail is admin-only**: Remove admin restriction

---

## PART 7: Recommended Implementation Plan

### Priority 1: Enable Debug Logging ✅
**Status**: COMPLETED
**Action**: Backend restart required to activate

### Priority 2: Expand Action Detection
**File**: `myaiagent-mvp/backend/src/routes/messages.js`

```javascript
// Enhanced action verb detection
const actionVerbs = [
  // Model control
  'switch to', 'change to', 'use ', 'select ', 'set model',
  
  // Creation
  'create a', 'create new', 'make a', 'make new', 'start a',
  
  // Deletion
  'delete ', 'remove ', 'clear ', 'trash ',
  
  // Renaming
  'rename ',
  
  // Pinning
  'pin ', 'unpin ',
  
  // Navigation
  'navigate to', 'go to', 'open ',
  
  // File upload
  'upload ', 'attach ',
  
  // Voice
  'call ', 'dial ',
  
  // Gmail send
  'send email', 'send a', 'compose', 'write email', 'email ',
  
  // Gmail/Calendar/Drive read - EXPANDED
  'read my', 'show my', 'list my', 'get my', 'check my',
  'see my', 'view my', 'tell me my', 'what are my', 'what is my',  // ← ADD
  'access my', 'display my', 'pull up my',  // ← ADD
  
  // Search
  'search for', 'find ', 'look for',
  
  // Calendar
  'schedule ', 'book ', 'add event', 'add to calendar',
  
  // Drive
  'share ', 'give access',
];

// Smart Google keyword detection
const googleKeywords = ['email', 'gmail', 'inbox', 'message', 'calendar', 
                        'event', 'meeting', 'drive', 'file', 'doc', 'sheet'];
const mentionsGoogle = googleKeywords.some(kw => lowercaseContent.includes(kw));
const hasGoogleAccess = !!req.user.google_id;

// Pass functions if: action verb OR (Google keyword + has access)
const shouldPassFunctions = isActionCommand || (mentionsGoogle && hasGoogleAccess);
const functionsToPass = shouldPassFunctions ? UI_FUNCTIONS : null;

// Debug logging
console.log('📋 Action Detection:', {
  query: content.substring(0, 50),
  isAction: isActionCommand,
  mentionsGoogle,
  hasGoogleAccess,
  shouldPassFunctions,
  functionsCount: functionsToPass ? functionsToPass.length : 0
});
```

### Priority 3: Force Model for Google Services
```javascript
// After action detection, before createChatCompletion
if (shouldPassFunctions && hasGoogleAccess && mentionsGoogle) {
  // Force gpt-4o for reliable function calling
  if (selectedModel === 'gpt-3.5-turbo') {
    selectedModel = 'gpt-4o-mini';
    console.log('🔧 Upgraded model to gpt-4o-mini for Google services');
  }
}
```

### Priority 4: Enhance System Prompt
**File**: `myaiagent-mvp/backend/src/middleware/uiContext.js`

```javascript
if (userContext.googleId) {
  userInfo += `\n- **Google Account**: ✅ Connected (you have full access)`;
  userInfo += `\n  - **Gmail**: CALL readEmails() when user asks about emails/inbox`;
  userInfo += `\n  - **Calendar**: CALL listEvents() when user asks about calendar/events`;
  userInfo += `\n  - **Drive**: CALL listFiles() when user asks about files/drive`;
  userInfo += `\n  - **Docs/Sheets**: Available for creation and reading`;
  userInfo += `\n  - **IMPORTANT**: USE these functions instead of saying you can't access them!`;
} else {
  userInfo += `\n- **Google Account**: ❌ Not Connected`;
  userInfo += `\n  - Gmail/Calendar/Drive functions are NOT available`;
  userInfo += `\n  - Guide user to Settings to connect Google account`;
}
```

### Priority 5: Remove Admin Restrictions (If Applicable)
Check all Gmail route files and remove `requireAdmin` middleware if it exists.

---

## PART 8: Testing Checklist

After implementing fixes:

- [ ] ✅ Backend restarted with debug logging active
- [ ] ✅ User has `google_id` in database (verify with SQL query)
- [ ] ✅ User has OAuth tokens in `oauth_tokens` table
- [ ] ✅ User sends: "read my emails" → Check logs for `isAction: true`
- [ ] ✅ User sends: "what's in my inbox" → Check logs for `shouldPassFunctions: true`
- [ ] ✅ Function call logged: `readEmails` or similar
- [ ] ✅ Gmail service executes successfully
- [ ] ✅ AI responds with actual email data, not "can't access"
- [ ] ✅ Test Calendar: "list my calendar events"
- [ ] ✅ Test Drive: "show my Google Drive files"
- [ ] ✅ Test user WITHOUT Google connected → Should show "❌ Not Connected"

---

## PART 9: Expected Behavior After Fixes

### User WITH Google Connected:

**User**: "read my latest emails"

**Backend Logs**:
```javascript
📋 Action Detection: {
  query: 'read my latest emails',
  isAction: true,
  mentionsGoogle: true,
  hasGoogleAccess: true,
  shouldPassFunctions: true,
  functionsCount: 30
}
🔧 Upgraded model to gpt-4o-mini for Google services
📋 Function called: readEmails
📋 Executing Gmail function for user: d409def7-9844-49a4-a257-dece7054114c
✅ Retrieved 10 emails from Gmail API
```

**AI Response**:
```
Here are your latest emails:

1. **From: GitHub** - "Your pull request was merged"
   Received: 2 hours ago
   
2. **From: Replit** - "Your deployment is live"
   Received: 5 hours ago
   
3. **From: OpenAI** - "API usage summary for October"
   Received: 1 day ago

Would you like me to open any of these?
```

### User WITHOUT Google Connected:

**User**: "read my emails"

**Backend Logs**:
```javascript
📋 Action Detection: {
  query: 'read my emails',
  isAction: true,
  mentionsGoogle: true,
  hasGoogleAccess: false,  // ← No google_id
  shouldPassFunctions: false,
  functionsCount: 0
}
```

**AI Response**:
```
I don't have access to your Gmail account yet. To read your emails, please:
1. Go to Settings
2. Click "Connect Google Account"
3. Authorize Gmail access

Once connected, I'll be able to read, send, and manage your emails!
```

---

## PART 10: Critical Files Reference

### Authentication & Context
- `myaiagent-mvp/backend/src/middleware/auth.js` - Fetches google_id from database
- `myaiagent-mvp/backend/src/middleware/uiContext.js` - Builds user context, generates system prompt

### Message Handling & Function Calling
- `myaiagent-mvp/backend/src/routes/messages.js` - Action detection, function passing
- `myaiagent-mvp/backend/src/services/openai.js` - Creates chat completion with functions
- `myaiagent-mvp/backend/src/services/uiFunctions.js` - Defines UI_FUNCTIONS, executes functions

### Google Services
- `myaiagent-mvp/backend/src/services/gmail.js` - Gmail operations (readEmails, sendEmail, etc.)
- `myaiagent-mvp/backend/src/services/googleCalendar.js` - Calendar operations
- `myaiagent-mvp/backend/src/services/googleDrive.js` - Drive operations
- `myaiagent-mvp/backend/src/services/googleDocs.js` - Docs operations
- `myaiagent-mvp/backend/src/services/googleSheets.js` - Sheets operations

### OAuth & Token Management
- `myaiagent-mvp/backend/src/services/googleOAuth.js` - OAuth flow
- `myaiagent-mvp/backend/src/services/tokenManager.js` - Token storage, refresh, validation
- `myaiagent-mvp/backend/src/routes/google-auth.js` - OAuth callback routes

---

## PART 11: Contact & Next Steps

### Immediate Action Required
1. **Restart backend** to activate debug logging
2. **Test with user** who has Google connected
3. **Review logs** for action detection results
4. **Implement Priority 2 fix** (expanded action verbs) if `isAction: false`
5. **Implement Priority 4 fix** (enhanced prompt) if functions passed but not called

### If Still Not Working
1. Share backend logs with debug output
2. Verify database has correct google_id and tokens
3. Check for admin-only restrictions on Gmail routes
4. Test with different query phrasings

### Success Criteria
✅ User asks "read my emails" → AI calls readEmails() function  
✅ AI responds with actual email data from Gmail API  
✅ Calendar, Drive, Docs, Sheets functions work similarly  
✅ Users without Google see "Please connect Google account" message  

---

**Report prepared by**: Replit Agent  
**Last updated**: November 2, 2025  
**Status**: Awaiting backend restart and debug log review
