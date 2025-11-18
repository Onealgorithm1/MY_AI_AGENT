#!/bin/bash

# Quick Fix Script for 502 Bad Gateway Error
# This script attempts to restart the backend service

set -e

echo "=========================================="
echo "502 Bad Gateway - Quick Fix Script"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Killing any processes on port 3000...${NC}"
sudo lsof -ti:3000 | xargs -r sudo kill -9 2>/dev/null || echo "No processes found on port 3000"

echo -e "${YELLOW}Step 2: Stopping all PM2 processes...${NC}"
pm2 stop all

echo -e "${YELLOW}Step 3: Navigating to backend directory...${NC}"
cd ~/MY_AI_AGENT/myaiagent-mvp/backend

echo -e "${YELLOW}Step 4: Starting backend with PM2...${NC}"
pm2 start npm --name "myaiagent-backend" -- start

echo -e "${YELLOW}Step 5: Waiting for backend to start (5 seconds)...${NC}"
sleep 5

echo -e "${YELLOW}Step 6: Checking backend health...${NC}"
curl -s http://localhost:3000/health | json_pp || curl -s http://localhost:3000/health

echo ""
echo -e "${YELLOW}Step 7: Restarting Nginx...${NC}"
sudo systemctl restart nginx

echo ""
echo -e "${YELLOW}Step 8: Checking PM2 status...${NC}"
pm2 list

echo ""
echo -e "${GREEN}=========================================="
echo "Fix Applied!"
echo "==========================================${NC}"
echo ""
echo "Test your application now at: https://werkules.com"
echo ""
echo "If still not working, run diagnostics:"
echo "  ./diagnose-502-error.sh"
echo ""
echo "View live logs:"
echo "  pm2 logs myaiagent-backend"
