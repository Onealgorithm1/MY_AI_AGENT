#!/bin/bash

# Create Jira Issue for Deployment
# Usage: ./create-jira-deployment-issue.sh [PROJECT_KEY]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Creating Jira Deployment Issue"
echo "=========================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to run this script."
    exit 1
fi

# Optional: Set project key from argument
if [ ! -z "$1" ]; then
    export JIRA_PROJECT_KEY="$1"
    echo "📌 Using project key: $JIRA_PROJECT_KEY"
fi

# Run the Jira integration script
cd "$PROJECT_ROOT"
node scripts/jira-integration.js

echo ""
echo "=========================================="
echo "✅ Done!"
echo "=========================================="
