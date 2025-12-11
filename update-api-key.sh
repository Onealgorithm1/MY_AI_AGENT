#!/bin/bash

# Update GEMINI_API_KEY and restart backend

BACKEND_DIR="/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend"

echo "🔑 Updating GEMINI_API_KEY..."
cd "$BACKEND_DIR"

# Backup .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update GEMINI_API_KEY
sed -i 's|^GEMINI_API_KEY=.*|GEMINI_API_KEY=AIzaSyDpuLB-Rcz_5ay9-RaS4QTfvuU7jKLhUrk|' .env

# Also update Google Search API key (they might be the same)
sed -i 's|^GOOGLE_CUSTOM_SEARCH_API_KEY=.*|GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyDpuLB-Rcz_5ay9-RaS4QTfvuU7jKLhUrk|' .env

echo "✓ API key updated"
echo ""

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart myaiagent-backend

sleep 3
echo ""

# Show status
pm2 status

echo ""
echo "📋 Recent logs:"
sleep 2
pm2 logs myaiagent-backend --lines 20 --nostream

echo ""
echo "✅ Backend restarted with new API key!"
echo ""
echo "Test chat at https://werkules.com now!"
