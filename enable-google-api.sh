#!/bin/bash

# ===========================================
# ENABLE GOOGLE GENERATIVE LANGUAGE API
# ===========================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}=============================================${NC}"
echo -e "${RED}🚨 CRITICAL: GOOGLE API NOT ENABLED${NC}"
echo -e "${RED}=============================================${NC}"
echo ""

echo -e "${YELLOW}The diagnostic found this error:${NC}"
echo ""
echo -e "${RED}[403 Forbidden] Generative Language API has not been used${NC}"
echo -e "${RED}in project 1062446755505 before or it is disabled.${NC}"
echo ""

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}📋 STEP-BY-STEP FIX${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "${YELLOW}Step 1: Open Google Cloud Console${NC}"
echo ""
echo "Go to this URL (opens the exact page you need):"
echo ""
echo -e "${GREEN}https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=1062446755505${NC}"
echo ""

echo -e "${YELLOW}Step 2: Enable the API${NC}"
echo ""
echo "1. Click the ${GREEN}ENABLE${NC} button"
echo "2. Wait for the API to be enabled (takes 5-30 seconds)"
echo "3. You should see a green checkmark when done"
echo ""

echo -e "${YELLOW}Step 3: Verify in Admin Dashboard${NC}"
echo ""
echo "1. The Google API key you added should now work"
echo "2. Make sure the key is from project: ${GREEN}1062446755505${NC}"
echo ""

echo -e "${YELLOW}Step 4: Wait for Propagation${NC}"
echo ""
echo "After enabling:"
echo "- Wait ${GREEN}2-3 minutes${NC} for changes to propagate"
echo "- Google systems need time to activate the API"
echo ""

echo -e "${YELLOW}Step 5: Restart Backend${NC}"
echo ""
echo "Run these commands:"
echo ""
echo -e "${GREEN}cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend${NC}"
echo -e "${GREEN}sudo -u ubuntu pm2 restart myaiagent-backend${NC}"
echo ""

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🧪 TEST GEMINI AFTER ENABLING${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo "Once you've enabled the API and waited 2-3 minutes:"
echo ""
echo -e "1. Open browser: ${YELLOW}https://werkules.com${NC}"
echo -e "2. Login: ${YELLOW}admin@myaiagent.com / admin123${NC}"
echo -e "3. Create new conversation"
echo -e "4. Send a message - ${GREEN}Gemini should respond!${NC}"
echo ""

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}❓ TROUBLESHOOTING${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "${YELLOW}Q: Which Google account should I use?${NC}"
echo "A: Use the Google account that owns project 1062446755505"
echo ""

echo -e "${YELLOW}Q: I don't have access to this project${NC}"
echo "A: You need to:"
echo "   1. Use the correct Google account, OR"
echo "   2. Get a new API key from YOUR Google Cloud project, OR"
echo "   3. Ask the project owner to enable the API"
echo ""

echo -e "${YELLOW}Q: Still getting 403 after enabling?${NC}"
echo "A: Wait 5 minutes, then:"
echo "   1. Clear browser cookies"
echo "   2. Restart backend: ${GREEN}pm2 restart myaiagent-backend${NC}"
echo "   3. Check backend logs: ${GREEN}pm2 logs myaiagent-backend${NC}"
echo ""

echo -e "${YELLOW}Q: How do I check if API is enabled?${NC}"
echo "A: Visit the console URL above. If enabled, you'll see:"
echo "   - Green checkmark"
echo "   - 'API enabled' status"
echo "   - Metrics/usage graphs"
echo ""

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}🔗 QUICK LINKS${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo "Enable Generative Language API:"
echo -e "${BLUE}https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=1062446755505${NC}"
echo ""

echo "Google Cloud Console (all projects):"
echo -e "${BLUE}https://console.cloud.google.com/${NC}"
echo ""

echo "API Key Management:"
echo -e "${BLUE}https://console.cloud.google.com/apis/credentials?project=1062446755505${NC}"
echo ""

echo -e "${GREEN}✅ After enabling the API, chat will work with Gemini!${NC}"
echo ""
