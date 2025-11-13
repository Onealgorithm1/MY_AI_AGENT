#!/bin/bash
# Diagnostic commands with filtered output to avoid overwhelming results

echo "=== 1. Check for VITE_ENABLE_ENHANCED_STT in deployed JavaScript ==="
grep -r "VITE_ENABLE_ENHANCED_STT" /var/www/html/assets/ | wc -l
echo "Found in these files:"
grep -rl "VITE_ENABLE_ENHANCED_STT" /var/www/html/assets/ 2>/dev/null || echo "Not found or directory doesn't exist"
echo ""

echo "=== 2. Check if new build was actually deployed ==="
ls -lh /var/www/html/assets/ChatPage-*.js 2>/dev/null | tail -3 || echo "No ChatPage files found"
echo ""

echo "=== 3. Check environment variables baked into build ==="
echo "werkules.com/api references (first 3):"
grep -r "werkules.com/api" /var/www/html/assets/ 2>/dev/null | head -3 || echo "Not found"
echo ""
echo "wss://werkules references (first 3):"
grep -r "wss://werkules" /var/www/html/assets/ 2>/dev/null | head -3 || echo "Not found"
echo ""

echo "=== 4. Check for service worker that might be caching ==="
ls -la /var/www/html/ 2>/dev/null | grep -i service || echo "No service worker found"
echo ""

echo "=== 5. Verify index.html is loading the right assets ==="
if [ -f /var/www/html/index.html ]; then
    echo "Script tags in index.html:"
    grep -E '<script|<link' /var/www/html/index.html | head -10
else
    echo "index.html not found"
fi
