#!/bin/bash

# Test Jira connectivity from EC2

echo "=========================================="
echo "Testing Jira Connectivity"
echo "=========================================="
echo ""

JIRA_URL="https://onealgorithm.atlassian.net"
JIRA_EMAIL="lrubino@onealgorithm.com"
JIRA_TOKEN="ATATT3xFfGF0YRE5fLVWV0Xzm96_vizoKpflLmjSgR3875YMWkuynQux8nmEXkbzNEI4jxpBYXfA8qSQDYjz8TUjAy-pwCkMTpmhwyCRTv7zCyGu5Rz7SPnDTX9zgM-o8IF0QbYCh7RAsGL_GwGmhrjzemLMXvKEr2oz3KFsxGN_SX8bYsJwbq0=4909568C"

echo "1. Testing DNS resolution..."
nslookup onealgorithm.atlassian.net || dig onealgorithm.atlassian.net || echo "DNS lookup failed"

echo ""
echo "2. Testing ping..."
ping -c 3 onealgorithm.atlassian.net || echo "Ping failed (may be blocked)"

echo ""
echo "3. Testing HTTPS connectivity..."
curl -v https://onealgorithm.atlassian.net 2>&1 | head -20

echo ""
echo "4. Testing Jira API with authentication..."
curl -s -u "${JIRA_EMAIL}:${JIRA_TOKEN}" \
  -H "Accept: application/json" \
  "${JIRA_URL}/rest/api/3/myself" | head -50

echo ""
echo "5. Testing Jira projects endpoint..."
curl -s -u "${JIRA_EMAIL}:${JIRA_TOKEN}" \
  -H "Accept: application/json" \
  "${JIRA_URL}/rest/api/3/project" | head -100

echo ""
echo "=========================================="
echo "Connectivity Test Complete"
echo "=========================================="
