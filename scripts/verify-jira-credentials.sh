#!/bin/bash

# Verify Jira Credentials and Permissions

JIRA_URL="https://onealgorithm.atlassian.net"
JIRA_EMAIL="lrubino@onealgorithm.com"
JIRA_TOKEN="ATATT3xFfGF0YRE5fLVWV0Xzm96_vizoKpflLmjSgR3875YMWkuynQux8nmEXkbzNEI4jxpBYXfA8qSQDYjz8TUjAy-pwCkMTpmhwyCRTv7zCyGu5Rz7SPnDTX9zgM-o8IF0QbYCh7RAsGL_GwGmhrjzemLMXvKEr2oz3KFsxGN_SX8bYsJwbq0=4909568C"

echo "=========================================="
echo "Jira Credentials Verification"
echo "=========================================="
echo ""

echo "Testing with:"
echo "URL: $JIRA_URL"
echo "Email: $JIRA_EMAIL"
echo "Token: ${JIRA_TOKEN:0:20}..."
echo ""

echo "1. Testing /myself endpoint (basic auth check)..."
MYSELF=$(curl -s -u "${JIRA_EMAIL}:${JIRA_TOKEN}" \
  -H "Accept: application/json" \
  "${JIRA_URL}/rest/api/3/myself")

if echo "$MYSELF" | grep -q "accountId"; then
    echo "✅ Authentication successful!"
    echo "$MYSELF" | jq '.' 2>/dev/null || echo "$MYSELF"
else
    echo "❌ Authentication failed!"
    echo "Response: $MYSELF"
    echo ""
    echo "Possible issues:"
    echo "1. API token has expired"
    echo "2. Email address is incorrect"
    echo "3. API token is invalid"
    echo ""
    echo "To fix:"
    echo "1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens"
    echo "2. Create a new API token"
    echo "3. Update the token in the scripts"
    exit 1
fi

echo ""
echo "2. Testing /project endpoint (project access)..."
PROJECTS=$(curl -s -u "${JIRA_EMAIL}:${JIRA_TOKEN}" \
  -H "Accept: application/json" \
  "${JIRA_URL}/rest/api/3/project")

if [ "$PROJECTS" = "[]" ]; then
    echo "⚠️  No projects found!"
    echo ""
    echo "This could mean:"
    echo "1. Your account doesn't have access to any projects"
    echo "2. No projects exist in your Jira instance"
    echo ""
    echo "To fix:"
    echo "1. Go to: $JIRA_URL/jira/projects"
    echo "2. Make sure at least one project exists"
    echo "3. Ensure your account has permission to view projects"
    echo ""
    echo "Or create a test project:"
    echo "1. Go to: $JIRA_URL/secure/BrowseProjects.jspa"
    echo "2. Click 'Create project'"
    echo "3. Follow the wizard to create a simple project"
else
    echo "✅ Projects found!"
    echo "$PROJECTS" | jq '.' 2>/dev/null || echo "$PROJECTS"
fi

echo ""
echo "3. Checking permissions..."
PERMISSIONS=$(curl -s -u "${JIRA_EMAIL}:${JIRA_TOKEN}" \
  -H "Accept: application/json" \
  "${JIRA_URL}/rest/api/3/mypermissions")

echo "$PERMISSIONS" | jq '.' 2>/dev/null || echo "$PERMISSIONS"

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
