#!/bin/bash

# Quick fix to start backend with all required keys

BACKEND_DIR="/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend"

echo "🔧 Quick Backend Fix"
echo ""

cd "$BACKEND_DIR"

# 1. Ensure GEMINI_API_KEY is in .env
echo "1. Checking .env file..."
if ! grep -q "^GEMINI_API_KEY=" .env 2>/dev/null; then
  echo "Adding GEMINI_API_KEY to .env..."
  echo "GEMINI_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls" >> .env
fi

if ! grep -q "^GOOGLE_CUSTOM_SEARCH_API_KEY=" .env 2>/dev/null; then
  echo "Adding GOOGLE_CUSTOM_SEARCH_API_KEY to .env..."
  echo "GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls" >> .env
fi

if ! grep -q "^GOOGLE_CUSTOM_SEARCH_ENGINE_ID=" .env 2>/dev/null; then
  echo "Adding GOOGLE_CUSTOM_SEARCH_ENGINE_ID to .env..."
  echo "GOOGLE_CUSTOM_SEARCH_ENGINE_ID=d4fcebd01520d41a0" >> .env
fi

echo "✓ .env configured"
echo ""

# 2. Kill any process on port 5000
echo "2. Clearing port 5000..."
sudo fuser -k 5000/tcp 2>/dev/null || echo "Port already clear"
sleep 2
echo ""

# 3. Stop all PM2 processes
echo "3. Cleaning PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo ""

# 4. Start backend
echo "4. Starting backend..."
pm2 start src/server.js --name myaiagent-backend --max-memory-restart 500M
pm2 save
echo ""

# 5. Wait and check status
sleep 3
pm2 status
echo ""

# 6. Test voices endpoint
echo "5. Testing TTS voices endpoint..."
sleep 2
curl -s http://localhost:5000/api/tts/voices -H "Cookie: $(cat /tmp/test-cookie.txt 2>/dev/null || echo '')" | head -20
echo ""
echo ""

echo "✅ Backend started!"
echo ""
echo "Check logs: pm2 logs myaiagent-backend --lines 50"
echo ""
