#!/bin/bash

# ===========================================
# FIX ADMIN PASSWORD AND JWT COOKIES
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 Fixing Admin Password & JWT Cookies${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Step 1: Reset admin password with proper bcrypt hash
echo -e "${BLUE}Step 1: Resetting admin password...${NC}"

cat > reset-password.js << 'EOFJS'
import bcryptjs from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://myaiagent_user:MySecurePassword123!@localhost:5432/myaiagent'
});

async function resetPassword() {
  try {
    const password = 'admin123';
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    console.log('Generated password hash:', passwordHash.substring(0, 30) + '...');

    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
      [passwordHash, 'admin@myaiagent.com']
    );

    if (result.rows.length > 0) {
      console.log('✅ Password updated for:', result.rows[0].email);

      // Verify
      const testResult = await pool.query(
        'SELECT password_hash FROM users WHERE email = $1',
        ['admin@myaiagent.com']
      );

      const match = await bcryptjs.compare(password, testResult.rows[0].password_hash);
      console.log('Password verification:', match ? '✅ PASS' : '❌ FAIL');
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetPassword();
EOFJS

node reset-password.js
rm reset-password.js

echo -e "${GREEN}✅ Admin password reset complete${NC}"

# Step 2: Check server.js JWT cookie configuration
echo -e "\n${BLUE}Step 2: Checking JWT cookie settings...${NC}"

if grep -q "httpOnly: true" src/routes/auth.js; then
    echo -e "${GREEN}✅ httpOnly cookie setting found${NC}"
else
    echo -e "${YELLOW}⚠️  httpOnly setting not found in auth routes${NC}"
fi

# Step 3: Restart backend
echo -e "\n${BLUE}Step 3: Restarting backend...${NC}"
pm2 restart myaiagent-backend
sleep 3
echo -e "${GREEN}✅ Backend restarted${NC}"

# Step 4: Test full login flow with cookie persistence
echo -e "\n${BLUE}Step 4: Testing complete login flow...${NC}"

# Clean cookies
rm -f /tmp/test-cookies.txt

# Get CSRF token
echo "  - Getting CSRF token..."
CSRF_TOKEN=$(curl -s -c /tmp/test-cookies.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)
echo "    Token: ${CSRF_TOKEN:0:40}..."

# Login
echo "  - Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/test-cookies.txt \
  -c /tmp/test-cookies.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "$LOGIN_RESPONSE" | jq '{user: .user.email, role: .user.role}'
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

# Check cookies
echo "  - Checking cookies..."
if grep -q "jwt" /tmp/test-cookies.txt; then
    echo -e "${GREEN}✅ JWT cookie set${NC}"
    grep "jwt" /tmp/test-cookies.txt | head -1
else
    echo -e "${RED}❌ JWT cookie NOT set${NC}"
    cat /tmp/test-cookies.txt
    exit 1
fi

# Test protected endpoint
echo "  - Testing protected endpoint..."
ME_RESPONSE=$(curl -s https://werkules.com/api/auth/me -b /tmp/test-cookies.txt)

if echo "$ME_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Protected endpoint working - user stays logged in${NC}"
    echo "$ME_RESPONSE" | jq '{email: .user.email, role: .user.role}'
else
    echo -e "${RED}❌ Protected endpoint failed - user got logged out${NC}"
    echo "$ME_RESPONSE" | jq '.'
fi

# Check backend logs
echo -e "\n${BLUE}Step 5: Recent backend logs...${NC}"
pm2 logs myaiagent-backend --lines 15 --nostream | tail -15

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 Fix Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${BLUE}Test in browser:${NC}"
echo -e "1. Clear all cookies: DevTools → Application → Cookies → Clear All"
echo -e "2. Go to: ${YELLOW}https://werkules.com/login${NC}"
echo -e "3. Login: ${YELLOW}admin@myaiagent.com / admin123${NC}"
echo -e "4. Should redirect to dashboard and ${GREEN}STAY LOGGED IN${NC}"
echo ""
echo -e "${BLUE}If still getting logged out:${NC}"
echo -e "- Check browser console for errors"
echo -e "- Check if JWT cookie is set: DevTools → Application → Cookies"
echo -e "- Look for cookie attributes: Secure, HttpOnly, SameSite=None"
echo ""
