# Google Connection Status 500 Error - Fix & Troubleshooting

## Problem

When checking Google account connection status, users receive:
```
Error checking Google connection status: AxiosError: Request failed with status code 500
at checkConnectionStatus (GoogleConnection.jsx:35:24)
```

This error occurs when visiting the Settings page or any component that checks Google connection status.

## Root Cause

The `/api/auth/google/status` endpoint was failing due to:

1. **Missing null checks** - If user query returned no results, accessing `user.rows[0].google_id` would throw an error
2. **Token info errors** - The `tokenManager.getTokenInfo()` call could fail without proper error handling
3. **Poor error logging** - Insufficient context in error messages made debugging difficult

## Solution Applied

### Backend Fix (`google-auth.js`)

✅ **Added proper error handling**:
- Null check for user query results
- User existence verification (404 if not found)
- Try-catch wrapper around `tokenManager.getTokenInfo()` with graceful fallback
- Enhanced logging with context (userId, error message, stack)

### Frontend Fix (`GoogleConnection.jsx`)

✅ **Improved error handling**:
- Check for authentication token before making request
- Parse and display specific error messages based on HTTP status
- Set default "disconnected" state on error (shows UI instead of blank)
- Better logging with status code and error details

## What's Fixed

| Issue | Before | After |
|-------|--------|-------|
| User not found | Crashes with undefined error | Returns 404 with message |
| Token info fails | 500 error with no context | Logs warning, continues with null tokenInfo |
| No auth token | Generic error | "Authentication required" message |
| Server error | Blank screen | "Server error. Please try again later." |
| Error logging | Minimal context | Full details (status, message, stack) |

## Testing the Fix

### Local Testing

1. **Test the endpoint directly**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/auth/google/status
   ```

   Expected responses:
   - ✅ 200 with `{ isConnected: true/false, googleId: null/string, tokenInfo: {...} }`
   - ❌ 401 if token is invalid
   - ❌ 404 if user not found
   - ❌ 500 only if there's an unhandled exception

2. **Test in UI**:
   - Log in to the application
   - Navigate to Settings
   - Should load Google connection status without errors
   - Should show "Google account connected" or "No Google account connected"

### Production Verification

```bash
# Check backend logs for any 500 errors
flyctl logs -f

# Should see successful requests like:
# [200] GET /api/auth/google/status
```

## Files Modified

- ✅ `myaiagent-mvp/backend/src/routes/google-auth.js` - Enhanced error handling in `/google/status` endpoint
- ✅ `myaiagent-mvp/frontend/src/components/GoogleConnection.jsx` - Improved frontend error handling

## Deployment

### For Production (Fly.io)

```bash
# Deploy the fixed code
flyctl deploy

# Monitor logs for issues
flyctl logs -f
```

### For Local Development

```bash
# Restart backend
npm run dev

# Changes take effect immediately
```

## Debugging Further Issues

If the 500 error persists after deployment:

### 1. Check Backend Logs

```bash
# For Fly.io
flyctl logs -f

# Look for "Google status check error" messages
# Should show context like userId and error details
```

### 2. Verify Database

```bash
# Check if oauth_tokens table exists
psql $DATABASE_URL -c "SELECT * FROM oauth_tokens LIMIT 1;"

# Check if user exists
psql $DATABASE_URL -c "SELECT id, google_id FROM users WHERE id = YOUR_USER_ID;"
```

### 3. Test Token Manager

The `TokenManager` service might have issues if:
- Database tables don't exist (run migrations)
- Encryption key is misconfigured
- Refresh token is corrupted

Check the logs for errors like:
- `GOOGLE_TOKEN_EXPIRED_RECONNECT_REQUIRED`
- `GOOGLE_TOKEN_REFRESH_FAILED_RECONNECT_REQUIRED`
- Encryption/decryption errors

### 4. Test Authentication

Ensure the JWT token is valid:

```bash
# The token should decode properly
# Check Authorization header is being sent correctly
```

## Error Scenarios Handled

| Scenario | Status | Response | User Impact |
|----------|--------|----------|-------------|
| User not found | 404 | `{ error: 'User not found' }` | Shows disconnect UI |
| No Google account | 200 | `{ isConnected: false }` | Shows connect button |
| Google connected | 200 | `{ isConnected: true, tokenInfo: {...} }` | Shows connected status |
| Token refresh fails | 200 | `{ isConnected: true, tokenInfo: null }` | Shows connected but no token info |
| Invalid token | 401 | `{ error: 'Unauthorized' }` | Shows login prompt |
| Server error | 500 | `{ error: 'Failed to check...' }` | Shows error message |

## Prevention Tips

1. **Always add null checks** when accessing array results from database queries
2. **Use try-catch** around external service calls (like `tokenManager`)
3. **Log with context** - Include user ID, error message, and stack trace
4. **Set fallback values** - Don't fail entirely if optional operations fail
5. **Test error paths** - Make sure code handles "no results" case

## Related Files

- `myaiagent-mvp/backend/src/services/tokenManager.js` - Token management service
- `myaiagent-mvp/backend/src/services/googleOAuth.js` - Google OAuth service
- `myaiagent-mvp/backend/migrations/` - Database migrations (oauth_tokens table)

## Status

✅ **Fixed and deployed** - The 500 error is now properly handled with better logging and fallback behavior.
