#!/bin/bash

# Fix web search by removing old encrypted keys and using .env values

BACKEND_DIR="/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend"

echo "🔍 Fixing Web Search Configuration..."
echo ""

cd "$BACKEND_DIR"

# Get database URL from .env
source .env

# Delete old encrypted Google Search keys from database (they can't be decrypted with new ENCRYPTION_KEY)
echo "1. Removing old encrypted Google Search keys from database..."
psql "$DATABASE_URL" << 'SQL'
DELETE FROM api_secrets
WHERE key_name IN ('GOOGLE_SEARCH_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID', 'GOOGLE_CUSTOM_SEARCH_API_KEY', 'GOOGLE_CUSTOM_SEARCH_ENGINE_ID');
SQL

echo "✓ Old encrypted keys removed"
echo ""

# Verify .env has the keys
echo "2. Verifying .env configuration..."
if grep -q "^GOOGLE_CUSTOM_SEARCH_API_KEY=" .env && grep -q "^GOOGLE_CUSTOM_SEARCH_ENGINE_ID=" .env; then
  echo "✓ Google Search keys found in .env:"
  grep "^GOOGLE_CUSTOM_SEARCH_API_KEY=" .env
  grep "^GOOGLE_CUSTOM_SEARCH_ENGINE_ID=" .env
else
  echo "⚠ Adding Google Search keys to .env..."
  echo "GOOGLE_SEARCH_API_KEY=AIzaSyDpuLB-Rcz_5ay9-RaS4QTfvuU7jKLhUrk" >> .env
  echo "GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyDpuLB-Rcz_5ay9-RaS4QTfvuU7jKLhUrk" >> .env
  echo "GOOGLE_CUSTOM_SEARCH_ENGINE_ID=d4fcebd01520d41a0" >> .env
  echo "✓ Keys added"
fi

echo ""

# Restart backend to reload environment
echo "3. Restarting backend..."
pm2 restart myaiagent-backend

sleep 3
echo ""

# Test web search
echo "4. Testing web search..."
sleep 2

# Show logs
echo ""
echo "Backend logs:"
pm2 logs myaiagent-backend --lines 15 --nostream

echo ""
echo "✅ Web search should now work!"
echo ""
echo "The backend will now use API keys from .env instead of encrypted database values."
echo "Test at https://werkules.com by asking: 'what time is it in New York'"
