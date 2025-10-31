#!/bin/bash
# Monitor Auto mode testing in real-time

echo "=================================="
echo "AUTO MODE TEST MONITOR"
echo "=================================="
echo ""
echo "Watching for:"
echo "  - Model selections"
echo "  - Function calls (should be minimal!)"
echo "  - Errors"
echo ""
echo "Press Ctrl+C to stop"
echo "=================================="
echo ""

# Follow backend logs and filter for relevant lines
tail -f myaiagent-mvp/backend/logs/* 2>/dev/null | grep -E "(Auto-selected|AI wants to call function|error|Error|ERROR)" --color=always
