#!/bin/bash

# ===========================================
# IMPROVE ERROR MESSAGES IN BACKEND
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 IMPROVING ERROR MESSAGES${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Backup the original file
cp src/routes/messages.js src/routes/messages.js.backup

echo "Updating error handling in messages.js..."

# Use sed to replace the generic error message with detailed error
sed -i "s/res.write(\`data: \${JSON.stringify({ error: 'AI service error. Please try again.' })}\\\n\\\n\`);/res.write(\`data: \${JSON.stringify({ error: error.message || 'AI service error. Please try again.', details: process.env.NODE_ENV === 'development' ? error.stack : undefined })}\\\n\\\n\`);/" src/routes/messages.js

# Also update the non-streaming error
sed -i "s/res.status(500).json({ error: 'Failed to send message' });/res.status(500).json({ error: error.message || 'Failed to send message', details: process.env.NODE_ENV === 'development' ? error.stack : undefined });/" src/routes/messages.js

echo -e "${GREEN}✅ Error messages improved${NC}"
echo ""
echo "Changes made:"
echo "  1. Streaming errors now show actual error message"
echo "  2. Non-streaming errors now show actual error message"
echo "  3. Development mode shows full stack trace"
echo ""

echo "Restarting backend..."
sudo -u ubuntu pm2 restart myaiagent-backend

sleep 3

echo ""
echo -e "${GREEN}✅ Backend restarted with better error messages${NC}"
echo ""
echo -e "${YELLOW}Now when chat fails, you'll see the REAL error message!${NC}"
echo ""
echo "Test by sending a message at https://werkules.com"
echo "Check browser console (F12) for detailed error"
echo ""
