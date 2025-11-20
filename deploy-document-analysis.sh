#!/bin/bash

# Deploy SAM.gov Document Analysis Feature to EC2

set -e

echo "=========================================="
echo "SAM.gov Document Analysis - Deployment"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running on EC2
if [ ! -f "/etc/cloud/cloud.cfg" ]; then
    echo -e "${RED}Warning: This script is designed for EC2 instances${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

cd ~/MY_AI_AGENT

echo -e "${YELLOW}Step 1: Pulling latest code...${NC}"
git fetch origin
git checkout claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e
git pull origin claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e

echo ""
echo -e "${YELLOW}Step 2: Installing new dependencies...${NC}"
cd myaiagent-mvp/backend
npm install

echo ""
echo -e "${YELLOW}Step 3: Running database migration...${NC}"
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db \
  -f migrations/014_samgov_document_analysis.sql

echo ""
echo -e "${YELLOW}Step 4: Verifying new tables...${NC}"
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db \
  -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'samgov_document%';"

echo ""
echo -e "${YELLOW}Step 5: Restarting backend...${NC}"
pm2 restart myaiagent-backend

echo ""
echo -e "${YELLOW}Step 6: Waiting for backend to start...${NC}"
sleep 5

echo ""
echo -e "${YELLOW}Step 7: Testing backend health...${NC}"
curl -s http://localhost:3000/health | json_pp || curl -s http://localhost:3000/health

echo ""
echo -e "${YELLOW}Step 8: Checking PM2 status...${NC}"
pm2 list

echo ""
echo -e "${YELLOW}Step 9: Viewing recent logs...${NC}"
pm2 logs myaiagent-backend --lines 20 --nostream

echo ""
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "📚 New Features Available:"
echo "  - Document fetching from SAM.gov opportunities"
echo "  - AI-powered document analysis"
echo "  - Bid recommendations with win probability"
echo "  - Automatic extraction of requirements & criteria"
echo ""
echo "📋 New API Endpoints:"
echo "  POST /api/sam-gov/documents/fetch"
echo "  GET  /api/sam-gov/documents/opportunity/:id"
echo "  POST /api/sam-gov/documents/analyze/:id"
echo "  GET  /api/sam-gov/documents/analysis/:id"
echo "  GET  /api/sam-gov/opportunity-analysis/:id"
echo ""
echo "📖 Documentation:"
echo "  See SAMGOV_DOCUMENT_ANALYSIS.md for full details"
echo ""
echo "🧪 Test the feature:"
echo "  1. Search for opportunities with attachments"
echo "  2. Use the new document fetch endpoint"
echo "  3. Queue documents for AI analysis"
echo "  4. View analysis results with bid recommendations"
echo ""
