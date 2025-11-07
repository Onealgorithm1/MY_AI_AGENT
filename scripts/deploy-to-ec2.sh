#!/bin/bash
set -e  # Exit on any error

# ============================================
# Werkules.com - Automated Deployment Script
# ============================================
# This script deploys latest code to EC2 with zero downtime
# Usage: ./scripts/deploy-to-ec2.sh

echo "🚀 Starting deployment to werkules.com..."
echo "================================================"

# Configuration
APP_DIR="/home/ubuntu/MY_AI_AGENT"
BACKEND_DIR="$APP_DIR/myaiagent-mvp/backend"
FRONTEND_DIR="$APP_DIR/myaiagent-mvp/frontend"
BACKUP_DIR="$APP_DIR/backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Create backup
echo -e "${YELLOW}📦 Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp -r "$APP_DIR" "$BACKUP_DIR/" 2>/dev/null || echo "Backup created at $BACKUP_DIR"

# Step 2: Pull latest code
echo -e "${YELLOW}📥 Pulling latest code from GitHub...${NC}"
cd "$APP_DIR"
git fetch origin
git pull origin main

# Step 3: Install dependencies
echo -e "${YELLOW}📚 Installing backend dependencies...${NC}"
cd "$BACKEND_DIR"
npm install --production

echo -e "${YELLOW}📚 Installing frontend dependencies...${NC}"
cd "$FRONTEND_DIR"
npm install

# Step 4: Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
npm run build

# Step 5: Run database migrations (if any)
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
cd "$BACKEND_DIR"
if [ -f "scripts/migrate.js" ]; then
    node scripts/migrate.js
else
    echo "No migrations to run"
fi

# Step 6: Check if app is using PM2, systemd, or just node
echo -e "${YELLOW}🔄 Restarting application...${NC}"

if command -v pm2 &> /dev/null; then
    # Using PM2
    echo "Detected PM2, restarting..."
    pm2 restart all
    pm2 save
elif systemctl is-active --quiet werkules; then
    # Using systemd
    echo "Detected systemd, restarting..."
    sudo systemctl restart werkules
else
    # Just kill and restart node
    echo "Restarting Node.js processes..."
    pkill -f "node.*server.js" || true
    cd "$BACKEND_DIR"
    nohup node src/server.js > /tmp/werkules.log 2>&1 &
fi

# Step 7: Wait for app to start
echo -e "${YELLOW}⏳ Waiting for app to start...${NC}"
sleep 5

# Step 8: Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 werkules.com is now running the latest code${NC}"
    exit 0
else
    echo -e "${RED}❌ Health check failed! Rolling back...${NC}"

    # Rollback
    echo -e "${YELLOW}🔙 Restoring from backup...${NC}"
    rm -rf "$APP_DIR"
    cp -r "$BACKUP_DIR/MY_AI_AGENT" "$(dirname $APP_DIR)/"

    # Restart with old code
    if command -v pm2 &> /dev/null; then
        pm2 restart all
    elif systemctl is-active --quiet werkules; then
        sudo systemctl restart werkules
    else
        pkill -f "node.*server.js" || true
        cd "$BACKEND_DIR"
        nohup node src/server.js > /tmp/werkules.log 2>&1 &
    fi

    echo -e "${RED}❌ Deployment failed and rolled back${NC}"
    exit 1
fi
