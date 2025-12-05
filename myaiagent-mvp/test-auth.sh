#!/bin/bash

# Test authentication flow
echo "====================================="
echo "Testing Authentication Flow"
echo "====================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Check if admin user exists
echo -e "\n${BLUE}1. Checking if admin user exists...${NC}"
sudo -u postgres psql -d myaiagent -c "SELECT id, email, full_name, created_at FROM users WHERE email = 'admin@myaiagent.com';"

# 2. Get CSRF token
echo -e "\n${BLUE}2. Getting CSRF token...${NC}"
CSRF_RESPONSE=$(curl -s https://werkules.com/api/csrf-token -c /tmp/cookies.txt)
CSRF_TOKEN=$(echo $CSRF_RESPONSE | jq -r .csrfToken)
echo "CSRF Token: ${CSRF_TOKEN:0:50}..."

# 3. Try to login with admin credentials
echo -e "\n${BLUE}3. Testing login with admin credentials...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b /tmp/cookies.txt \
  -c /tmp/cookies.txt \
  -d '{"email":"admin@myaiagent.com","password":"admin123"}')

echo "Login Response:"
echo $LOGIN_RESPONSE | jq '.'

# 4. Test signup flow
echo -e "\n${BLUE}4. Testing signup with new user...${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST https://werkules.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b /tmp/cookies.txt \
  -c /tmp/cookies.txt \
  -d '{"email":"test@test.com","password":"test123","fullName":"Test User"}')

echo "Signup Response:"
echo $SIGNUP_RESPONSE | jq '.'

# 5. Check if we got a JWT token
echo -e "\n${BLUE}5. Checking JWT cookie...${NC}"
cat /tmp/cookies.txt | grep jwt

# 6. Test accessing protected endpoint
echo -e "\n${BLUE}6. Testing protected endpoint (auth/me)...${NC}"
ME_RESPONSE=$(curl -s https://werkules.com/api/auth/me \
  -b /tmp/cookies.txt)

echo "Auth Me Response:"
echo $ME_RESPONSE | jq '.'

echo -e "\n${GREEN}====================================="
echo "Test Complete"
echo "=====================================${NC}"
