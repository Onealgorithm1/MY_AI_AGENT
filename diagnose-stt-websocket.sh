#!/bin/bash

echo "==========================================="
echo "  WebSocket STT Diagnostic Script"
echo "==========================================="
echo ""

# 1. Check if backend is running
echo "1. Backend Status:"
echo "-------------------"
sudo systemctl status myaiagent-backend --no-pager | head -n 10
echo ""

# 2. Check backend logs for WebSocket initialization
echo "2. Backend WebSocket Initialization:"
echo "------------------------------------"
sudo journalctl -u myaiagent-backend --no-pager | grep -i "stt.*websocket\|websocket.*stt" | tail -n 5
echo ""

# 3. Check which port backend is actually running on
echo "3. Backend Port:"
echo "----------------"
sudo netstat -tlnp | grep node || sudo ss -tlnp | grep node
echo ""

# 4. Check actual Nginx configuration (not the source file)
echo "4. Active Nginx STT WebSocket Config:"
echo "--------------------------------------"
if [ -f /etc/nginx/sites-enabled/default ]; then
    grep -A 10 "stt-stream" /etc/nginx/sites-enabled/default
elif [ -f /etc/nginx/nginx.conf ]; then
    grep -A 10 "stt-stream" /etc/nginx/nginx.conf
else
    echo "❌ Could not find active Nginx configuration"
fi
echo ""

# 5. Check if Nginx is running and on which ports
echo "5. Nginx Status:"
echo "----------------"
sudo systemctl status nginx --no-pager | head -n 5
sudo netstat -tlnp | grep nginx || sudo ss -tlnp | grep nginx
echo ""

# 6. Test WebSocket endpoint locally
echo "6. Testing WebSocket Endpoint Locally:"
echo "---------------------------------------"
# Get a token from the database
TOKEN=$(sudo -u postgres psql -d myaiagent -t -c "SELECT token FROM sessions WHERE expires_at > NOW() ORDER BY created_at DESC LIMIT 1;" 2>/dev/null | xargs)
if [ -z "$TOKEN" ]; then
    echo "⚠️  No valid session token found in database"
    echo "   This is expected if no users are logged in"
else
    echo "✅ Found session token"
    # Try to connect via curl with upgrade headers
    timeout 3 curl -i -N \
        -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Version: 13" \
        -H "Sec-WebSocket-Key: test" \
        "http://localhost:3000/stt-stream?token=$TOKEN" 2>&1 | head -n 10
fi
echo ""

# 7. Check firewall rules
echo "7. Firewall Status:"
echo "-------------------"
sudo ufw status | grep -E "443|80|3000|5000" || echo "UFW not active or not configured"
echo ""

# 8. Check for WebSocket connection errors in backend logs
echo "8. Recent WebSocket Connection Attempts:"
echo "-----------------------------------------"
sudo journalctl -u myaiagent-backend --since "10 minutes ago" --no-pager | grep -i "websocket\|stt.*stream" | tail -n 10
echo ""

# 9. Check environment variables the backend is using
echo "9. Backend Environment:"
echo "-----------------------"
sudo systemctl show myaiagent-backend | grep -i "^Environment" | head -n 5
echo ""

echo "==========================================="
echo "  Diagnostic Complete"
echo "==========================================="
echo ""
echo "📋 Next Steps:"
echo "   1. Check if backend is on port 3000 or 5000"
echo "   2. Verify Nginx is proxying /stt-stream correctly"
echo "   3. Check backend logs for WebSocket errors"
echo "   4. Test WebSocket connection from browser console"
