#!/bin/bash

echo "==========================================="
echo "  Backend Restart with Environment Setup"
echo "==========================================="
echo ""

# 1. Kill the old backend process
OLD_PID=$(ps aux | grep "node.*server.js\|node.*backend" | grep -v grep | awk '{print $2}' | head -n 1)

if [ -n "$OLD_PID" ]; then
    echo "🛑 Stopping old backend process (PID: $OLD_PID)..."
    kill $OLD_PID
    sleep 2

    # Check if it's still running
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "   Force killing..."
        kill -9 $OLD_PID
    fi
    echo "✅ Old backend stopped"
else
    echo "ℹ️  No old backend process found"
fi
echo ""

# 2. Check for environment files
echo "🔍 Looking for environment configuration..."
echo ""

OLD_BACKEND="/home/ubuntu/myaiagent/myaiagent-mvp/backend"
NEW_BACKEND="$HOME/MY_AI_AGENT/myaiagent-mvp/backend"

if [ -f "$OLD_BACKEND/.env" ]; then
    echo "✅ Found .env in old backend location"
    echo "   Copying to new location..."
    cp "$OLD_BACKEND/.env" "$NEW_BACKEND/.env"
    echo "✅ Environment file copied"
elif [ -f "$NEW_BACKEND/.env" ]; then
    echo "✅ Environment file already exists in new location"
else
    echo "⚠️  No .env file found!"
    echo ""
    echo "Creating minimal .env file..."

    # Generate secrets
    CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    HMAC_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")

    cat > "$NEW_BACKEND/.env" << EOF
# Database
DATABASE_URL=postgresql://myaiagent_user:your_password@localhost:5432/myaiagent

# Security
CSRF_SECRET=$CSRF_SECRET
HMAC_SECRET=$HMAC_SECRET
JWT_SECRET=$JWT_SECRET

# Server
PORT=3000
NODE_ENV=production

# Google API (if needed)
# GOOGLE_API_KEY=your_key_here

# OpenAI (if needed)
# OPENAI_API_KEY=your_key_here
EOF

    echo "✅ Created basic .env file with generated secrets"
    echo ""
    echo "⚠️  IMPORTANT: You may need to update:"
    echo "   - DATABASE_URL with correct password"
    echo "   - API keys for Google, OpenAI, etc."
fi
echo ""

# 3. Start the new backend
echo "🚀 Starting new backend from: $NEW_BACKEND"
echo ""

cd "$NEW_BACKEND"

# Start in background with nohup
nohup npm start > backend.log 2>&1 &
BACKEND_PID=$!

echo "✅ Backend started (PID: $BACKEND_PID)"
echo "   Logs: $NEW_BACKEND/backend.log"
echo ""

# Wait a bit for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if process is still running
if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "✅ Backend process is running"

    # Test the STT WebSocket endpoint
    echo ""
    echo "🧪 Testing STT WebSocket endpoint..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/stt-stream 2>/dev/null)

    if [ "$RESPONSE" = "426" ] || [ "$RESPONSE" = "400" ]; then
        echo "✅ STT WebSocket endpoint is WORKING! (HTTP $RESPONSE)"
        echo ""
        echo "==========================================="
        echo "  ✅ SUCCESS! Backend is ready!"
        echo "==========================================="
        echo ""
        echo "📋 Next steps:"
        echo "   1. Clear browser cache (Ctrl+Shift+R)"
        echo "   2. Reload https://werkules.com"
        echo "   3. Try voice input"
        echo "   4. Look in console for: '✅ WebSocket STT connected'"
        echo ""
    elif [ "$RESPONSE" = "404" ]; then
        echo "❌ STT WebSocket endpoint still not found"
        echo ""
        echo "Check logs for errors:"
        echo "   tail -f $NEW_BACKEND/backend.log"
    else
        echo "⚠️  Unexpected response: HTTP $RESPONSE"
    fi
else
    echo "❌ Backend process died after starting"
    echo ""
    echo "Check logs for errors:"
    echo "   cat $NEW_BACKEND/backend.log"
    echo ""
    echo "Common issues:"
    echo "   - Database connection failed"
    echo "   - Missing API keys"
    echo "   - Port 3000 already in use"
fi
echo ""

echo "📝 Useful commands:"
echo "   • View logs: tail -f $NEW_BACKEND/backend.log"
echo "   • Check process: ps aux | grep node"
echo "   • Stop backend: kill $BACKEND_PID"
echo ""
