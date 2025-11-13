#!/bin/bash

echo "==========================================="
echo "  Fix Nginx WebSocket STT Configuration"
echo "==========================================="
echo ""

# Find the active Nginx configuration file
if [ -f /etc/nginx/sites-enabled/default ]; then
    NGINX_CONFIG="/etc/nginx/sites-enabled/default"
    echo "✅ Found config: /etc/nginx/sites-enabled/default"
elif [ -f /etc/nginx/sites-enabled/myaiagent ]; then
    NGINX_CONFIG="/etc/nginx/sites-enabled/myaiagent"
    echo "✅ Found config: /etc/nginx/sites-enabled/myaiagent"
elif [ -f /etc/nginx/conf.d/default.conf ]; then
    NGINX_CONFIG="/etc/nginx/conf.d/default.conf"
    echo "✅ Found config: /etc/nginx/conf.d/default.conf"
else
    echo "❌ Could not find active Nginx configuration"
    echo "   Listing /etc/nginx/sites-enabled/:"
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "   Directory does not exist"
    echo ""
    echo "   Listing /etc/nginx/conf.d/:"
    ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "   Directory does not exist"
    exit 1
fi

echo ""
echo "📋 Current Configuration:"
echo "-------------------------"
echo "File: $NGINX_CONFIG"
echo ""

# Check if /stt-stream already exists
if grep -q "location /stt-stream" "$NGINX_CONFIG"; then
    echo "✅ /stt-stream configuration already exists"
    echo ""
    echo "Current /stt-stream block:"
    sudo grep -A 10 "location /stt-stream" "$NGINX_CONFIG"
    echo ""
    read -p "Configuration exists. Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
else
    echo "❌ /stt-stream configuration NOT found"
fi

echo ""
echo "🔧 Adding /stt-stream WebSocket proxy configuration..."
echo ""

# Create backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"
echo ""

# Check if we need to add to HTTP or HTTPS server block
# Look for the HTTPS server block (listen 443)
if grep -q "listen.*443.*ssl" "$NGINX_CONFIG"; then
    echo "✅ Found HTTPS (443) configuration"
    HTTPS_BLOCK=true
else
    echo "⚠️  No HTTPS block found, will add to HTTP (80) block"
    HTTPS_BLOCK=false
fi

# Create the WebSocket proxy configuration
STT_STREAM_CONFIG='
    # WebSocket proxy for STT streaming
    location /stt-stream {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }'

# Find the right place to insert (before the last closing brace of server block)
# We'll use a Python script to do this safely
cat > /tmp/add_nginx_location.py << 'PYTHON_SCRIPT'
#!/usr/bin/env python3
import sys
import re

config_file = sys.argv[1]
new_location = sys.argv[2]

with open(config_file, 'r') as f:
    content = f.read()

# Find all server blocks
server_blocks = []
depth = 0
start_pos = None
server_start = None

for i, char in enumerate(content):
    if content[i:i+6] == 'server' and (i == 0 or content[i-1] in ' \n\t{'):
        # Find the opening brace
        brace_pos = content.find('{', i)
        if brace_pos != -1 and start_pos is None:
            server_start = i
            start_pos = brace_pos
            depth = 1
    elif start_pos is not None:
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                server_blocks.append((server_start, start_pos, i))
                start_pos = None
                server_start = None

# Find the best server block to add to
# Prefer: 1) HTTPS block (listen 443), 2) First server block
target_block = None

for start, open_brace, close_brace in server_blocks:
    block_content = content[start:close_brace+1]

    # Check for HTTPS
    if 'listen' in block_content and '443' in block_content:
        target_block = (start, open_brace, close_brace)
        break

# If no HTTPS block, use first server block
if target_block is None and server_blocks:
    target_block = server_blocks[0]

if target_block is None:
    print("ERROR: Could not find server block", file=sys.stderr)
    sys.exit(1)

start, open_brace, close_brace = target_block

# Check if /stt-stream already exists in this block
block_content = content[start:close_brace+1]
if 'location /stt-stream' in block_content:
    print("INFO: /stt-stream already exists in this server block", file=sys.stderr)
    # Don't add again
    print(content)
    sys.exit(0)

# Insert before the closing brace
new_content = (
    content[:close_brace] +
    '\n' + new_location + '\n' +
    content[close_brace:]
)

print(new_content)
PYTHON_SCRIPT

chmod +x /tmp/add_nginx_location.py

# Run the Python script to add the location block
if sudo python3 /tmp/add_nginx_location.py "$NGINX_CONFIG" "$STT_STREAM_CONFIG" > /tmp/nginx_new_config; then
    # Test the new configuration
    echo "🧪 Testing new Nginx configuration..."
    if sudo nginx -t -c /tmp/nginx_new_config 2>&1 | grep -q "syntax is ok"; then
        echo "✅ Configuration syntax is valid"

        # Apply the new configuration
        sudo mv /tmp/nginx_new_config "$NGINX_CONFIG"
        echo "✅ Configuration updated"

        # Reload Nginx
        echo ""
        echo "🔄 Reloading Nginx..."
        if sudo systemctl reload nginx; then
            echo "✅ Nginx reloaded successfully"
        else
            echo "❌ Nginx reload failed, restoring backup..."
            sudo cp "$BACKUP_FILE" "$NGINX_CONFIG"
            sudo systemctl reload nginx
            echo "⚠️  Restored backup configuration"
            exit 1
        fi
    else
        echo "❌ Configuration syntax error:"
        sudo nginx -t -c /tmp/nginx_new_config 2>&1
        echo ""
        echo "⚠️  Configuration NOT applied"
        echo "📁 Backup preserved at: $BACKUP_FILE"
        exit 1
    fi
else
    echo "❌ Failed to generate new configuration"
    exit 1
fi

echo ""
echo "==========================================="
echo "  ✅ Configuration Updated Successfully"
echo "==========================================="
echo ""
echo "📋 New /stt-stream configuration:"
sudo grep -A 10 "location /stt-stream" "$NGINX_CONFIG"
echo ""
echo "🎉 WebSocket STT should now work!"
echo ""
echo "📝 Next steps:"
echo "   1. Clear browser cache (Ctrl+Shift+R)"
echo "   2. Reload https://werkules.com"
echo "   3. Open browser console (F12)"
echo "   4. Try voice input and look for:"
echo "      • '✅ WebSocket STT connected'"
echo "      • 'useEnhancedSTT.js' logs"
echo "      • Real-time transcript updates"
echo ""
echo "📁 Backup saved at: $BACKUP_FILE"
