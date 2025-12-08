#!/bin/bash

# Debug authentication issue

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔍 Debugging Authentication Issue${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Check backend logs for errors
echo -e "${BLUE}1. Checking recent backend logs for errors...${NC}"
pm2 logs myaiagent-backend --lines 30 --nostream --err

echo -e "\n${BLUE}2. Checking all recent backend logs...${NC}"
pm2 logs myaiagent-backend --lines 50 --nostream

echo -e "\n${BLUE}3. Checking if backend is fully started...${NC}"
sleep 2
curl -s http://localhost:5000/health | jq '.'

echo -e "\n${BLUE}4. Testing with verbose curl...${NC}"
rm -f /tmp/debug-cookies.txt

# Get CSRF
echo "Getting CSRF token..."
curl -v -c /tmp/debug-cookies.txt https://werkules.com/api/csrf-token 2>&1 | grep -E "(Set-Cookie|csrf)"

CSRF_TOKEN=$(curl -s -c /tmp/debug-cookies.txt https://werkules.com/api/csrf-token | jq -r .csrfToken)
echo "CSRF Token: $CSRF_TOKEN"

# Login with verbose output
echo -e "\n${BLUE}Logging in with verbose output...${NC}"
LOGIN_RESPONSE=$(curl -v -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Origin: https://werkules.com" \
  -b /tmp/debug-cookies.txt \
  -c /tmp/debug-cookies.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}' 2>&1)

echo "$LOGIN_RESPONSE" | grep -E "(Set-Cookie|HTTP/)"
echo ""
echo "Login response body:"
echo "$LOGIN_RESPONSE" | tail -1 | jq '.'

# Check cookies
echo -e "\n${BLUE}5. Checking cookies file...${NC}"
cat /tmp/debug-cookies.txt

# Test protected endpoint with verbose
echo -e "\n${BLUE}6. Testing /api/auth/me with verbose...${NC}"
curl -v https://werkules.com/api/auth/me -b /tmp/debug-cookies.txt 2>&1 | grep -E "(Cookie:|HTTP/|error)"

# Check database for google_id column
echo -e "\n${BLUE}7. Verifying database schema...${NC}"
sudo -u postgres psql -d myaiagent -c "\d users" | grep -E "(google_id|Column)"

echo -e "\n${BLUE}8. Testing JWT verification directly...${NC}"
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Create a test script to verify JWT
cat > test-jwt.js << 'EOFJS'
import jwt from 'jsonwebtoken';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET not set in environment');
  process.exit(1);
}

console.log('✅ JWT_SECRET is set');
console.log('Secret length:', JWT_SECRET.length);
console.log('Secret starts with:', JWT_SECRET.substring(0, 20) + '...');

// Try to decode a token from cookies
const cookiesContent = fs.readFileSync('/tmp/debug-cookies.txt', 'utf-8');
const jwtLine = cookiesContent.split('\n').find(line => line.includes('jwt'));

if (jwtLine) {
  const token = jwtLine.split('\t').pop();
  console.log('\nToken found:', token.substring(0, 50) + '...');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verified successfully');
    console.log('Decoded payload:', decoded);
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
  }
} else {
  console.log('⚠️  No JWT token found in cookies');
}
EOFJS

node test-jwt.js
rm test-jwt.js

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}Debug Complete${NC}"
echo -e "${GREEN}=============================================${NC}"
