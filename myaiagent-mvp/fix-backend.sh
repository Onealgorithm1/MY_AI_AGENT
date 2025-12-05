#!/bin/bash

# ===========================================
# QUICK FIX FOR 502 BAD GATEWAY ERROR
# ===========================================
# This script fixes the backend configuration
# and restarts the server

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 Fixing Backend 502 Error${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Detect backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo -e "${BLUE}📁 Backend directory: $BACKEND_DIR${NC}"

# Navigate to backend
cd "$BACKEND_DIR"

# Step 1: Check if .env exists
echo ""
echo -e "${BLUE}Step 1: Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
    else
        echo -e "${RED}❌ .env.example not found. Creating minimal .env${NC}"
        touch .env
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Step 2: Check for required secrets
echo ""
echo -e "${BLUE}Step 2: Checking required secrets...${NC}"

# Function to check if a variable exists in .env
check_env_var() {
    if grep -q "^$1=" .env && ! grep -q "^$1=your_.*_here" .env && ! grep -q "^$1=$" .env; then
        echo -e "${GREEN}✅ $1 is configured${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $1 is missing or not configured${NC}"
        return 1
    fi
}

# Check critical variables
NEEDS_SECRETS=false

if ! check_env_var "JWT_SECRET"; then
    NEEDS_SECRETS=true
fi

if ! check_env_var "HMAC_SECRET" && ! check_env_var "CSRF_SECRET"; then
    NEEDS_SECRETS=true
fi

# Step 3: Generate secrets if needed
if [ "$NEEDS_SECRETS" = true ]; then
    echo ""
    echo -e "${BLUE}Step 3: Generating missing secrets...${NC}"

    # Backup existing .env
    cp .env .env.backup
    echo -e "${GREEN}✅ Backed up .env to .env.backup${NC}"

    # Generate secrets
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    HMAC_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    # ENCRYPTION_KEY must be 64 hex characters (32 bytes in hex format)
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    # Update or add secrets to .env
    update_or_add_env() {
        local key=$1
        local value=$2
        if grep -q "^${key}=" .env; then
            # Update existing
            sed -i "s|^${key}=.*|${key}=${value}|" .env
            echo -e "${GREEN}✅ Updated ${key}${NC}"
        else
            # Add new
            echo "${key}=${value}" >> .env
            echo -e "${GREEN}✅ Added ${key}${NC}"
        fi
    }

    update_or_add_env "JWT_SECRET" "$JWT_SECRET"
    update_or_add_env "HMAC_SECRET" "$HMAC_SECRET"
    update_or_add_env "CSRF_SECRET" "$CSRF_SECRET"
    update_or_add_env "ENCRYPTION_KEY" "$ENCRYPTION_KEY"

    # Ensure NODE_ENV is set
    if ! grep -q "^NODE_ENV=" .env; then
        echo "NODE_ENV=production" >> .env
        echo -e "${GREEN}✅ Added NODE_ENV=production${NC}"
    fi

    # Ensure PORT is set
    if ! grep -q "^PORT=" .env; then
        echo "PORT=5000" >> .env
        echo -e "${GREEN}✅ Added PORT=5000${NC}"
    fi

    echo -e "${GREEN}✅ All secrets generated and configured${NC}"
else
    echo -e "${GREEN}✅ All required secrets are already configured${NC}"
fi

# Step 4: Check PostgreSQL
echo ""
echo -e "${BLUE}Step 4: Checking PostgreSQL...${NC}"
if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet postgresql; then
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL is not running. Attempting to start...${NC}"
        sudo systemctl start postgresql
        if systemctl is-active --quiet postgresql; then
            echo -e "${GREEN}✅ PostgreSQL started${NC}"
        else
            echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check PostgreSQL status (systemctl not available)${NC}"
fi

# Step 5: Check if database exists
echo ""
echo -e "${BLUE}Step 5: Checking database...${NC}"
if command -v psql &> /dev/null; then
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw myaiagent; then
        echo -e "${GREEN}✅ Database 'myaiagent' exists${NC}"
    else
        echo -e "${YELLOW}⚠️  Database 'myaiagent' not found${NC}"
        echo -e "${BLUE}ℹ️  To create it, run:${NC}"
        echo -e "${BLUE}   sudo -u postgres psql -c \"CREATE DATABASE myaiagent;\"${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check database (psql not available)${NC}"
fi

# Step 6: Install dependencies
echo ""
echo -e "${BLUE}Step 6: Installing dependencies...${NC}"
if [ -f package.json ]; then
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ package.json not found${NC}"
fi

# Step 7: Restart PM2
echo ""
echo -e "${BLUE}Step 7: Restarting backend with PM2...${NC}"

if command -v pm2 &> /dev/null; then
    # Stop old process
    pm2 delete myaiagent-backend 2>/dev/null || true
    echo -e "${GREEN}✅ Stopped old backend process${NC}"

    # Start new process
    pm2 start npm --name "myaiagent-backend" -- start
    echo -e "${GREEN}✅ Started new backend process${NC}"

    # Save PM2 config
    pm2 save
    echo -e "${GREEN}✅ Saved PM2 configuration${NC}"

    # Wait for backend to start
    echo -e "${BLUE}⏳ Waiting for backend to start...${NC}"
    sleep 3

    # Check status
    pm2 status

else
    echo -e "${RED}❌ PM2 not found. Install with: sudo npm install -g pm2${NC}"
    exit 1
fi

# Step 8: Test backend
echo ""
echo -e "${BLUE}Step 8: Testing backend...${NC}"

# Test health endpoint
if curl -sf http://localhost:5000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
    curl -s http://localhost:5000/health | head -1
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo -e "${BLUE}ℹ️  Check logs with: pm2 logs myaiagent-backend${NC}"
fi

# Test CSRF endpoint
if curl -sf http://localhost:5000/api/csrf-token > /dev/null; then
    echo -e "${GREEN}✅ CSRF token endpoint working${NC}"
else
    echo -e "${YELLOW}⚠️  CSRF token endpoint not responding (may need authentication)${NC}"
fi

# Step 9: Check Nginx
echo ""
echo -e "${BLUE}Step 9: Checking Nginx...${NC}"
if command -v nginx &> /dev/null; then
    # Test config
    if sudo nginx -t &> /dev/null; then
        echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    else
        echo -e "${RED}❌ Nginx configuration has errors${NC}"
        sudo nginx -t
    fi

    # Restart Nginx
    sudo systemctl restart nginx
    echo -e "${GREEN}✅ Nginx restarted${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx not found${NC}"
fi

# Final summary
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 Fix Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Check PM2 status: ${YELLOW}pm2 status${NC}"
echo -e "2. View backend logs: ${YELLOW}pm2 logs myaiagent-backend${NC}"
echo -e "3. Test in browser: ${YELLOW}http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')${NC}"
echo ""
echo -e "${BLUE}If issues persist:${NC}"
echo -e "- View backend logs: ${YELLOW}pm2 logs myaiagent-backend --err${NC}"
echo -e "- View nginx errors: ${YELLOW}sudo tail -f /var/log/nginx/error.log${NC}"
echo -e "- Test backend: ${YELLOW}curl -v http://localhost:5000/health${NC}"
echo ""
