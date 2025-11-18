#!/bin/bash

# Fix for database.js import error
# This script pulls the latest code fix and restarts the backend

set -e

echo "=========================================="
echo "Fixing Database Import Error"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd ~/MY_AI_AGENT

echo -e "${YELLOW}Step 1: Fetching latest changes...${NC}"
git fetch origin

echo -e "${YELLOW}Step 2: Checking out feature branch...${NC}"
git checkout claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e

echo -e "${YELLOW}Step 3: Pulling latest fix...${NC}"
git pull origin claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e

echo -e "${YELLOW}Step 4: Stopping PM2 backend...${NC}"
pm2 stop myaiagent-backend 2>/dev/null || true
pm2 delete myaiagent-backend 2>/dev/null || true

echo -e "${YELLOW}Step 5: Killing any processes on port 3000...${NC}"
sudo lsof -ti:3000 | xargs -r sudo kill -9 2>/dev/null || true

echo -e "${YELLOW}Step 6: Starting backend with PM2...${NC}"
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
pm2 start npm --name "myaiagent-backend" -- start

echo -e "${YELLOW}Step 7: Waiting for backend to start (10 seconds)...${NC}"
sleep 10

echo -e "${YELLOW}Step 8: Testing backend health...${NC}"
curl -s http://localhost:3000/health | json_pp || curl -s http://localhost:3000/health || echo "Backend starting up..."

echo ""
echo -e "${YELLOW}Step 9: Checking PM2 status...${NC}"
pm2 list

echo ""
echo -e "${YELLOW}Step 10: Checking recent logs...${NC}"
pm2 logs myaiagent-backend --lines 20 --nostream

echo ""
echo -e "${GREEN}=========================================="
echo "Fix Applied!"
echo "==========================================${NC}"
echo ""
echo "If backend is running, test at: https://werkules.com"
