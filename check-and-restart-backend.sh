#!/bin/bash

echo "==========================================="
echo "  Backend STT WebSocket Check & Restart"
echo "==========================================="
echo ""

# Find the backend process
echo "1. Current Backend Process:"
echo "---------------------------"
BACKEND_PID=$(ps aux | grep "node.*server.js\|node.*backend" | grep -v grep | awk '{print $2}' | head -n 1)

if [ -z "$BACKEND_PID" ]; then
    echo "❌ No backend process found"
    echo "   Need to start the backend manually"
else
    echo "✅ Backend running (PID: $BACKEND_PID)"

    # Show the command line
    ps -p "$BACKEND_PID" -o pid,cmd --no-headers
    echo ""

    # Check when it was started
    BACKEND_START=$(ps -p "$BACKEND_PID" -o lstart --no-headers)
    echo "   Started: $BACKEND_START"
fi
echo ""

# Check if backend logs show STT WebSocket initialization
echo "2. Check Backend for STT WebSocket:"
echo "------------------------------------"

# If running manually, check the screen/tmux session or running process
if [ -n "$BACKEND_PID" ]; then
    # Get the working directory of the process
    BACKEND_CWD=$(readlink -f /proc/$BACKEND_PID/cwd 2>/dev/null)
    echo "   Backend working directory: $BACKEND_CWD"

    # Check environment variables
    echo ""
    echo "   Backend PORT environment:"
    cat /proc/$BACKEND_PID/environ 2>/dev/null | tr '\0' '\n' | grep -E "^PORT=" || echo "   (PORT not set, defaults to 3000)"
fi
echo ""

# Test if the STT WebSocket endpoint responds
echo "3. Test STT WebSocket Endpoint:"
echo "--------------------------------"
# Try to connect to the endpoint (should get upgrade required)
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/stt-stream 2>/dev/null)
if [ "$RESPONSE" = "426" ] || [ "$RESPONSE" = "400" ]; then
    echo "✅ STT WebSocket endpoint is responding (HTTP $RESPONSE)"
    echo "   (426/400 is expected - means WebSocket upgrade required)"
elif [ "$RESPONSE" = "404" ]; then
    echo "❌ STT WebSocket endpoint NOT FOUND (HTTP 404)"
    echo "   Backend doesn't have /stt-stream endpoint"
    echo "   Need to restart backend with latest code"
else
    echo "⚠️  STT WebSocket endpoint returned: HTTP $RESPONSE"
fi
echo ""

# Check the backend server.js file for STT WebSocket
echo "4. Check Backend Code:"
echo "----------------------"
if [ -f ~/MY_AI_AGENT/myaiagent-mvp/backend/src/server.js ]; then
    if grep -q "createSTTWebSocketServer" ~/MY_AI_AGENT/myaiagent-mvp/backend/src/server.js; then
        echo "✅ Backend code has createSTTWebSocketServer"
    else
        echo "❌ Backend code missing createSTTWebSocketServer"
    fi

    if [ -f ~/MY_AI_AGENT/myaiagent-mvp/backend/src/websocket/sttStream.js ]; then
        echo "✅ STT WebSocket handler exists"
    else
        echo "❌ STT WebSocket handler missing"
    fi
else
    echo "⚠️  Cannot find backend source code"
fi
echo ""

# Provide restart instructions
echo "==========================================="
echo "  Recommended Actions"
echo "==========================================="
echo ""

if [ "$RESPONSE" = "404" ]; then
    echo "❌ STT WebSocket endpoint NOT found on backend"
    echo ""
    echo "The backend needs to be restarted with the latest code."
    echo ""
    echo "To restart backend:"
    echo "-------------------"
    echo "1. Find the terminal/screen/tmux running the backend"
    echo "2. Stop it (Ctrl+C)"
    echo "3. Pull latest code:"
    echo "   cd ~/MY_AI_AGENT"
    echo "   git pull"
    echo "4. Restart backend:"
    echo "   cd ~/MY_AI_AGENT/myaiagent-mvp/backend"
    echo "   npm install  # in case dependencies changed"
    echo "   npm start"
    echo ""
elif [ "$RESPONSE" = "426" ] || [ "$RESPONSE" = "400" ]; then
    echo "✅ Backend has STT WebSocket endpoint!"
    echo ""
    echo "Next steps to verify it's working:"
    echo "-----------------------------------"
    echo "1. Clear browser cache (Ctrl+Shift+R)"
    echo "2. Open browser console (F12)"
    echo "3. Reload https://werkules.com"
    echo "4. Try voice input"
    echo "5. Look for:"
    echo "   • '✅ WebSocket STT connected'"
    echo "   • 'useEnhancedSTT.js' logs"
    echo "   • Text appearing in real-time"
    echo ""
    echo "If still not working, restart backend anyway:"
    echo "   (in the terminal running backend, press Ctrl+C then npm start)"
else
    echo "⚠️  Backend might need to be restarted"
    echo ""
    echo "Try these steps:"
    echo "----------------"
    echo "1. Stop the current backend (Ctrl+C in its terminal)"
    echo "2. cd ~/MY_AI_AGENT/myaiagent-mvp/backend"
    echo "3. git pull"
    echo "4. npm start"
fi
echo ""

# Show how to find the backend terminal
echo "To find the backend terminal:"
echo "-----------------------------"
if command -v screen &> /dev/null; then
    echo "• List screen sessions: screen -ls"
    echo "• Reattach to session: screen -r [session-name]"
fi
if command -v tmux &> /dev/null; then
    echo "• List tmux sessions: tmux ls"
    echo "• Attach to session: tmux attach -t [session-name]"
fi
echo "• Or: find the SSH terminal where you ran 'npm start'"
echo ""
