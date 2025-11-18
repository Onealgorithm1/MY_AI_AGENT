#!/bin/bash

# SAM.gov Updates Deployment Script for EC2
# This script pulls the latest SAM.gov enhancements and deploys them

set -e  # Exit on any error

echo "=========================================="
echo "SAM.gov Updates Deployment Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
cd ~/MY_AI_AGENT

echo -e "${YELLOW}Step 1: Fetching latest changes...${NC}"
git fetch origin

echo -e "${YELLOW}Step 2: Switching to feature branch...${NC}"
git checkout claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e

echo -e "${YELLOW}Step 3: Pulling latest updates...${NC}"
git pull origin claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e

echo -e "${YELLOW}Step 4: Installing backend dependencies...${NC}"
cd myaiagent-mvp/backend
npm install

echo -e "${YELLOW}Step 5: Running database migrations...${NC}"
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -f migrations/013_samgov_cache.sql 2>/dev/null || echo "Migration already applied or error occurred"

echo -e "${YELLOW}Step 6: Restarting backend with PM2...${NC}"
pm2 restart myaiagent-backend || pm2 start npm --name "myaiagent-backend" -- start

echo -e "${YELLOW}Step 7: Building frontend...${NC}"
cd ../frontend
npm install
npm run build

echo -e "${YELLOW}Step 8: Deploying frontend to Nginx...${NC}"
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

echo -e "${YELLOW}Step 9: Verifying deployment...${NC}"
echo ""
echo "Backend Health Check:"
curl -s http://localhost:3000/health | json_pp || curl -s http://localhost:3000/health

echo ""
echo ""
echo "PM2 Status:"
pm2 list

echo ""
echo -e "${GREEN}=========================================="
echo -e "Deployment Complete!"
echo -e "==========================================${NC}"
echo ""
echo "Your application is running at: http://3.144.201.118"
echo ""
echo "To view logs:"
echo "  pm2 logs myaiagent-backend"
echo ""
echo "To check database tables:"
echo "  PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -c \"\\dt\""
