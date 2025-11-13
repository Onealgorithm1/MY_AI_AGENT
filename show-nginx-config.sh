#!/bin/bash

echo "==========================================="
echo "  Current Nginx Configuration Analysis"
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
    echo ""
    echo "Checking all Nginx config locations:"
    echo "-----------------------------------"
    echo "/etc/nginx/sites-enabled/:"
    sudo ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "   Directory does not exist"
    echo ""
    echo "/etc/nginx/conf.d/:"
    sudo ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "   Directory does not exist"
    exit 1
fi

echo ""
echo "==========================================="
echo "  Full Configuration File"
echo "==========================================="
echo ""
sudo cat "$NGINX_CONFIG"
echo ""
echo "==========================================="
echo "  Analysis Complete"
echo "==========================================="
