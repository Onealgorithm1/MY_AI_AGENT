#!/bin/bash

# EMERGENCY FIX SCRIPT
# Fixes immediate production issues

set -e

echo "=========================================="
echo "🚨 EMERGENCY FIX - PRODUCTION ISSUES"
echo "=========================================="
echo ""

# 1. KILL ALL CONFLICTING PROCESSES
echo "1. Killing port 5000 conflicts..."
sudo fuser -k 5000/tcp || echo "No process on port 5000"
sleep 2

# 2. STOP ALL PM2 PROCESSES
echo "2. Stopping all PM2 processes..."
pm2 stop all
pm2 delete all || echo "No PM2 processes to delete"
sleep 2

# 3. START FRESH PM2 PROCESS
echo "3. Starting backend with PM2..."
cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend
pm2 start src/server.js --name myaiagent-backend --max-memory-restart 500M
pm2 save
sleep 3

# 4. CHECK STATUS
echo "4. Checking PM2 status..."
pm2 status

echo ""
echo "✅ Backend restarted successfully"
echo ""
echo "Next: Enable Google Custom Search API"
echo "Go to: https://console.cloud.google.com/apis/library/customsearch.googleapis.com"
echo "Click ENABLE"
echo ""
