#!/bin/bash

# ===========================================
# ENABLE GOOGLE GENERATIVE LANGUAGE API
# STEP-BY-STEP INTERACTIVE GUIDE
# ===========================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${RED}=============================================${NC}"
echo -e "${RED}🚨 GOOGLE GENERATIVE LANGUAGE API DISABLED${NC}"
echo -e "${RED}=============================================${NC}"
echo ""

echo -e "${YELLOW}Your API key is from Google Cloud project:${NC}"
echo -e "${BOLD}1062446755505${NC}"
echo ""
echo -e "${YELLOW}The Generative Language API is DISABLED in this project.${NC}"
echo ""

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SOLUTION: Enable the API (Takes 2 minutes)${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "${YELLOW}Follow these exact steps:${NC}"
echo ""

echo -e "${BOLD}STEP 1: Open Google Cloud Console${NC}"
echo ""
echo "Copy this URL and paste it in your browser:"
echo ""
echo -e "${GREEN}https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=1062446755505${NC}"
echo ""

read -p "Press ENTER after you've opened the link in your browser..."

echo ""
echo -e "${BOLD}STEP 2: Log In${NC}"
echo ""
echo "Log in with the Google account that owns project 1062446755505"
echo ""

read -p "Press ENTER after you've logged in..."

echo ""
echo -e "${BOLD}STEP 3: Enable the API${NC}"
echo ""
echo "You should see a page titled 'Generative Language API'"
echo ""
echo "Look for a button that says:"
echo -e "  ${BLUE}[ENABLE]${NC} or ${BLUE}[ENABLE API]${NC}"
echo ""
echo "Click that button."
echo ""

read -p "Press ENTER after you've clicked ENABLE..."

echo ""
echo -e "${YELLOW}⏳ Waiting for API to activate (30 seconds)...${NC}"
sleep 30

echo ""
echo -e "${BOLD}STEP 4: Wait for Confirmation${NC}"
echo ""
echo "After clicking ENABLE, you should see:"
echo "  ✓ A green checkmark"
echo "  ✓ 'API enabled' message"
echo "  ✓ Metrics/usage dashboard"
echo ""

read -p "Do you see the API enabled confirmation? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${GREEN}✅ Great! The API is enabled.${NC}"
    echo ""
    echo -e "${YELLOW}⏳ Waiting 60 more seconds for Google to propagate changes...${NC}"
    sleep 60

    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}🧪 TESTING GEMINI API${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""

    # Run the test
    cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT
    sudo ./test-gemini-api.sh

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}=============================================${NC}"
        echo -e "${GREEN}🎉 SUCCESS! GEMINI IS WORKING!${NC}"
        echo -e "${GREEN}=============================================${NC}"
        echo ""
        echo "Your chat is now working at:"
        echo -e "${YELLOW}https://werkules.com${NC}"
        echo ""
        echo "Test it:"
        echo "1. Open https://werkules.com"
        echo "2. Create a new conversation"
        echo "3. Send a message"
        echo "4. Gemini will respond!"
        echo ""
    else
        echo ""
        echo -e "${YELLOW}⚠️  Test still failing. Waiting another 2 minutes...${NC}"
        sleep 120

        echo ""
        echo "Retrying test..."
        sudo ./test-gemini-api.sh

        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}🎉 SUCCESS! Gemini is now working!${NC}"
        else
            echo ""
            echo -e "${RED}Still failing. See troubleshooting below.${NC}"
        fi
    fi
else
    echo ""
    echo -e "${RED}API not enabled yet. Here's what to check:${NC}"
    echo ""
    echo "1. Make sure you're logged into the CORRECT Google account"
    echo "   (The one that owns project 1062446755505)"
    echo ""
    echo "2. Make sure you clicked the ENABLE button"
    echo ""
    echo "3. Check if there's an error message about:"
    echo "   - Billing not set up → Enable billing first"
    echo "   - Permission denied → You don't own this project"
    echo "   - Quota exceeded → Create a new project"
    echo ""
fi

echo ""
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}TROUBLESHOOTING${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "${YELLOW}Problem: 'You need billing enabled'${NC}"
echo "Solution:"
echo "1. Go to https://console.cloud.google.com/billing"
echo "2. Link a billing account (credit card required)"
echo "3. Google provides \$300 free credits for new accounts"
echo "4. Go back and enable the Generative Language API"
echo ""

echo -e "${YELLOW}Problem: 'Permission denied' or 'Access denied'${NC}"
echo "Solution: You don't own this project. You have 2 options:"
echo ""
echo "Option A: Ask the project owner to enable the API"
echo "Option B: Create YOUR OWN API key (recommended)"
echo "  1. Go to https://console.cloud.google.com/"
echo "  2. Create a new project"
echo "  3. Enable Generative Language API"
echo "  4. Create an API key"
echo "  5. Add it at https://werkules.com/admin/secrets"
echo ""

echo -e "${YELLOW}Problem: Still getting 403 after enabling${NC}"
echo "Solution:"
echo "1. Wait 5-10 minutes for Google to fully propagate"
echo "2. Clear your browser cache"
echo "3. Restart backend: sudo -u ubuntu pm2 restart myaiagent-backend"
echo "4. Run test again: sudo ./test-gemini-api.sh"
echo ""

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}ALTERNATIVE: Create NEW API Key${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo "If you can't enable the API in project 1062446755505,"
echo "create a completely new API key:"
echo ""
echo "1. Visit: https://aistudio.google.com/apikey"
echo "2. Click 'Create API Key'"
echo "3. Select 'Create API key in new project'"
echo "4. Copy the API key"
echo "5. Go to https://werkules.com/admin/secrets"
echo "6. Delete old 'Google APIs' key"
echo "7. Add new API key"
echo "8. Run: sudo ./test-gemini-api.sh"
echo ""

echo -e "${GREEN}Need help? The error message above shows exactly what's wrong.${NC}"
echo ""
