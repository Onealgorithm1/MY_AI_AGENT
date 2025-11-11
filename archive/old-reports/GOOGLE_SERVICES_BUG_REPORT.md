# Google Services Access Issue - Technical Root Cause Analysis

**Report Date**: November 2, 2025  
**Severity**: HIGH - Blocking all Google services functionality  
**Status**: Root cause identified  

---

## Executive Summary

The AI agent is incorrectly informing users that their Gmail/Google account is not connected, even when they have successfully completed OAuth authentication and have valid tokens stored in the database. This prevents users from accessing Gmail, Calendar, Drive, Docs, and Sheets functionality through the AI.

---

## Root Cause Analysis

### The Bug

**File**: `myaiagent-mvp/backend/src/middleware/uiContext.js`  
**Function**: `buildEnhancedContext()` (Lines 169-189)  
**Issue**: Missing `googleId` field in user context object

The `buildEnhancedContext()` function builds the user object that is passed to `generateUIAwarePrompt()`. This prompt informs the AI whether the user has Google services connected.

**Current Code (BROKEN)**:
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
      // ❌ MISSING: googleId field!
    },
    timestamp: new Date().toISOString(),
    features: req.fullUISchema?.features || {}
  };

  return context;
};
```

**Why This Breaks Google Services**:

In `generateUIAwarePrompt()` (Lines 52-60), the system checks for Google connection:

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

Since `userContext.googleId` is **always undefined** (never passed from `buildEnhancedContext`), the AI **always sees**:
```
- **Google Account**: ❌ Not Connected
- Gmail functions are NOT available
```

Even though:
1. ✅ User successfully completed OAuth
2. ✅ Access and refresh tokens are stored in `oauth_tokens` table
3. ✅ `users.google_id` field contains valid Google ID
4. ✅ All Google API routes work correctly
5. ✅ `/api/google/status` endpoint returns `isConnected: true`

---

## Verification Evidence

### From Backend Logs:
```
✅ User updated: {
  id: 'd409def7-9844-49a4-a257-dece7054114c',
  email: 'netwerkinc19@gmail.com',
  google_id: '102018369222117193487',  ← User HAS google_id
  profile_picture: 'https://lh3.googleusercontent.com/...'
}
```

```
🔑 Storing OAuth tokens for userId: d409def7-9844-49a4-a257-dece7054114c
✅ Tokens stored successfully
```

**Proof**: User has valid `google_id` and OAuth tokens in database.

### From User JWT Token:
The `req.user` object (from JWT auth middleware) contains:
- ✅ `id`, `email`, `full_name`, `role`, `phone`, etc. from users table
- ❌ But `google_id` is **NOT** included in JWT payload

### Why google_id Isn't in JWT:
**File**: `myaiagent-mvp/backend/src/routes/auth.js` (JWT generation)

The JWT is created with this payload:
```javascript
const token = jwt.sign(
  { 
    id: user.id, 
    email: user.email, 
    role: user.role 
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRATION }
);
```

The `google_id` field is **not** included in the JWT token at login time.

---

## Data Flow Analysis

### How the Bug Manifests:

1. **User logs in** → JWT created with `{id, email, role}` only
2. **Auth middleware** → Adds `req.user` from JWT (no `google_id`)
3. **UI Context middleware** → Calls `buildEnhancedContext(req)`
4. **buildEnhancedContext** → Maps `req.user.*` fields to context (skips `google_id`)
5. **generateUIAwarePrompt** → Checks `userContext.googleId` → **undefined**
6. **AI receives prompt** → "Google Account: ❌ Not Connected"
7. **AI response** → "Your Gmail account isn't connected. Please connect in Settings."

Even though the database shows:
```sql
SELECT google_id FROM users WHERE id = 'd409def7-9844-49a4-a257-dece7054114c';
-- Returns: '102018369222117193487' ✅
```

---

## The Fix (Two-Part Solution)

### Option A: Query google_id at middleware level (RECOMMENDED)

**File**: `myaiagent-mvp/backend/src/middleware/auth.js`

Modify the `authenticate` middleware to fetch `google_id` from database:

```javascript
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch full user data including google_id
    const result = await query(
      'SELECT id, email, full_name, role, phone, profile_image, created_at, last_login_at, settings, preferences, google_id FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (!result.rows[0]) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

**Then update** `myaiagent-mvp/backend/src/middleware/uiContext.js`:

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
      googleId: req.user?.google_id  // ✅ ADD THIS LINE
    },
    timestamp: new Date().toISOString(),
    features: req.fullUISchema?.features || {}
  };

  return context;
};
```

### Option B: Include google_id in JWT (Alternative)

**Pros**: Fewer database queries  
**Cons**: Requires users to re-login, JWT becomes stale if Google is connected/disconnected

Not recommended because:
- User must logout/login after connecting Google
- JWT doesn't update when user connects/disconnects Google mid-session

---

## Impact Assessment

### Affected Features:
- ❌ Gmail: readEmails, sendEmail, searchEmails, archiveEmail, deleteEmail
- ❌ Calendar: listEvents, createEvent, deleteEvent  
- ❌ Drive: listFiles, searchFiles, shareFile, deleteFile
- ❌ Docs: createDoc, readDoc, updateDoc
- ❌ Sheets: createSheet, readSheet, updateSheet, appendRow

### User Experience:
Users see messages like:
- "I don't have access to your Gmail. Please connect your Google account in Settings."
- "Your Google account isn't connected yet."

Even after successfully completing OAuth flow.

---

## Testing Verification Steps

After implementing the fix:

1. **Check user context in logs**:
   ```javascript
   console.log('User context:', context.user.googleId);
   // Should print: '102018369222117193487' (not undefined)
   ```

2. **Verify AI prompt generation**:
   ```javascript
   console.log('Generated prompt:', generateUIAwarePrompt(uiContext, userContext, fullSchema));
   // Should contain: "Google Account: ✅ Connected"
   ```

3. **Test Gmail function**:
   - User: "Read my latest emails"
   - AI should call `readEmails()` function instead of saying account isn't connected

4. **Database verification**:
   ```sql
   SELECT u.id, u.email, u.google_id, 
          (SELECT COUNT(*) FROM oauth_tokens WHERE user_id = u.id) as token_count
   FROM users u
   WHERE u.email = 'netwerkinc19@gmail.com';
   ```
   Should show google_id and token_count > 0.

---

## Recommended Implementation Plan

1. ✅ Update `authenticate` middleware to query `google_id` from database
2. ✅ Add `googleId` field to `buildEnhancedContext()` user object
3. ✅ Restart backend server
4. ✅ Test with user who has Google connected
5. ✅ Verify AI prompt contains "Google Account: ✅ Connected"
6. ✅ Test Gmail/Calendar/Drive commands work
7. ✅ Test with user who has NOT connected Google (should still show ❌)

---

## Code Review Checklist

- [ ] `auth.js` middleware fetches `google_id` from database
- [ ] `uiContext.js` buildEnhancedContext includes `googleId` field
- [ ] System prompt correctly shows "✅ Connected" when user has google_id
- [ ] System prompt correctly shows "❌ Not Connected" when user lacks google_id
- [ ] AI can call Gmail functions when user has Google connected
- [ ] AI cannot call Gmail functions when user doesn't have Google connected
- [ ] No breaking changes to existing authentication flow

---

## Additional Notes

### Current OAuth Implementation Status:
✅ State token HMAC signing (prevents forgery)  
✅ 10-minute expiration window (prevents replay attacks)  
✅ Encryption key validation on startup  
✅ Token refresh error handling  
✅ Google API rate limiting with exponential backoff  
✅ Comprehensive OAuth error messages  
✅ Privacy Policy & Terms of Service pages  

🔴 **BLOCKING BUG**: Missing `googleId` in user context

### Priority Level: **CRITICAL**
This bug completely blocks all Google services functionality. Users cannot access any Gmail, Calendar, Drive, Docs, or Sheets features through the AI, despite successfully completing OAuth authentication.

---

## Contact
For questions about this report, contact the development team.

**Report prepared by**: Replit Agent  
**Date**: November 2, 2025
