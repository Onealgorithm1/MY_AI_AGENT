# Backend CORS Configuration for Builder.io

To allow the frontend to work properly in Builder.io preview environment, you need to configure CORS on your backend to accept requests from Builder.io preview domains.

## Quick Fix

Add this to your backend CORS configuration:

### Express.js Example

```javascript
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://werkules.com',
      'https://www.werkules.com'
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Allow Builder.io preview domains (*.fly.dev, *.builder.io)
    if (origin.includes('.fly.dev') || origin.includes('.builder.io')) {
      return callback(null, true);
    }

    // Check against whitelist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,  // IMPORTANT: Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));
```

## Detailed Configuration

### 1. Install CORS Package (if not already installed)

```bash
npm install cors
```

### 2. Update Your Server Configuration

Find your server setup file (usually `server.js` or `app.js`) and add/update the CORS configuration:

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Define your allowed origins
    const allowedOrigins = [
      'https://werkules.com',
      'https://www.werkules.com',
      'http://localhost:5000',  // Local frontend development
      'http://localhost:3000'   // Alternative local port
    ];

    console.log('🔍 CORS Request from origin:', origin);

    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      console.log('✅ Allowing request with no origin');
      return callback(null, true);
    }

    // Allow Builder.io preview domains
    if (origin.includes('.fly.dev') || origin.includes('.builder.io')) {
      console.log('✅ Allowing Builder.io preview domain:', origin);
      return callback(null, true);
    }

    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Allowing whitelisted origin:', origin);
      return callback(null, true);
    }

    // Reject all other origins
    console.log('❌ Rejecting origin:', origin);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,  // CRITICAL: Allows cookies and auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['set-cookie'],
  maxAge: 86400  // 24 hours - cache preflight requests
};

// Apply CORS middleware BEFORE other middleware
app.use(cors(corsOptions));

// Your other middleware...
app.use(express.json());
// ...rest of your app
```

### 3. Handle Preflight Requests

CORS preflight requests use OPTIONS method. Make sure your server handles them:

```javascript
// This is usually handled automatically by the cors middleware,
// but if you have issues, add this:
app.options('*', cors(corsOptions));
```

### 4. Session/Cookie Configuration

If you're using express-session or cookie-parser, make sure they're configured correctly:

```javascript
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // 'none' for cross-origin
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}));
```

**Important Cookie Settings:**
- `secure: true` - Only send over HTTPS (production)
- `httpOnly: true` - Prevent XSS attacks
- `sameSite: 'none'` - Required for cross-origin requests in production
- `sameSite: 'lax'` - Works for same-origin (development)

### 5. Environment-Based Configuration

Use different CORS settings for development and production:

```javascript
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins for easier testing
    if (isDevelopment) {
      console.log('🔧 Development mode: Allowing all origins');
      return callback(null, true);
    }

    // In production, be strict
    if (isProduction) {
      const allowedOrigins = [
        'https://werkules.com',
        'https://www.werkules.com'
      ];

      if (!origin ||
          allowedOrigins.includes(origin) ||
          origin.includes('.fly.dev') ||
          origin.includes('.builder.io')) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    }

    callback(null, true);
  },
  credentials: true
};

app.use(cors(corsOptions));
```

## Testing CORS Configuration

### 1. Test from Builder.io Preview

Open your Builder.io preview and check the browser console:
- No CORS errors
- API requests succeed
- Cookies are sent with requests

### 2. Check Network Tab

In Chrome DevTools Network tab:
1. Look for preflight OPTIONS requests
2. Check response headers:
   ```
   Access-Control-Allow-Origin: <your-builder-domain>
   Access-Control-Allow-Credentials: true
   ```

### 3. Test with curl

```bash
# Test preflight request
curl -X OPTIONS https://werkules.com/api/auth/login \
  -H "Origin: https://test.fly.dev" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should return:
# Access-Control-Allow-Origin: https://test.fly.dev
# Access-Control-Allow-Credentials: true
```

## Common Issues

### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution:**
1. Verify CORS middleware is applied BEFORE routes
2. Check origin is allowed in corsOptions
3. Ensure server is running and accessible

### Issue: "CORS policy: Credentials flag is true, but the 'Access-Control-Allow-Credentials' header is ''"

**Solution:**
1. Set `credentials: true` in corsOptions
2. Don't use wildcard `*` for origin when credentials are true
3. Check cookie sameSite settings

### Issue: Cookies not being sent

**Solution:**
1. Set `credentials: true` in CORS
2. Frontend: Ensure axios has `withCredentials: true` (already configured)
3. Check cookie sameSite setting:
   - Production: `sameSite: 'none'` + `secure: true`
   - Development: `sameSite: 'lax'`

### Issue: Preflight requests failing

**Solution:**
1. Add `OPTIONS` to allowed methods
2. Ensure preflight cache with `maxAge`
3. Check allowedHeaders includes all headers your app uses

## Security Considerations

1. **Don't use wildcard (`*`) with credentials:**
   ```javascript
   // ❌ BAD - Security risk
   origin: '*',
   credentials: true

   // ✅ GOOD - Specific origins
   origin: function(origin, callback) { /* validation */ }
   ```

2. **Validate origins carefully:**
   - Use whitelist for production domains
   - Pattern match for preview domains (*.fly.dev)
   - Never trust origin without validation

3. **Secure cookies:**
   - Use `httpOnly: true`
   - Use `secure: true` in production
   - Set appropriate `sameSite` value

4. **Log CORS requests:**
   - Monitor which origins are accessing your API
   - Alert on suspicious patterns
   - Review logs regularly

## Summary

Minimal changes needed:

1. **Add Builder.io domains to CORS:**
   ```javascript
   if (origin.includes('.fly.dev') || origin.includes('.builder.io')) {
     return callback(null, true);
   }
   ```

2. **Enable credentials:**
   ```javascript
   credentials: true
   ```

3. **Configure cookies for cross-origin:**
   ```javascript
   cookie: {
     sameSite: 'none',
     secure: true
   }
   ```

After making these changes, restart your backend server and test in Builder.io preview.
