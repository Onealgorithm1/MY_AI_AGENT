#!/bin/bash
# Save full diagnostic output to a file for analysis

OUTPUT_FILE="deployment-diagnostic-$(date +%Y%m%d-%H%M%S).txt"

echo "Saving full diagnostic output to: $OUTPUT_FILE"
echo "This may take a moment..."

{
    echo "=== DEPLOYMENT DIAGNOSTIC REPORT ==="
    echo "Generated: $(date)"
    echo ""

    echo "=== 1. VITE_ENABLE_ENHANCED_STT in deployed JavaScript ==="
    grep -r "VITE_ENABLE_ENHANCED_STT" /var/www/html/assets/ 2>&1
    echo ""

    echo "=== 2. New build deployment check ==="
    ls -lh /var/www/html/assets/ChatPage-*.js 2>&1
    echo ""

    echo "=== 3. Environment variables - werkules.com/api ==="
    grep -r "werkules.com/api" /var/www/html/assets/ 2>&1 | head -20
    echo ""

    echo "=== 4. Environment variables - wss://werkules ==="
    grep -r "wss://werkules" /var/www/html/assets/ 2>&1 | head -20
    echo ""

    echo "=== 5. Service worker check ==="
    ls -la /var/www/html/ 2>&1 | grep -i service
    echo ""

    echo "=== 6. index.html content ==="
    cat /var/www/html/index.html 2>&1
    echo ""

    echo "=== END OF REPORT ==="
} > "$OUTPUT_FILE"

echo "Done! Report saved to: $OUTPUT_FILE"
echo "File size: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')"
echo ""
echo "To view: cat $OUTPUT_FILE"
echo "To search: grep 'keyword' $OUTPUT_FILE"
