#!/bin/bash

# Post-Deployment Hook for EC2
# This script runs after successful deployment and creates a Jira issue

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Post-Deployment Hook"
echo "=========================================="
echo ""

# Get deployment information
BRANCH=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)
COMMIT=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "Branch: $BRANCH"
echo "Commit: $COMMIT"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check if backend is healthy
echo "🏥 Checking backend health..."
HEALTH_CHECK=$(curl -s http://localhost:3000/health || echo "failed")

if [[ $HEALTH_CHECK == *"healthy"* ]]; then
    echo "✅ Backend is healthy"

    # Create Jira issue
    echo ""
    echo "📝 Creating Jira deployment issue..."

    cd "$PROJECT_ROOT"

    # Try Node.js method first
    if node scripts/jira-integration.js 2>/dev/null; then
        echo "✅ Jira issue created via Node.js script"
    else
        echo "⚠️  Node.js method failed, trying curl method..."

        # Fallback to curl method
        if bash scripts/create-jira-issue-curl.sh; then
            echo "✅ Jira issue created via curl"
        else
            echo "❌ Both methods failed to create Jira issue"
        fi
    fi
else
    echo "❌ Backend health check failed"
    echo "Skipping Jira notification"
fi

echo ""
echo "=========================================="
echo "Post-deployment hook completed"
echo "=========================================="
