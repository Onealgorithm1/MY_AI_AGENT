#!/bin/bash

# Script to switch from old backend to new backend with STT support

echo "==========================================="
echo "  Switch to New Backend with STT Support"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

OLD_BACKEND_DIR="/home/ubuntu/myaiagent/myaiagent-mvp/backend"
NEW_BACKEND_DIR="/home/ubuntu/MY_AI_AGENT/myaiagent-mvp/backend"

echo "1. Stopping auto-restart services (PM2/systemd)..."
echo "-------------------"

# Check for PM2
if command -v pm2 &> /dev/null; then
    PM2_PROCESSES=$(pm2 list | grep -E "(online|stopped|errored)" || true)
    if [ -n "$PM2_PROCESSES" ]; then
        echo -e "${YELLOW}⚠️  Found PM2 processes${NC}"
        pm2 list
        echo ""
        echo "🛑 Stopping all PM2 processes..."
        pm2 stop all
        pm2 delete all
        echo -e "${GREEN}✅ PM2 processes stopped${NC}"
    else
        echo -e "${GREEN}✅ No PM2 processes running${NC}"
    fi
else
    echo -e "${GREEN}✅ PM2 not installed${NC}"
fi

# Check for systemd service
if systemctl list-units --full --all | grep -q "myaiagent.service"; then
    echo -e "${YELLOW}⚠️  Found systemd service: myaiagent.service${NC}"
    echo "🛑 Stopping systemd service..."
    sudo systemctl stop myaiagent.service
    sudo systemctl disable myaiagent.service
    echo -e "${GREEN}✅ Systemd service stopped and disabled${NC}"
else
    echo -e "${GREEN}✅ No systemd service found${NC}"
fi
echo ""

echo "2. Finding and killing all Node.js processes on port 3000..."
echo "-------------------"
PIDS=$(sudo lsof -ti:3000)
if [ -z "$PIDS" ]; then
    echo -e "${GREEN}✅ No processes on port 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Found processes on port 3000:${NC}"
    for PID in $PIDS; do
        PROC_DIR=$(sudo pwdx $PID 2>/dev/null | awk '{print $2}')
        PROC_CMD=$(ps -p $PID -o cmd --no-headers 2>/dev/null | head -c 100)
        echo "   PID $PID: $PROC_DIR"
        echo "   Command: $PROC_CMD"
    done
    echo ""
    echo "🛑 Killing all processes on port 3000..."
    echo "$PIDS" | xargs -r sudo kill -9

    # Wait and verify port is free with retries
    echo "⏳ Waiting for port to be released..."
    for i in {1..10}; do
        sleep 1
        REMAINING=$(sudo lsof -ti:3000)
        if [ -z "$REMAINING" ]; then
            echo -e "${GREEN}✅ Port 3000 is now free${NC}"
            break
        fi
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ Port still in use after 10 seconds: $REMAINING${NC}"
            exit 1
        fi
    done
fi
echo ""

echo "3. Checking environment configuration..."
echo "-------------------"
if [ -f "$NEW_BACKEND_DIR/.env" ]; then
    echo -e "${GREEN}✅ .env exists in new backend${NC}"
    # Check for required secrets
    if grep -q "CSRF_SECRET" "$NEW_BACKEND_DIR/.env" && grep -q "HMAC_SECRET" "$NEW_BACKEND_DIR/.env"; then
        echo -e "${GREEN}✅ CSRF_SECRET and HMAC_SECRET configured${NC}"
    else
        echo -e "${RED}❌ Missing CSRF_SECRET or HMAC_SECRET${NC}"
        if [ -f "$OLD_BACKEND_DIR/.env" ]; then
            echo "   Copying from old backend..."
            cp "$OLD_BACKEND_DIR/.env" "$NEW_BACKEND_DIR/.env"
            echo -e "${GREEN}✅ Copied .env from old backend${NC}"
        else
            echo -e "${RED}❌ No .env file found in old backend either${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  No .env in new backend${NC}"
    if [ -f "$OLD_BACKEND_DIR/.env" ]; then
        echo "   Copying from old backend..."
        cp "$OLD_BACKEND_DIR/.env" "$NEW_BACKEND_DIR/.env"
        echo -e "${GREEN}✅ Copied .env from old backend${NC}"
    else
        echo -e "${RED}❌ No .env file found in old backend either${NC}"
        exit 1
    fi
fi
echo ""

echo "4. Verifying new backend has STT code..."
echo "-------------------"
if grep -q "createSTTWebSocketServer" "$NEW_BACKEND_DIR/src/server.js"; then
    echo -e "${GREEN}✅ STT WebSocket code found in server.js${NC}"
else
    echo -e "${RED}❌ STT WebSocket code NOT found${NC}"
    echo "   You may need to pull latest code first!"
    exit 1
fi
echo ""

echo "5. Verifying port 3000 is free before starting..."
echo "-------------------"
if sudo lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Port 3000 is still in use!${NC}"
    sudo lsof -ti:3000 | while read PID; do
        echo "   PID $PID: $(ps -p $PID -o cmd --no-headers)"
    done
    exit 1
else
    echo -e "${GREEN}✅ Port 3000 is free${NC}"
fi
echo ""

echo "6. Starting new backend..."
echo "-------------------"
cd "$NEW_BACKEND_DIR"
LOG_FILE="$NEW_BACKEND_DIR/backend.log"

# Start in background
nohup npm start > "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "   Started with PID: $NEW_PID"
echo "   Log file: $LOG_FILE"
echo ""

echo "⏳ Waiting for backend to start..."
# Check process and port with retries
for i in {1..20}; do
    sleep 1

    # Check if process is still alive
    if ! ps -p $NEW_PID > /dev/null 2>&1; then
        echo -e "${RED}❌ Backend process died after $i seconds${NC}"
        echo ""
        echo "Last 30 lines of log:"
        tail -30 "$LOG_FILE"
        exit 1
    fi

    # Check if port is in use
    if sudo lsof -ti:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend started successfully (after $i seconds)${NC}"
        break
    fi

    if [ $i -eq 20 ]; then
        echo -e "${RED}❌ Backend process is running but port 3000 not in use after 20 seconds${NC}"
        echo ""
        echo "Last 30 lines of log:"
        tail -30 "$LOG_FILE"
        exit 1
    fi
done
echo ""

echo "7. Verifying backend location..."
echo "-------------------"
PORT_PID=$(sudo lsof -ti:3000)
if [ -n "$PORT_PID" ]; then
    PROC_DIR=$(sudo pwdx $PORT_PID 2>/dev/null | awk '{print $2}')
    echo "   Process PID: $PORT_PID"
    echo "   Working directory: $PROC_DIR"

    if [ "$PROC_DIR" = "$NEW_BACKEND_DIR" ]; then
        echo -e "${GREEN}✅ Correct backend location!${NC}"
    else
        echo -e "${YELLOW}⚠️  Different location: $PROC_DIR${NC}"
    fi
else
    echo -e "${RED}❌ Port 3000 not in use - this shouldn't happen${NC}"
    exit 1
fi
echo ""

echo "8. Testing STT WebSocket endpoint..."
echo "-------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/stt-stream)
if [ "$RESPONSE" = "404" ]; then
    echo -e "${RED}❌ STT endpoint returns 404 - endpoint not configured${NC}"
    echo ""
    echo "Backend log output:"
    tail -30 "$LOG_FILE"
    exit 1
elif [ "$RESPONSE" = "426" ] || [ "$RESPONSE" = "400" ]; then
    echo -e "${GREEN}✅ STT endpoint exists (HTTP $RESPONSE - WebSocket upgrade expected)${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected response: HTTP $RESPONSE${NC}"
    echo "   This might be OK - WebSocket endpoints often return special codes"
fi
echo ""

echo "==========================================="
echo "  Success!"
echo "==========================================="
echo ""
echo "✅ New backend is running from: $NEW_BACKEND_DIR"
echo "✅ Process ID: $PORT_PID"
echo "✅ Log file: $LOG_FILE"
echo ""
echo "📋 Next steps:"
echo "   • View logs: tail -f $LOG_FILE"
echo "   • Test from browser: https://werkules.com"
echo "   • Monitor process: ps aux | grep $PORT_PID"
echo ""
