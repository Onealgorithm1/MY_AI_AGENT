#!/bin/bash

# Diagnostic Script for 502 Bad Gateway Error
# This script checks why the backend isn't responding

echo "=========================================="
echo "502 Bad Gateway Diagnostic Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. Checking PM2 Process Status...${NC}"
pm2 list

echo ""
echo -e "${YELLOW}2. Checking Backend Health on localhost:3000...${NC}"
curl -s http://localhost:3000/health || echo -e "${RED}Backend not responding on port 3000${NC}"

echo ""
echo -e "${YELLOW}3. Checking what's running on port 3000...${NC}"
sudo lsof -i :3000 || echo -e "${RED}Nothing running on port 3000${NC}"

echo ""
echo -e "${YELLOW}4. Checking recent PM2 logs (last 30 lines)...${NC}"
pm2 logs myaiagent-backend --lines 30 --nostream

echo ""
echo -e "${YELLOW}5. Checking Nginx status...${NC}"
sudo systemctl status nginx | head -20

echo ""
echo -e "${YELLOW}6. Checking Nginx error logs (last 20 lines)...${NC}"
sudo tail -20 /var/log/nginx/error.log

echo ""
echo -e "${YELLOW}7. Checking Nginx configuration for werkules.com...${NC}"
sudo cat /etc/nginx/sites-enabled/default | grep -A 10 "server_name"

echo ""
echo -e "${YELLOW}8. Testing backend directly (if running)...${NC}"
curl -s http://localhost:3000/api/health || curl -s http://localhost:3000/health || echo -e "${RED}No health endpoint responding${NC}"

echo ""
echo -e "${YELLOW}9. Checking database connection...${NC}"
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -c "SELECT version();" 2>&1 | head -5

echo ""
echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
echo ""
echo "Common fixes:"
echo "1. If PM2 shows 'errored' or 'stopped':"
echo "   pm2 restart myaiagent-backend"
echo ""
echo "2. If port 3000 is in use by wrong process:"
echo "   sudo lsof -ti:3000 | xargs -r sudo kill -9"
echo "   pm2 restart myaiagent-backend"
echo ""
echo "3. If backend isn't running at all:"
echo "   cd ~/MY_AI_AGENT/myaiagent-mvp/backend"
echo "   pm2 start npm --name 'myaiagent-backend' -- start"
echo ""
echo "4. Check environment variables:"
echo "   pm2 env 0"
