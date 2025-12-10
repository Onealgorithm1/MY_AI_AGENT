#!/bin/bash

# ====================================================
# COMPLETE GOOGLE APIs SETUP SCRIPT
# ====================================================
# Sets up Google Search and Voice (STT/TTS) features
#
# This script adds:
# 1. Google Custom Search API credentials
# 2. Google Cloud APIs for voice features
#
# Usage: ./setup-google-apis.sh
# ====================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}=============================================${NC}"
echo -e "${BOLD}${BLUE}   🔧 GOOGLE APIs SETUP${NC}"
echo -e "${BOLD}${BLUE}=============================================${NC}"
echo ""

# Credentials
GOOGLE_SEARCH_API_KEY="AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls"
GOOGLE_SEARCH_ENGINE_ID="d4fcebd01520d41a0"

echo -e "${BLUE}📋 This script will configure:${NC}"
echo -e "   ${GREEN}✓${NC} Google Custom Search (Web Search)"
echo -e "   ${GREEN}✓${NC} Google Speech-to-Text (Voice Input)"
echo -e "   ${GREEN}✓${NC} Google Text-to-Speech (Voice Output)"
echo ""

# ====================================================
# METHOD DETECTION
# ====================================================
echo -e "${BLUE}🔍 Detecting environment...${NC}"

BACKEND_DIR="/home/user/MY_AI_AGENT/myaiagent-mvp/backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo -e "${RED}❌ Backend directory not found at: $BACKEND_DIR${NC}"
  echo -e "${YELLOW}Please update BACKEND_DIR in this script${NC}"
  exit 1
fi

# Check if we're on Replit
if [ -n "$REPL_ID" ]; then
  DEPLOYMENT_TYPE="replit"
  echo -e "${GREEN}✓ Detected: Replit environment${NC}"
elif [ -f "$BACKEND_DIR/.env" ]; then
  DEPLOYMENT_TYPE="vps"
  echo -e "${GREEN}✓ Detected: VPS with .env file${NC}"
else
  DEPLOYMENT_TYPE="manual"
  echo -e "${YELLOW}⚠ Manual configuration required${NC}"
fi

echo ""

# ====================================================
# CONFIGURATION
# ====================================================

if [ "$DEPLOYMENT_TYPE" == "replit" ]; then
  echo -e "${BLUE}📝 Replit Configuration${NC}"
  echo ""
  echo -e "${YELLOW}Please add these secrets manually in Replit:${NC}"
  echo ""
  echo -e "${BOLD}1. Google Search API Key:${NC}"
  echo -e "   Key: ${GREEN}GOOGLE_SEARCH_API_KEY${NC}"
  echo -e "   Value: ${YELLOW}${GOOGLE_SEARCH_API_KEY}${NC}"
  echo ""
  echo -e "${BOLD}2. Google Search Engine ID:${NC}"
  echo -e "   Key: ${GREEN}GOOGLE_SEARCH_ENGINE_ID${NC}"
  echo -e "   Value: ${YELLOW}${GOOGLE_SEARCH_ENGINE_ID}${NC}"
  echo ""
  echo -e "${BOLD}3. Gemini API Key (for Voice):${NC}"
  echo -e "   Key: ${GREEN}GEMINI_API_KEY${NC}"
  echo -e "   Value: ${YELLOW}${GOOGLE_SEARCH_API_KEY}${NC} (try this first)"
  echo ""
  echo -e "${BLUE}📍 Steps:${NC}"
  echo -e "   1. Click 🔒 Secrets in left sidebar"
  echo -e "   2. Add each secret above"
  echo -e "   3. Restart your backend"
  echo ""

elif [ "$DEPLOYMENT_TYPE" == "vps" ]; then
  echo -e "${BLUE}📝 Adding to .env file...${NC}"

  cd "$BACKEND_DIR"

  # Backup existing .env
  if [ -f .env ]; then
    cp .env .env.backup
    echo -e "${GREEN}✓ Backed up existing .env to .env.backup${NC}"
  else
    cp .env.example .env
    echo -e "${GREEN}✓ Created new .env from template${NC}"
  fi

  # Add or update keys
  add_or_update_env() {
    local key=$1
    local value=$2

    if grep -q "^${key}=" .env; then
      sed -i "s|^${key}=.*|${key}=${value}|" .env
      echo -e "${GREEN}✓ Updated ${key}${NC}"
    else
      echo "${key}=${value}" >> .env
      echo -e "${GREEN}✓ Added ${key}${NC}"
    fi
  }

  add_or_update_env "GOOGLE_SEARCH_API_KEY" "$GOOGLE_SEARCH_API_KEY"
  add_or_update_env "GOOGLE_SEARCH_ENGINE_ID" "$GOOGLE_SEARCH_ENGINE_ID"
  add_or_update_env "GEMINI_API_KEY" "$GOOGLE_SEARCH_API_KEY"

  echo ""
  echo -e "${GREEN}✅ Environment variables added to .env${NC}"
  echo ""
  echo -e "${YELLOW}📝 Next step: Restart your backend${NC}"
  echo -e "   ${BLUE}pm2 restart myaiagent-backend${NC}"
  echo -e "   ${BLUE}# or #${NC}"
  echo -e "   ${BLUE}npm start${NC}"
  echo ""

else
  echo -e "${BLUE}📝 Manual Configuration Required${NC}"
  echo ""
  echo -e "${YELLOW}Add these environment variables:${NC}"
  echo ""
  echo -e "${GREEN}GOOGLE_SEARCH_API_KEY${NC}=${GOOGLE_SEARCH_API_KEY}"
  echo -e "${GREEN}GOOGLE_SEARCH_ENGINE_ID${NC}=${GOOGLE_SEARCH_ENGINE_ID}"
  echo -e "${GREEN}GEMINI_API_KEY${NC}=${GOOGLE_SEARCH_API_KEY}"
  echo ""
fi

# ====================================================
# GOOGLE CLOUD APIS - ENABLE INSTRUCTIONS
# ====================================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}   📡 REQUIRED GOOGLE CLOUD APIs${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "${YELLOW}⚠ IMPORTANT: Enable these APIs in Google Cloud Console${NC}"
echo ""

echo -e "${BOLD}1. Custom Search API${NC} (for web search)"
echo -e "   ${BLUE}https://console.cloud.google.com/apis/library/customsearch.googleapis.com${NC}"
echo ""

echo -e "${BOLD}2. Cloud Speech-to-Text API${NC} (for voice input)"
echo -e "   ${BLUE}https://console.cloud.google.com/apis/library/speech.googleapis.com${NC}"
echo ""

echo -e "${BOLD}3. Cloud Text-to-Speech API${NC} (for voice output)"
echo -e "   ${BLUE}https://console.cloud.google.com/apis/library/texttospeech.googleapis.com${NC}"
echo ""

echo -e "${BOLD}4. Generative Language API${NC} (for Gemini)"
echo -e "   ${BLUE}https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com${NC}"
echo ""

echo -e "${YELLOW}💡 For each API above:${NC}"
echo -e "   1. Click the link"
echo -e "   2. Select your project"
echo -e "   3. Click ${GREEN}ENABLE${NC}"
echo -e "   4. Wait for activation (usually instant)"
echo ""

# ====================================================
# TEST SCRIPT
# ====================================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}   🧪 TESTING${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "${BOLD}Test Commands:${NC}"
echo ""

echo -e "${BLUE}1. Test Custom Search API:${NC}"
cat << EOF
curl "https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=test"
EOF
echo ""

echo -e "${BLUE}2. Test Text-to-Speech API:${NC}"
cat << 'EOF'
curl -H "Content-Type: application/json" \
  -d '{"input":{"text":"Hello"},"voice":{"languageCode":"en-US"},"audioConfig":{"audioEncoding":"MP3"}}' \
  "https://texttospeech.googleapis.com/v1/text:synthesize?key=YOUR_KEY"
EOF
echo ""

echo -e "${BLUE}3. Test Speech-to-Text API:${NC}"
cat << 'EOF'
curl -H "Content-Type: application/json" \
  -d '{"config":{"languageCode":"en-US"},"audio":{"content":""}}' \
  "https://speech.googleapis.com/v1/speech:recognize?key=YOUR_KEY"
EOF
echo ""

# ====================================================
# VERIFICATION CHECKLIST
# ====================================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}   ✅ VERIFICATION CHECKLIST${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "${GREEN}Configuration Steps:${NC}"
echo -e "   ☐ Add environment variables (above)"
echo -e "   ☐ Enable Google Cloud APIs (links above)"
echo -e "   ☐ Restart backend server"
echo ""

echo -e "${GREEN}Testing Steps:${NC}"
echo -e "   ☐ Test web search: ${YELLOW}'what time is it in New York'${NC}"
echo -e "   ☐ Test voice input: Click microphone and speak"
echo -e "   ☐ Test voice output: Listen to AI response"
echo ""

# ====================================================
# DOCUMENTATION
# ====================================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}   📚 DOCUMENTATION${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "Detailed guides created:"
echo -e "   ${GREEN}✓${NC} ${BLUE}GOOGLE_SEARCH_SETUP.md${NC} - Web search configuration"
echo -e "   ${GREEN}✓${NC} ${BLUE}VOICE_CHAT_FIX.md${NC} - Voice features setup"
echo ""

echo -e "API Documentation:"
echo -e "   ${BLUE}https://developers.google.com/custom-search/v1/overview${NC}"
echo -e "   ${BLUE}https://cloud.google.com/speech-to-text/docs${NC}"
echo -e "   ${BLUE}https://cloud.google.com/text-to-speech/docs${NC}"
echo ""

# ====================================================
# PRICING INFO
# ====================================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}   💰 API PRICING${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

echo -e "${GREEN}Custom Search:${NC}"
echo -e "   • First 100 queries/day: ${BOLD}FREE${NC}"
echo -e "   • After: $5 per 1,000 queries"
echo ""

echo -e "${GREEN}Speech-to-Text:${NC}"
echo -e "   • First 60 minutes/month: ${BOLD}FREE${NC}"
echo -e "   • After: $0.006 per 15 seconds"
echo ""

echo -e "${GREEN}Text-to-Speech:${NC}"
echo -e "   • First 1M characters/month: ${BOLD}FREE${NC} (Standard)"
echo -e "   • WaveNet: $16 per 1M characters"
echo ""

# ====================================================
# SUMMARY
# ====================================================
echo -e "${BOLD}${GREEN}=============================================${NC}"
echo -e "${BOLD}${GREEN}   🎉 SETUP GUIDE COMPLETE${NC}"
echo -e "${BOLD}${GREEN}=============================================${NC}"
echo ""

echo -e "${YELLOW}📍 Next Steps:${NC}"
echo -e "   1. ${GREEN}Add environment variables${NC} using method above"
echo -e "   2. ${GREEN}Enable Google Cloud APIs${NC} (click links above)"
echo -e "   3. ${GREEN}Restart backend${NC} server"
echo -e "   4. ${GREEN}Test features${NC} in chat interface"
echo ""

echo -e "${BLUE}Need help? Check the documentation files!${NC}"
echo ""
