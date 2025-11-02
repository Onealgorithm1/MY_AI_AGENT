# Gmail Integration - Technical Report
**Date:** November 2, 2025  
**Project:** My AI Agent MVP  
**Status:** Implementation Complete - Debugging Required

---

## 📋 Executive Summary

This document provides a comprehensive overview of the Gmail integration implementation in the My AI Agent MVP application. The integration uses **custom Google OAuth 2.0** (not Replit's connector) to enable AI-powered Gmail functionality with per-user authentication.

**Current Status:**
- ✅ OAuth 2.0 flow implemented and working
- ✅ Token management with encryption and auto-refresh
- ✅ Gmail API functions fully implemented
- ✅ Enhanced action detection deployed
- ⚠️ OpenAI API returning 400 errors when calling Gmail functions
- ⚠️ Needs diagnostic testing and error resolution

---

## 🏗️ Architecture Overview

### System Components

```
User Query → Action Detection → OpenAI API → Function Call → Gmail API → Response
              ↓                    ↓              ↓              ↓
         [messages.js]      [UI_FUNCTIONS]  [uiFunctions.js]  [gmail.js]
                                                                  ↓
                                                          [tokenManager.js]
                                                                  ↓
                                                          [OAuth Tokens DB]
```

### Technology Stack
- **OAuth Provider:** Google OAuth 2.0 (custom implementation)
- **API:** Gmail API v1 via googleapis npm package
- **Database:** PostgreSQL with `oauth_tokens` table
- **Encryption:** AES-256-GCM for token storage
- **Token Management:** Automatic refresh 5 minutes before expiry

---

## 🔐 OAuth 2.0 Flow

### 1. Authentication Endpoints

**File:** `backend/src/routes/google-auth.js`

#### Login/Signup Flow
```javascript
GET /api/auth/google/login
→ Generates state token with HMAC-SHA256 signature
→ Returns Google OAuth URL
→ User authorizes in Google popup
→ Google redirects to /api/auth/google/callback
→ Exchange code for tokens
→ Store encrypted tokens in database
→ Create/update user account
→ Redirect to frontend with JWT
```

#### Account Linking Flow
```javascript
GET /api/auth/google/connect (requires authentication)
→ Generates state token with userId
→ User authorizes in Google popup
→ Callback validates and links Google account
→ Stores tokens for existing user
→ Redirects to settings page
```

### 2. OAuth Scopes Requested

```javascript
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets'
];
```

---

## 🔑 Token Management

**File:** `backend/src/services/tokenManager.js`

### Token Storage Schema

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,           -- AES-256-GCM encrypted
  refresh_token TEXT,                   -- AES-256-GCM encrypted
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP NOT NULL,
  scope TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_refreshed_at TIMESTAMP,
  UNIQUE(user_id, provider)
);
```

### Token Lifecycle Management

1. **Storage:** Tokens encrypted with AES-256-GCM before database insertion
2. **Retrieval:** Automatic refresh if within 5 minutes of expiry
3. **Refresh:** Uses refresh token to get new access token
4. **Revocation:** Deletes and revokes tokens on disconnect
5. **Error Handling:** Deletes expired tokens that cannot be refreshed

### Key Methods

```javascript
// Get valid token (auto-refreshes if needed)
tokenManager.getValidToken(userId, 'google')

// Store new tokens (encrypted)
tokenManager.storeTokens(userId, tokens)

// Check if user has valid token
tokenManager.hasValidToken(userId, 'google')

// Delete and revoke tokens
tokenManager.deleteTokens(userId, 'google')
```

---

## 📧 Gmail API Functions

**File:** `backend/src/services/gmail.js`

### Available Functions

#### 1. List Emails
```javascript
listEmails(userId, options = {
  maxResults: 20,
  query: '',
  labelIds: ['INBOX']
})
```
- Returns: Array of email objects with metadata and body
- Pagination: maxResults limit
- Search: Supports Gmail query syntax

#### 2. Search Emails
```javascript
searchEmails(userId, query, maxResults = 20)
```
- Search syntax: `from:example@gmail.com`, `is:unread`, `subject:important`

#### 3. Send Email
```javascript
sendEmail(userId, {
  to: 'recipient@example.com',
  subject: 'Subject',
  body: 'Plain text body',
  html: '<p>HTML body</p>' // optional
})
```
- MIME encoding: Base64 URL-safe
- Supports both plain text and HTML

#### 4. Mark as Read/Unread
```javascript
markAsRead(userId, messageId)
markAsUnread(userId, messageId)
```
- Modifies UNREAD label

#### 5. Archive Email
```javascript
archiveEmail(userId, messageId)
```
- Removes INBOX label

#### 6. Delete Email
```javascript
deleteEmail(userId, messageId)
```
- Permanently deletes message

#### 7. Get Unread Count
```javascript
getUnreadCount(userId)
```
- Returns: `{ unreadCount, totalCount }`

---

## 🤖 AI Function Calling Integration

### 1. UI Functions Schema

**File:** `backend/src/services/uiFunctions.js`

Gmail functions exposed to OpenAI:

```javascript
const UI_FUNCTIONS = [
  {
    name: 'readEmails',
    description: 'Read emails from Gmail inbox',
    parameters: {
      maxResults: { type: 'number', default: 10 },
      query: { type: 'string', description: 'Optional search query' }
    }
  },
  {
    name: 'searchEmails',
    description: 'Search for specific emails',
    parameters: {
      query: { type: 'string', required: true },
      maxResults: { type: 'number', default: 10 }
    }
  },
  {
    name: 'sendEmail',
    description: 'Send an email via Gmail',
    parameters: {
      to: { type: 'string', required: true },
      subject: { type: 'string', required: true },
      body: { type: 'string' },
      html: { type: 'string' }
    }
  },
  {
    name: 'markEmailAsRead',
    description: 'Mark email as read',
    parameters: {
      emailId: { type: 'string', required: true }
    }
  },
  {
    name: 'archiveEmail',
    description: 'Archive an email',
    parameters: {
      emailId: { type: 'string', required: true }
    }
  },
  {
    name: 'deleteEmail',
    description: 'Delete an email',
    parameters: {
      emailId: { type: 'string', required: true }
    }
  }
];
```

### 2. Enhanced Action Detection

**File:** `backend/src/routes/messages.js` (Lines 154-204)

**Implementation Date:** November 2, 2025

```javascript
// Expanded action verbs for natural language
const actionVerbs = [
  // Original verbs
  'read my', 'show my', 'list my', 'get my', 'check my',
  
  // NEW - Natural language patterns
  'see my', 'view my', 'tell me my', 'what are my',
  'what is my', 'access my', 'display my', 'pull up my',
  'load my',
  
  // Gmail specific
  'send email', 'compose', 'write email',
  'search for', 'find', 'look for'
];

// Google service keywords
const googleKeywords = [
  'email', 'gmail', 'inbox', 'mail', 'message', 'messages',
  'calendar', 'event', 'events', 'meeting', 'meetings',
  'drive', 'file', 'files', 'folder', 'folders',
  'doc', 'docs', 'document', 'documents',
  'sheet', 'sheets', 'spreadsheet', 'spreadsheets'
];

// Detection logic
const mentionsGoogle = googleKeywords.some(kw => userQuery.includes(kw));
const isActionCommand = actionVerbs.some(verb => userQuery.includes(verb));
const hasGoogleAccess = !!req.user.google_id;

// Pass functions if action command OR mentions Google with access
const shouldPassFunctions = isActionCommand || (mentionsGoogle && hasGoogleAccess);
const functionsToPass = shouldPassFunctions ? UI_FUNCTIONS : null;
```

**Detection Logging:**
```javascript
console.log('📋 Action Detection:', {
  query: userQuery.substring(0, 50),
  isAction: isActionCommand,
  mentionsGoogle,
  hasGoogleAccess,
  shouldPassFunctions,
  functionsCount: functionsToPass ? functionsToPass.length : 0
});
```

### 3. Function Execution Flow

**File:** `backend/src/services/uiFunctions.js` (Lines 526-639)

```javascript
// Security check
if (gmailFunctions.includes(functionName)) {
  if (!context.user) {
    return { success: false, message: 'You must be logged in' };
  }
}

// Example: readEmails execution
if (functionName === 'readEmails') {
  const emails = await listEmails(
    context.user.id,  // Use authenticated user's ID
    { 
      maxResults: args.maxResults || 10,
      query: args.query || ''
    }
  );
  
  return {
    success: true,
    message: `Found ${emails.length} email(s)`,
    data: { emails }
  };
}
```

---

## 🔧 Current Issues

### Issue 1: OpenAI 400 Bad Request

**Error Log:**
```
📋 Action Detection: {
  query: 'search my gmail',
  isAction: false,
  mentionsGoogle: true,
  hasGoogleAccess: true,
  shouldPassFunctions: true,
  functionsCount: 26
}

OpenAI chat error: {
  status: 400,
  statusText: 'Bad Request',
  message: 'Request failed with status code 400'
}
```

**Analysis:**
- ✅ Action detection is working correctly
- ✅ Functions are being passed to OpenAI (26 functions)
- ✅ User has Google access
- ❌ OpenAI rejecting the request with 400 error

**Possible Causes:**
1. **Functions payload too large:** 26 functions may exceed OpenAI's limit
2. **Invalid function schema:** One or more function definitions may be malformed
3. **Model incompatibility:** gpt-4o-mini may have function calling limitations
4. **Token limit exceeded:** Combined prompt + functions may be too large

**Recommended Diagnostics:**
1. Log the full functions payload being sent to OpenAI
2. Test with fewer functions (just Gmail functions)
3. Validate function schema against OpenAI's requirements
4. Check if issue persists with gpt-4o (non-mini)

---

## 🧪 Testing Guide

### Prerequisites
1. User must have Google account connected
2. Check connection status: `GET /api/auth/google/status`
3. Verify `google_id` field is populated in users table
4. Confirm tokens exist in `oauth_tokens` table

### Test Queries

#### Gmail Reading
```
✅ Test: "read my emails"
   Expected: Triggers readEmails function

✅ Test: "what do you see in my gmail"
   Expected: Triggers readEmails function

✅ Test: "show me my inbox"
   Expected: Triggers readEmails function

✅ Test: "check my unread messages"
   Expected: Triggers readEmails with query filter
```

#### Gmail Search
```
✅ Test: "search my gmail for emails from john@example.com"
   Expected: Triggers searchEmails function

✅ Test: "find emails with subject meeting"
   Expected: Triggers searchEmails function
```

#### Gmail Send
```
✅ Test: "send an email to test@example.com about project update"
   Expected: Triggers sendEmail function
```

### Debug Logging

Enable verbose logging to track:

```bash
# Action Detection
📋 Action Detection: { query, isAction, mentionsGoogle, hasGoogleAccess, shouldPassFunctions, functionsCount }

# Token Retrieval
✅ Token refreshed successfully for user: {userId}
❌ Token refresh failed for user: {userId}

# Gmail API Calls
Error listing emails: {error.message}
Error sending email: {error.message}
```

---

## 📊 Database Queries for Debugging

### Check User's Google Connection
```sql
SELECT 
  id, 
  email, 
  google_id, 
  profile_picture
FROM users 
WHERE id = '{userId}';
```

### Check OAuth Tokens
```sql
SELECT 
  provider,
  expires_at,
  scope,
  created_at,
  last_refreshed_at,
  (expires_at < NOW()) as is_expired
FROM oauth_tokens 
WHERE user_id = '{userId}';
```

### Check Recent Token Refreshes
```sql
SELECT 
  user_id,
  last_refreshed_at,
  expires_at
FROM oauth_tokens 
WHERE provider = 'google'
ORDER BY last_refreshed_at DESC
LIMIT 10;
```

---

## 🔍 Key Code Locations

| Component | File Path | Lines |
|-----------|-----------|-------|
| OAuth Routes | `backend/src/routes/google-auth.js` | 1-188 |
| Token Manager | `backend/src/services/tokenManager.js` | 1-158 |
| Gmail Service | `backend/src/services/gmail.js` | 1-285 |
| Action Detection | `backend/src/routes/messages.js` | 154-204 |
| UI Functions | `backend/src/services/uiFunctions.js` | 526-639 |
| Function Schema | `backend/src/services/uiFunctions.js` | 98-175 |

---

## 🎯 Next Steps for Consultant

### Priority 1: Resolve OpenAI 400 Error

**Investigation Required:**
1. Capture and analyze the full OpenAI request payload
2. Validate function schema compliance with OpenAI spec
3. Test with reduced function set (Gmail only)
4. Verify model compatibility (gpt-4o vs gpt-4o-mini)

**Suggested Debugging Code:**
```javascript
// In backend/src/routes/messages.js, before createChatCompletion
console.log('🔍 OpenAI Request Debug:', {
  model: selectedModel,
  messageCount: messages.length,
  functionsCount: functionsToPass?.length,
  functionNames: functionsToPass?.map(f => f.name),
  totalPayloadSize: JSON.stringify({ messages, functions: functionsToPass }).length
});
```

### Priority 2: Validate Token Refresh Flow

**Test Scenarios:**
1. Use expired token (manually set `expires_at` in past)
2. Verify auto-refresh triggers correctly
3. Confirm Gmail API calls succeed after refresh
4. Test behavior when refresh token is invalid

### Priority 3: End-to-End Testing

**Complete User Journey:**
1. User connects Google account
2. User asks "what's in my gmail?"
3. AI detects Gmail intent
4. Functions passed to OpenAI
5. OpenAI calls readEmails function
6. System retrieves valid token
7. Gmail API returns emails
8. AI formats response for user

---

## 📞 Support Information

**Environment Variables Required:**
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.replit.dev/api/auth/google/callback
ENCRYPTION_KEY=64_hex_character_key
OPENAI_API_KEY=sk-...
```

**Security Features:**
- ✅ AES-256-GCM encryption for tokens
- ✅ HMAC-SHA256 signed state tokens
- ✅ 10-minute state token expiration
- ✅ Per-user token isolation
- ✅ Automatic token revocation on disconnect
- ✅ CSRF protection via state parameter

**Rate Limiting:**
- ✅ Exponential backoff for Google API (3 retries)
- ✅ Handles 429/403/5xx errors gracefully

---

## 📝 Summary

The Gmail integration is **architecturally complete** with proper OAuth 2.0, secure token management, and comprehensive API coverage. The **enhanced action detection** successfully identifies Gmail-related queries and passes functions to OpenAI. 

**The current blocker** is an OpenAI 400 error when the AI attempts to call Gmail functions. This requires investigation into the OpenAI request payload, function schema validation, and potential model limitations.

**Recommendation:** Focus diagnostic efforts on capturing and analyzing the exact OpenAI API request to identify why it's being rejected with a 400 error.

---

**Document Version:** 1.0  
**Last Updated:** November 2, 2025  
**Author:** AI Agent Development Team
