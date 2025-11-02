# Gmail Integration - Complete Workflow
**Complete Step-by-Step Process Flow**

---

## 🔄 WORKFLOW 1: User Connects Google Account

### Step 1: User Initiates Connection
**Location:** Frontend Settings Page

```
User clicks "Connect Google Account" button
    ↓
Frontend calls: GET /api/auth/google/connect
    ↓
Headers: { Authorization: "Bearer {JWT}" }
```

### Step 2: Backend Generates OAuth URL
**File:** `backend/src/routes/google-auth.js` (Line 29)

```javascript
1. authenticate middleware validates JWT token
2. Extract userId from token
3. Generate state token:
   - Create object: { userId: "abc-123", action: "connect" }
   - Add timestamp for 10-minute expiration
   - Sign with HMAC-SHA256 using ENCRYPTION_KEY
   - Base64 encode the signed payload
4. Generate Google OAuth URL:
   - client_id: GOOGLE_CLIENT_ID
   - redirect_uri: https://domain/api/auth/google/callback
   - response_type: code
   - scope: gmail.readonly, gmail.send, gmail.modify, calendar, drive, etc.
   - state: {signed_token}
   - access_type: offline (to get refresh token)
   - prompt: consent
5. Return: { authUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

### Step 3: User Authorizes in Google
**Location:** Google OAuth Popup

```
Frontend opens authUrl in popup window
    ↓
User sees Google authorization screen
User selects Google account
User clicks "Allow" to grant permissions
    ↓
Google redirects to: /api/auth/google/callback?code={AUTH_CODE}&state={STATE}
```

### Step 4: Backend Receives Callback
**File:** `backend/src/routes/google-auth.js` (Line 42)

```javascript
1. Extract code and state from query params
2. Verify state token:
   - Decode base64
   - Verify HMAC signature
   - Check timestamp (must be < 10 minutes old)
   - Extract userId and action
3. Exchange authorization code for tokens:
   POST https://oauth2.googleapis.com/token
   Body: {
     code: {AUTH_CODE},
     client_id: {GOOGLE_CLIENT_ID},
     client_secret: {GOOGLE_CLIENT_SECRET},
     redirect_uri: {REDIRECT_URI},
     grant_type: "authorization_code"
   }
   Response: {
     access_token: "ya29.a0AfB...",
     refresh_token: "1//0gQ...",
     expires_in: 3599,
     token_type: "Bearer",
     scope: "..."
   }
```

### Step 5: Get User Info from Google
**File:** `backend/src/services/googleOAuth.js`

```javascript
GET https://www.googleapis.com/oauth2/v2/userinfo
Headers: { Authorization: "Bearer {access_token}" }

Response: {
  id: "1234567890",
  email: "user@gmail.com",
  verified_email: true,
  name: "John Doe",
  picture: "https://lh3.googleusercontent.com/..."
}
```

### Step 6: Store Tokens in Database
**File:** `backend/src/services/tokenManager.js` (Line 7)

```javascript
1. Encrypt tokens using AES-256-GCM:
   - access_token → encrypt() → encrypted blob
   - refresh_token → encrypt() → encrypted blob
   
2. Calculate expiration time:
   expires_at = NOW() + expires_in seconds
   
3. Insert into database:
   INSERT INTO oauth_tokens (
     user_id,              // "abc-123"
     provider,             // "google"
     access_token,         // {encrypted}
     refresh_token,        // {encrypted}
     token_type,           // "Bearer"
     expires_at,           // "2025-11-02 06:32:45"
     scope                 // "gmail.readonly gmail.send..."
   ) ON CONFLICT (user_id, provider) DO UPDATE...
```

### Step 7: Update User Record
**File:** `backend/src/routes/google-auth.js` (Line 127)

```sql
UPDATE users 
SET 
  google_id = '1234567890',
  profile_picture = 'https://lh3.googleusercontent.com/...'
WHERE id = 'abc-123'
```

### Step 8: Redirect to Frontend
```
Backend redirects to: https://domain/settings?success=google_connected
Frontend shows success message
```

**RESULT:** User is now connected to Google. Database has encrypted OAuth tokens.

---

## 🔄 WORKFLOW 2: User Asks Gmail Query

### Step 1: User Sends Message
**Location:** Frontend Chat Interface

```
User types: "what do you see in my gmail"
User presses Enter
    ↓
Frontend calls: POST /api/messages
Body: {
  conversationId: "conv-123",
  content: "what do you see in my gmail",
  model: "auto",
  stream: true
}
Headers: { Authorization: "Bearer {JWT}" }
```

### Step 2: Backend Authenticates Request
**File:** `backend/src/routes/messages.js` (Line 50)

```javascript
1. authenticate middleware validates JWT
2. Extract user from token: req.user = {
     id: "abc-123",
     email: "user@example.com",
     google_id: "1234567890",  // ← Important!
     ...
   }
3. Verify conversation ownership:
   SELECT * FROM conversations 
   WHERE id = 'conv-123' AND user_id = 'abc-123'
```

### Step 3: Save User Message to Database
**File:** `backend/src/routes/messages.js` (Line 91)

```sql
INSERT INTO messages (
  conversation_id,     -- "conv-123"
  role,                -- "user"
  content,             -- "what do you see in my gmail"
  model                -- "gpt-4o-mini"
) VALUES (...) RETURNING *
```

### Step 4: Load Conversation History
**File:** `backend/src/routes/messages.js` (Line 99)

```sql
SELECT role, content 
FROM messages 
WHERE conversation_id = 'conv-123' 
ORDER BY created_at ASC 
LIMIT 20
```

Returns:
```javascript
[
  { role: "user", content: "hello" },
  { role: "assistant", content: "Hi! How can I help?" },
  { role: "user", content: "what do you see in my gmail" }
]
```

### Step 5: Load User's Memory Facts
**File:** `backend/src/routes/messages.js` (Line 113)

```sql
SELECT fact, category 
FROM memory_facts 
WHERE user_id = 'abc-123' AND approved = true 
ORDER BY last_referenced_at DESC 
LIMIT 10
```

### Step 6: Build System Prompt
**File:** `backend/src/services/uiContext.js`

```javascript
Generate UI-aware system prompt including:
- User details: name, email, role, google_id
- User preferences: response style, tone, length
- Available UI actions
- Memory facts
- Current conversation context

Result: "You are an AI assistant with access to the user's Gmail..."
```

### Step 7: ACTION DETECTION (CRITICAL STEP)
**File:** `backend/src/routes/messages.js` (Line 154-204)

```javascript
const userQuery = "what do you see in my gmail"; // lowercase
const hasGoogleAccess = !!"1234567890"; // true

// Step 7a: Check for action verbs
const actionVerbs = [
  'read my', 'show my', 'see my', 'view my', 'tell me my',
  'what are my', 'what is my', 'check my', ...
];
const isActionCommand = actionVerbs.some(verb => 
  "what do you see in my gmail".includes(verb)
);
// Result: false (no exact verb match)

// Step 7b: Check for Google keywords
const googleKeywords = [
  'email', 'gmail', 'inbox', 'mail', 'message', 'messages',
  'calendar', 'event', 'drive', 'file', 'doc', 'sheet', ...
];
const mentionsGoogle = googleKeywords.some(kw => 
  "what do you see in my gmail".includes(kw)
);
// Result: true (contains "gmail")

// Step 7c: Determine if functions should be passed
const shouldPassFunctions = 
  false ||                    // isActionCommand
  (true && true);            // mentionsGoogle && hasGoogleAccess
// Result: true ✅

// Step 7d: Get functions to pass
const functionsToPass = shouldPassFunctions ? UI_FUNCTIONS : null;
// Result: Array of 26 functions

// Step 7e: Log detection
console.log('📋 Action Detection:', {
  query: "what do you see in my gmail",
  isAction: false,
  mentionsGoogle: true,
  hasGoogleAccess: true,
  shouldPassFunctions: true,
  functionsCount: 26
});
```

### Step 8: Prepare Messages for OpenAI
**File:** `backend/src/routes/messages.js`

```javascript
const messages = [
  {
    role: "system",
    content: "{UI-aware system prompt with user context}"
  },
  {
    role: "user",
    content: "hello"
  },
  {
    role: "assistant",
    content: "Hi! How can I help?"
  },
  {
    role: "user",
    content: "what do you see in my gmail"
  }
];
```

### Step 9: Send Request to OpenAI
**File:** `backend/src/services/openai.js` (Line 28)

```javascript
POST https://api.openai.com/v1/chat/completions
Headers: {
  Authorization: "Bearer sk-proj-...",
  Content-Type: "application/json"
}
Body: {
  model: "gpt-4o-mini",
  messages: [ {4 messages array} ],
  functions: [ {26 function definitions} ],
  stream: true
}

// ❌ CURRENT ISSUE: This returns 400 Bad Request
```

**Current Error:**
```javascript
{
  status: 400,
  statusText: "Bad Request",
  message: "Request failed with status code 400"
}
```

---

## 🔄 WORKFLOW 3: OpenAI Function Calling (Expected Flow)

### Step 10: OpenAI Processes Request (When Working)
**Expected Behavior:**

```javascript
OpenAI receives request
OpenAI analyzes: "what do you see in my gmail"
OpenAI sees available function: readEmails
OpenAI decides to call: readEmails({ maxResults: 10 })

Returns (streaming):
{
  choices: [{
    delta: {
      function_call: {
        name: "readEmails",
        arguments: '{"maxResults":10}'
      }
    }
  }]
}
```

### Step 11: Backend Detects Function Call
**File:** `backend/src/routes/messages.js` (Line 209)

```javascript
// Streaming response handler
completion.on('data', (chunk) => {
  const delta = parsed.choices[0]?.delta;
  
  if (delta?.function_call) {
    if (delta.function_call.name) {
      functionName = delta.function_call.name; // "readEmails"
    }
    if (delta.function_call.arguments) {
      functionArgs += delta.function_call.arguments; // '{"maxResults":10}'
    }
  }
});

completion.on('end', () => {
  if (functionName) {
    functionCall = {
      name: "readEmails",
      arguments: '{"maxResults":10}'
    };
  }
});
```

### Step 12: Execute UI Function
**File:** `backend/src/routes/messages.js` (Line 234)

```javascript
const parsedArgs = JSON.parse('{"maxResults":10}');
// Result: { maxResults: 10 }

const functionResult = await executeUIFunction(
  "readEmails",           // function name
  { maxResults: 10 },     // parsed args
  {
    user: req.user,       // full user object
    userId: "abc-123",
    conversationId: "conv-123"
  }
);
```

### Step 13: Execute Gmail Function
**File:** `backend/src/services/uiFunctions.js` (Line 539)

```javascript
// Check if user is authenticated
if (!context.user) {
  return { success: false, message: 'Not logged in' };
}

// Import Gmail service
const { listEmails } = await import('./gmail.js');

// Call listEmails
const emails = await listEmails(
  "abc-123",              // userId
  {
    maxResults: 10,
    query: ''
  }
);

// Return result
return {
  success: true,
  message: `Found ${emails.length} email(s)`,
  data: { emails }
};
```

### Step 14: Get Gmail Client
**File:** `backend/src/services/gmail.js` (Line 5)

```javascript
async function getGmailClient(userId) {
  // Step 14a: Get valid token
  const accessToken = await tokenManager.getValidToken("abc-123", "google");
  
  // TokenManager checks if token needs refresh...
}
```

### Step 15: Token Manager Validates Token
**File:** `backend/src/services/tokenManager.js` (Line 30)

```javascript
async getValidToken(userId, provider) {
  // Step 15a: Load token from database
  const result = await query(
    'SELECT * FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
    ["abc-123", "google"]
  );
  
  const tokenData = result.rows[0];
  // {
  //   access_token: {encrypted},
  //   refresh_token: {encrypted},
  //   expires_at: "2025-11-02 06:32:45"
  // }
  
  // Step 15b: Check expiration
  const now = new Date(); // 05:30:00
  const expiresAt = new Date("2025-11-02 06:32:45");
  const refreshBuffer = new Date(expiresAt - 5 minutes); // 06:27:45
  
  // Step 15c: Needs refresh?
  if (now >= refreshBuffer) {
    // YES - Token expires in < 5 minutes
    
    // Decrypt refresh token
    const decryptedRefreshToken = decrypt(tokenData.refresh_token);
    
    // Call Google to refresh
    const newTokens = await googleOAuthService.refreshAccessToken(
      decryptedRefreshToken
    );
    
    // Store new tokens
    await this.storeTokens(userId, newTokens);
    
    console.log('✅ Token refreshed successfully');
    
    return newTokens.accessToken;
  } else {
    // NO - Token still valid
    return decrypt(tokenData.access_token);
  }
}
```

### Step 16: Refresh Token (If Needed)
**File:** `backend/src/services/googleOAuth.js`

```javascript
POST https://oauth2.googleapis.com/token
Body: {
  client_id: {GOOGLE_CLIENT_ID},
  client_secret: {GOOGLE_CLIENT_SECRET},
  refresh_token: "1//0gQ...",
  grant_type: "refresh_token"
}

Response: {
  access_token: "ya29.NEW_TOKEN...",
  expires_in: 3599,
  token_type: "Bearer"
}
```

### Step 17: Create Gmail API Client
**File:** `backend/src/services/gmail.js` (Line 16)

```javascript
const oauth2Client = new google.auth.OAuth2();
oauth2Client.setCredentials({
  access_token: "ya29.a0AfB..." // Fresh or existing token
});

return google.gmail({ 
  version: 'v1', 
  auth: oauth2Client 
});
```

### Step 18: Call Gmail API
**File:** `backend/src/services/gmail.js` (Line 55)

```javascript
const response = await gmail.users.messages.list({
  userId: 'me',
  maxResults: 10,
  q: '',
  labelIds: ['INBOX']
});

// Response from Google:
{
  data: {
    messages: [
      { id: "msg-1", threadId: "thread-1" },
      { id: "msg-2", threadId: "thread-2" },
      ...
    ]
  }
}
```

### Step 19: Fetch Email Details
**File:** `backend/src/services/gmail.js` (Line 66)

```javascript
// For each message ID, get full details
const emailDetails = await Promise.all(
  messages.map(async (msg) => {
    return await getEmailDetails("abc-123", msg.id);
  })
);

// For each email:
async function getEmailDetails(userId, messageId) {
  const gmail = await getGmailClient(userId);
  
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });
  
  const message = response.data;
  const headers = message.payload.headers;
  
  // Extract header info
  const subject = headers.find(h => h.name === 'Subject')?.value;
  const from = headers.find(h => h.name === 'From')?.value;
  const to = headers.find(h => h.name === 'To')?.value;
  const date = headers.find(h => h.name === 'Date')?.value;
  
  // Parse email body
  const body = parseEmailBody(message.payload);
  
  return {
    id: message.id,
    subject: "Meeting Tomorrow",
    from: "boss@company.com",
    to: "user@example.com",
    date: "Thu, 31 Oct 2025 10:30:00 -0700",
    snippet: "Quick reminder about...",
    body: "Full email body text...",
    isUnread: true
  };
}
```

### Step 20: Return Emails to Function Handler
**File:** `backend/src/services/gmail.js` (Line 77)

```javascript
return [
  {
    id: "msg-1",
    subject: "Meeting Tomorrow",
    from: "boss@company.com",
    snippet: "Quick reminder...",
    body: "Full text...",
    isUnread: true
  },
  {
    id: "msg-2",
    subject: "Invoice #1234",
    from: "billing@vendor.com",
    snippet: "Your invoice...",
    body: "Full text...",
    isUnread: false
  },
  // ... 8 more emails
];
```

### Step 21: Function Returns Success
**File:** `backend/src/services/uiFunctions.js` (Line 547)

```javascript
return {
  success: true,
  message: "Found 10 email(s)",
  data: { 
    emails: [ {10 email objects} ]
  }
};
```

### Step 22: Save Response to Database
**File:** `backend/src/routes/messages.js` (Line 254)

```sql
INSERT INTO messages (
  conversation_id,    -- "conv-123"
  role,               -- "assistant"
  content,            -- "✅ Found 10 email(s)"
  model,              -- "gpt-4o-mini"
  tokens_used,        -- estimated tokens
  metadata            -- JSON with email data
) VALUES (...)
```

### Step 23: Send Response to Frontend
**File:** `backend/src/routes/messages.js` (Line 270)

```javascript
res.write(`data: ${JSON.stringify({
  content: "✅ Found 10 email(s)",
  action: {
    type: "readEmails",
    params: { maxResults: 10 },
    result: {
      emails: [ {10 email objects} ]
    }
  },
  done: true
})}\n\n`);

res.end();
```

### Step 24: Frontend Displays Results
**Location:** Frontend Chat Interface

```javascript
// Frontend receives server-sent event
const response = {
  content: "✅ Found 10 email(s)",
  action: {
    type: "readEmails",
    result: { emails: [...] }
  }
};

// Display in chat:
- Show message: "✅ Found 10 email(s)"
- Render email list component
- Display each email with subject, from, snippet
- Add action buttons (mark as read, archive, delete)
```

---

## 📊 Complete Data Flow Summary

```
USER INPUT
"what do you see in my gmail"
    ↓
FRONTEND
POST /api/messages
    ↓
BACKEND - AUTHENTICATION
Validate JWT → Load user (google_id present ✅)
    ↓
BACKEND - MESSAGE STORAGE
Save to messages table
    ↓
BACKEND - CONTEXT LOADING
Load conversation history + memory facts
    ↓
BACKEND - ACTION DETECTION ⭐
userQuery.includes("gmail") → mentionsGoogle = true
hasGoogleAccess = true
shouldPassFunctions = true
functionsToPass = [26 UI_FUNCTIONS]
    ↓
BACKEND - OPENAI REQUEST
POST https://api.openai.com/v1/chat/completions
{
  model: "gpt-4o-mini",
  messages: [...],
  functions: [26 functions],  ← INCLUDES readEmails
  stream: true
}
    ↓
⚠️ CURRENT BLOCKER: OpenAI returns 400 Bad Request
    ↓
EXPECTED (when fixed):
OPENAI RESPONSE
{
  function_call: {
    name: "readEmails",
    arguments: '{"maxResults":10}'
  }
}
    ↓
BACKEND - FUNCTION EXECUTION
executeUIFunction("readEmails", {maxResults:10}, context)
    ↓
GMAIL SERVICE
listEmails(userId, {maxResults:10})
    ↓
TOKEN MANAGER
getValidToken(userId) → Check expiry → Refresh if needed → Return valid token
    ↓
DATABASE
SELECT * FROM oauth_tokens WHERE user_id=... → Decrypt tokens
    ↓
GOOGLE OAUTH (if refresh needed)
POST /token with refresh_token → Get new access_token
    ↓
GMAIL API CLIENT
google.gmail({ auth: oauth2Client })
    ↓
GOOGLE GMAIL API
GET https://gmail.googleapis.com/gmail/v1/users/me/messages
Authorization: Bearer {access_token}
    ↓
GMAIL API RESPONSE
{ messages: [{id, threadId}, ...] }
    ↓
GMAIL SERVICE - GET DETAILS
For each message → gmail.users.messages.get(messageId)
    ↓
GMAIL API RESPONSE (per email)
{
  payload: {
    headers: [{name: "Subject", value: "..."}, ...],
    body: {data: "base64..."}
  }
}
    ↓
PARSE EMAIL
Extract subject, from, to, date, body
Decode base64 body
    ↓
RETURN EMAILS
[{id, subject, from, to, date, body, isUnread}, ...]
    ↓
FUNCTION SUCCESS
{
  success: true,
  message: "Found 10 email(s)",
  data: {emails: [...]}
}
    ↓
SAVE TO DATABASE
INSERT INTO messages (role='assistant', content='✅ Found 10...')
    ↓
STREAM TO FRONTEND
SSE: data: {"content":"✅...","action":{...},"done":true}
    ↓
FRONTEND DISPLAY
Render message + email list component
    ↓
USER SEES RESULTS
Email list with subjects, senders, previews
```

---

## 🔑 Key Files and Their Roles

| File | Role in Workflow |
|------|------------------|
| `routes/google-auth.js` | OAuth flow (connect, callback, disconnect) |
| `routes/messages.js` | Action detection, OpenAI requests, function execution |
| `services/tokenManager.js` | Token storage, retrieval, refresh, encryption |
| `services/googleOAuth.js` | OAuth token exchange and refresh |
| `services/gmail.js` | Gmail API calls (list, get, send, modify) |
| `services/uiFunctions.js` | Function schema definitions and execution routing |
| `services/openai.js` | OpenAI API communication |
| Database table: `oauth_tokens` | Encrypted token storage |
| Database table: `users` | User google_id linkage |
| Database table: `messages` | Conversation history |

---

## ⚠️ Current Blocker Location

**Exact Failure Point:**
```
File: backend/src/services/openai.js
Line: ~30-50

axios.post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4o-mini',
  messages: [...],
  functions: [...26 functions...],  ← Issue here
  stream: true
})
→ Returns 400 Bad Request ❌
```

**What's Happening:**
- Everything before this point works perfectly ✅
- Action detection correctly identifies Gmail query ✅
- Correct functions are prepared ✅
- **OpenAI rejects the request with 400 error** ❌
- Everything after this point cannot execute ⏸️

**Next Debug Step:**
Log the exact payload being sent to OpenAI to see what's malformed.
