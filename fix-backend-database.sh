#!/bin/bash

# Complete backend startup with database URL check

BACKEND_DIR="/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend"

cd "$BACKEND_DIR"

echo "🔧 Fixing Backend Configuration"
echo ""

# Step 1: Find DATABASE_URL
echo "1. Looking for DATABASE_URL..."

# Check current .env
if grep -q "^DATABASE_URL=" .env 2>/dev/null; then
  DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)
  echo "✓ Found in .env"
else
  # Try to find it in system environment
  if [ -n "$DATABASE_URL" ]; then
    DB_URL="$DATABASE_URL"
    echo "DATABASE_URL=$DB_URL" >> .env
    echo "✓ Added from environment"
  elif grep -q "DATABASE_URL=" /etc/environment 2>/dev/null; then
    DB_URL=$(grep "DATABASE_URL=" /etc/environment | cut -d'=' -f2- | tr -d '"')
    echo "DATABASE_URL=$DB_URL" >> .env
    echo "✓ Added from /etc/environment"
  else
    # Default for local PostgreSQL
    DB_URL="postgresql://myaiagent:password@localhost:5432/myaiagent"
    echo "DATABASE_URL=$DB_URL" >> .env
    echo "⚠ Using default - UPDATE THIS IN .env!"
  fi
fi

echo ""

# Step 2: Test database connection
echo "2. Testing database connection..."
if psql "$DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
  echo "✓ Database connection successful"
else
  echo "❌ Database connection failed"
  echo ""
  echo "Please update DATABASE_URL in .env with your actual database credentials:"
  echo "  cd $BACKEND_DIR"
  echo "  nano .env"
  echo ""
  echo "Format: postgresql://username:password@host:port/database"
  exit 1
fi

echo ""

# Step 3: Ensure all required keys exist
echo "3. Checking required environment variables..."

# GEMINI_API_KEY
if ! grep -q "^GEMINI_API_KEY=" .env 2>/dev/null; then
  echo "GEMINI_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls" >> .env
  echo "✓ Added GEMINI_API_KEY"
fi

# Google Search keys
if ! grep -q "^GOOGLE_CUSTOM_SEARCH_API_KEY=" .env 2>/dev/null; then
  echo "GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls" >> .env
  echo "✓ Added GOOGLE_CUSTOM_SEARCH_API_KEY"
fi

if ! grep -q "^GOOGLE_CUSTOM_SEARCH_ENGINE_ID=" .env 2>/dev/null; then
  echo "GOOGLE_CUSTOM_SEARCH_ENGINE_ID=d4fcebd01520d41a0" >> .env
  echo "✓ Added GOOGLE_CUSTOM_SEARCH_ENGINE_ID"
fi

# Generate security keys if missing
for KEY in JWT_SECRET HMAC_SECRET CSRF_SECRET ENCRYPTION_KEY; do
  if ! grep -q "^$KEY=" .env 2>/dev/null || [ -z "$(grep "^$KEY=" .env | cut -d'=' -f2)" ]; then
    if [ "$KEY" = "ENCRYPTION_KEY" ]; then
      VALUE=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    else
      VALUE=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    fi
    echo "$KEY=$VALUE" >> .env
    echo "✓ Generated $KEY"
  fi
done

echo "✓ All keys configured"
echo ""

# Step 4: Clear port and restart
echo "4. Restarting backend..."
sudo fuser -k 5000/tcp 2>/dev/null || true
sleep 2

pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

pm2 start src/server.js --name myaiagent-backend
pm2 save

echo ""
sleep 3

# Step 5: Check backend status
pm2 status

echo ""
echo "5. Checking backend logs..."
sleep 2
pm2 logs myaiagent-backend --lines 30 --nostream

echo ""
echo "✅ Backend configured and started!"
echo ""
echo "If you see database errors above, update DATABASE_URL in:"
echo "  $BACKEND_DIR/.env"
