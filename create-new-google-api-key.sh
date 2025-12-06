#!/bin/bash

# ===========================================
# CREATE NEW GOOGLE API KEY (EASIEST METHOD)
# ===========================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✨ CREATE NEW GOOGLE API KEY (EASY WAY)${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

echo -e "${YELLOW}This is the EASIEST way to get Gemini working!${NC}"
echo ""
echo "Google AI Studio automatically:"
echo "  ✓ Creates a new project"
echo "  ✓ Enables the Generative Language API"
echo "  ✓ Generates an API key"
echo "  ✓ Ready to use immediately!"
echo ""

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}STEP-BY-STEP GUIDE${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "${BOLD}STEP 1: Open Google AI Studio${NC}"
echo ""
echo "Copy this URL and open it in your browser:"
echo ""
echo -e "${GREEN}https://aistudio.google.com/apikey${NC}"
echo ""

read -p "Press ENTER after you've opened the link..."

echo ""
echo -e "${BOLD}STEP 2: Log In${NC}"
echo ""
echo "Log in with your Google account"
echo "(Any Google account works - personal or work)"
echo ""

read -p "Press ENTER after you've logged in..."

echo ""
echo -e "${BOLD}STEP 3: Create API Key${NC}"
echo ""
echo "On the API Keys page, you'll see:"
echo ""
echo "  ${BLUE}[Create API Key]${NC} button"
echo ""
echo "Click it, then select:"
echo "  ${GREEN}'Create API key in new project'${NC}"
echo ""
echo "This automatically creates a new project with the API enabled!"
echo ""

read -p "Press ENTER after you've created the API key..."

echo ""
echo -e "${BOLD}STEP 4: Copy the API Key${NC}"
echo ""
echo "You'll see a pop-up showing your new API key."
echo "It will look like:"
echo ""
echo -e "  ${YELLOW}AIza...${NC} (39 characters long)"
echo ""
echo "Copy the ENTIRE key."
echo ""

read -p "Press ENTER after you've copied the API key..."

echo ""
echo -e "${BOLD}STEP 5: Add Key to Your Application${NC}"
echo ""
echo "Now we'll add this key to your database:"
echo ""
echo "1. Open your browser to:"
echo -e "   ${GREEN}https://werkules.com/admin/secrets${NC}"
echo ""
echo "2. Find the existing 'Google APIs' key"
echo ""
echo "3. Click the ${RED}DELETE${NC} button to remove the old key"
echo ""
echo "4. Click ${GREEN}Add New Secret${NC}"
echo ""
echo "5. Fill in:"
echo "   Service Name: Google APIs"
echo "   Key Type: other"
echo "   Key Value: [PASTE YOUR NEW API KEY]"
echo "   Is Default: ✓ (checked)"
echo "   Is Active: ✓ (checked)"
echo ""
echo "6. Click ${GREEN}Save${NC}"
echo ""

read -p "Press ENTER after you've added the new key..."

echo ""
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🧪 TESTING NEW API KEY${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT

echo "Running Gemini API test with your new key..."
echo ""

sudo ./test-gemini-api.sh

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${GREEN}🎉🎉🎉 SUCCESS! GEMINI IS WORKING! 🎉🎉🎉${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo ""
    echo "Your chat is now fully functional!"
    echo ""
    echo "Test it now:"
    echo "1. Go to ${GREEN}https://werkules.com${NC}"
    echo "2. Click 'New Chat'"
    echo "3. Send a message"
    echo "4. ${GREEN}Gemini will respond!${NC}"
    echo ""
    echo -e "${YELLOW}What just happened:${NC}"
    echo "  ✓ Created new Google Cloud project"
    echo "  ✓ Generative Language API auto-enabled"
    echo "  ✓ Generated working API key"
    echo "  ✓ Added to your database"
    echo "  ✓ Chat is working!"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Test failed. Troubleshooting:${NC}"
    echo ""
    echo "1. Make sure you copied the ENTIRE API key"
    echo "   (Should be 39 characters starting with AIza)"
    echo ""
    echo "2. Make sure you deleted the OLD key first"
    echo ""
    echo "3. Make sure the new key is set as 'Default' and 'Active'"
    echo ""
    echo "4. Wait 1-2 minutes and try again:"
    echo "   sudo ./test-gemini-api.sh"
    echo ""
    echo "5. Check the error message above for specific issues"
    echo ""
fi

echo ""
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}ADDITIONAL INFO${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "${YELLOW}About your new API key:${NC}"
echo "  • Free tier: 60 requests per minute"
echo "  • No billing required for testing"
echo "  • Upgrade to paid tier for higher limits"
echo ""

echo -e "${YELLOW}Manage your API key:${NC}"
echo "  • View usage: https://aistudio.google.com/apikey"
echo "  • Create more keys: Click 'Create API Key'"
echo "  • Monitor quota: Check the dashboard"
echo ""

echo -e "${GREEN}Done! Your application is ready to use Gemini.${NC}"
echo ""
