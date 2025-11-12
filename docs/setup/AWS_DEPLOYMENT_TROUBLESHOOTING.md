# AWS API Gateway Deployment Troubleshooting

## Issue: Admin Dashboard Not Visible

If you can't see the admin dashboard after deploying to AWS API Gateway, follow these steps:

### Step 1: Make Your User an Admin

The admin dashboard only shows for users with 'admin' or 'superadmin' role.

**Run this script to make your user an admin:**

```bash
cd myaiagent-mvp/backend
node src/scripts/make-admin.js your-email@example.com
```

**Or manually via SQL:**

```sql
-- Connect to your database and run:
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

**Verify admin role:**

```sql
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
```

### Step 2: Configure Frontend to Use AWS API Gateway

Your AWS API Gateway URL is:
```
https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1
```

**Update frontend environment:**

1. Edit `myaiagent-mvp/frontend/.env` (or `.env.production`):

```bash
VITE_API_URL=https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api
```

Note: Add `/api` at the end because your backend routes are under `/api/*`

2. **Rebuild the frontend:**

```bash
cd myaiagent-mvp/frontend
npm run build
```

### Step 3: Configure CORS on AWS API Gateway

AWS API Gateway needs CORS configured to allow your frontend to make requests.

**Option A: Via AWS Console**

1. Go to API Gateway Console
2. Select your API
3. For each resource, click **Enable CORS**
4. Configure:
   - **Access-Control-Allow-Origin**: Your frontend domain (or `*` for testing)
   - **Access-Control-Allow-Headers**: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-CSRF-Token`
   - **Access-Control-Allow-Methods**: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
   - **Access-Control-Allow-Credentials**: `true`
5. **Deploy API** to the `v1` stage

**Option B: Add CORS to Your Backend Code**

Verify CORS is configured in `backend/src/server.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://werkules.com',
    'https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
```

### Step 4: Check Admin Button Visibility

After setting your role to 'admin', the Shield icon should appear in the navigation:

**Location**: Top navigation bar (next to Settings icon)

**Look for**:
- Shield icon (🛡️)
- Title: "Admin Panel"
- Only visible if `user.role === 'admin' || user.role === 'superadmin'`

**If still not visible:**

1. **Clear browser cache and reload**
2. **Check browser console** for errors:
   - Press F12
   - Look for authentication errors
   - Look for CORS errors
3. **Verify JWT token** contains admin role:
   - Open browser DevTools → Application → Cookies
   - Find the `token` cookie
   - Decode at jwt.io to check `role` field

### Step 5: Test API Connection

Test that your frontend can reach the AWS API:

**1. Test Health Endpoint:**

```bash
curl https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 123.45,
  "environment": "production"
}
```

**2. Test Authentication:**

```bash
curl -X POST https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

**3. Test Admin Endpoint:**

```bash
curl https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api/admin/stats \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

### Step 6: Verify Database Connection

Make sure your AWS Lambda/EC2 can connect to your database:

**Check DATABASE_URL environment variable:**

```bash
# In AWS Lambda environment variables or .env
DATABASE_URL=postgresql://user:password@host:5432/database
```

**Test connection:**

```bash
cd myaiagent-mvp/backend
node -e "import('./src/utils/database.js').then(m => m.query('SELECT 1').then(r => console.log('✅ DB connected')))"
```

### Common Issues & Solutions

#### Issue: "Network Error" or "Failed to fetch"

**Cause**: CORS not configured or wrong API URL

**Solution**:
1. Verify `VITE_API_URL` in frontend `.env`
2. Enable CORS on AWS API Gateway
3. Deploy API after CORS changes

#### Issue: "401 Unauthorized" or "403 Forbidden"

**Cause**: Authentication failing

**Solution**:
1. Check JWT_SECRET is same in AWS and local
2. Verify CSRF_SECRET is configured
3. Check cookies are being sent with `credentials: true`

#### Issue: "429 Too Many Requests"

**Cause**: Rate limiting triggered

**Solution**:
1. We already increased limits to 2000/15min
2. Check if AWS API Gateway has its own rate limits
3. Increase AWS API Gateway throttle limits:
   - Burst: 5000 (you have this)
   - Rate: 10000 (you have this)

#### Issue: Admin Button Still Not Visible

**Debug checklist**:

1. **Check user role in database:**
   ```sql
   SELECT email, role FROM users WHERE email = 'your-email@example.com';
   ```
   Should show `role = 'admin'`

2. **Check frontend receives role:**
   - Login to application
   - Open browser DevTools → Console
   - Run: `localStorage.getItem('user')`
   - Should show user object with `"role":"admin"`

3. **Force logout and login:**
   - Click logout
   - Clear browser cache (Ctrl+Shift+Delete)
   - Login again
   - Admin button should appear

4. **Check React state:**
   - Open React DevTools
   - Find `AuthProvider` or user context
   - Verify `user.role === 'admin'`

### AWS API Gateway Configuration Checklist

Based on your current setup:

- ✅ **Stage**: v1
- ✅ **Invoke URL**: https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1
- ✅ **Rate**: 10000 req/s
- ✅ **Burst**: 5000
- ⚠️ **CloudWatch logs**: Inactive (enable for debugging)
- ⚠️ **CORS**: Needs to be enabled
- ⚠️ **Custom domain**: Not configured (optional)

**Recommended actions:**

1. **Enable CloudWatch logs** for debugging:
   - Edit stage → Logs → Enable CloudWatch logs
   - Set log level to INFO or ERROR

2. **Enable CORS** for all resources

3. **Deploy API** after any changes

## Quick Fix Checklist

Run through this in order:

1. ✅ **Make user admin:**
   ```bash
   node src/scripts/make-admin.js your-email@example.com
   ```

2. ✅ **Update frontend API URL:**
   ```bash
   # In frontend/.env
   VITE_API_URL=https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/api
   ```

3. ✅ **Enable CORS on AWS API Gateway**

4. ✅ **Rebuild and redeploy frontend:**
   ```bash
   npm run build
   ```

5. ✅ **Clear browser cache and login again**

6. ✅ **Look for Shield icon** in top navigation

## Still Having Issues?

If admin dashboard still not visible:

1. **Check browser console** (F12) for errors
2. **Check AWS CloudWatch logs** for backend errors
3. **Verify database connection** from AWS environment
4. **Test each API endpoint** individually
5. **Check all environment variables** are set in AWS

## Contact Support

If you're still stuck:

1. **Run diagnostics:**
   ```bash
   # Check user role
   SELECT email, role FROM users;

   # Check API health
   curl https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1/health
   ```

2. **Collect logs:**
   - Browser console errors
   - AWS CloudWatch logs
   - Database query results

3. **Share configuration:**
   - Frontend VITE_API_URL value
   - User role from database
   - CORS configuration

---

**Your AWS API Gateway Details:**
- **Stage**: v1
- **Invoke URL**: https://bq9hqtmqif.execute-api.us-east-2.amazonaws.com/v1
- **Rate Limit**: 10000 req/s
- **Burst**: 5000

**Next Steps:**
1. Run `make-admin.js` script
2. Update `VITE_API_URL`
3. Enable CORS on AWS
4. Rebuild frontend
5. Login and look for Shield icon
