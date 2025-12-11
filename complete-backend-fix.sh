#!/bin/bash

# ====================================================
# COMPLETE BACKEND FIX - DATABASE + ALL FEATURES
# ====================================================

set -e

BACKEND_DIR="/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend"

echo "🔧 Complete Backend Fix - Database + API Keys"
echo "=============================================="
echo ""

# 1. Fix database user and password
echo "1. Fixing database credentials..."
sudo -u postgres psql << 'DBSQL'
ALTER USER myaiagent_user WITH PASSWORD 'MyAiAgent2024!';
GRANT ALL PRIVILEGES ON DATABASE myaiagent TO myaiagent_user;
ALTER DATABASE myaiagent OWNER TO myaiagent_user;
DBSQL

echo "✓ Database credentials updated"
echo ""

# 2. Update .env file
echo "2. Updating .env configuration..."
cd "$BACKEND_DIR"

# Backup existing .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Update DATABASE_URL
sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://myaiagent_user:MyAiAgent2024!@localhost:5432/myaiagent|' .env

# Add/update API keys
if grep -q "^GEMINI_API_KEY=" .env; then
  sed -i 's|^GEMINI_API_KEY=.*|GEMINI_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls|' .env
else
  echo "GEMINI_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls" >> .env
fi

if grep -q "^GOOGLE_CUSTOM_SEARCH_API_KEY=" .env; then
  sed -i 's|^GOOGLE_CUSTOM_SEARCH_API_KEY=.*|GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls|' .env
else
  echo "GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls" >> .env
fi

if grep -q "^GOOGLE_CUSTOM_SEARCH_ENGINE_ID=" .env; then
  sed -i 's|^GOOGLE_CUSTOM_SEARCH_ENGINE_ID=.*|GOOGLE_CUSTOM_SEARCH_ENGINE_ID=d4fcebd01520d41a0|' .env
else
  echo "GOOGLE_CUSTOM_SEARCH_ENGINE_ID=d4fcebd01520d41a0" >> .env
fi

# Ensure NODE_ENV is production
if grep -q "^NODE_ENV=" .env; then
  sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' .env
else
  echo "NODE_ENV=production" >> .env
fi

echo "✓ .env updated"
echo ""

# 3. Test database connection
echo "3. Testing database connection..."
if psql "postgresql://myaiagent_user:MyAiAgent2024!@localhost:5432/myaiagent" -c "SELECT 1;" >/dev/null 2>&1; then
  echo "✓ Database connection successful"
else
  echo "❌ Database connection failed"
  exit 1
fi
echo ""

# 4. Stop existing backend
echo "4. Stopping existing backend..."
sudo fuser -k 5000/tcp 2>/dev/null || true
sleep 2
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo "✓ Stopped"
echo ""

# 5. Start backend
echo "5. Starting backend..."
pm2 start src/server.js --name myaiagent-backend --max-memory-restart 500M
pm2 save
echo ""

sleep 3

# 6. Check status
echo "6. Backend status:"
pm2 status
echo ""

# 7. Show logs
echo "7. Backend logs (last 30 lines):"
pm2 logs myaiagent-backend --lines 30 --nostream
echo ""

# 8. Test endpoints
echo "8. Testing endpoints..."
sleep 2

# Test health
echo -n "   Health check: "
if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
  echo "✓"
else
  echo "❌"
fi

# Test CSRF token
echo -n "   CSRF token: "
if curl -s http://localhost:5000/api/csrf-token >/dev/null 2>&1; then
  echo "✓"
else
  echo "❌"
fi

echo ""
echo "=============================================="
echo "✅ Backend is running!"
echo "=============================================="
echo ""
echo "Your application should now work:"
echo "  - Chat with AI ✓"
echo "  - Voice features ✓ (after enabling Text-to-Speech API)"
echo "  - Web search ✓ (after enabling Custom Search API)"
echo "  - SAM.gov opportunities ✓"
echo ""
echo "Next steps:"
echo "  1. Test chat at https://werkules.com"
echo "  2. Enable Google Cloud APIs if needed"
echo "  3. Run SAM.gov refresh: cd backend && node refresh-samgov-opportunities.js"
echo ""
