#!/bin/bash
set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo -e "${YELLOW}📂 Project root: $PROJECT_ROOT${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
if ! command_exists pm2; then
    echo -e "${YELLOW}⚠️  PM2 not found, installing...${NC}"
    npm install -g pm2
fi

# Backend deployment
echo -e "\n${YELLOW}📦 Deploying backend...${NC}"
cd "$PROJECT_ROOT/myaiagent-mvp/backend"

# Install dependencies
echo "📥 Installing backend dependencies..."
npm install --production

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Backend .env file not found!${NC}"
    echo "Please create .env file with required variables"
    exit 1
fi

# Stop existing backend process
echo "🛑 Stopping existing backend..."
pm2 delete myaiagent-backend 2>/dev/null || true

# Start backend with PM2
echo "▶️  Starting backend..."
pm2 start src/server.js --name myaiagent-backend --time
pm2 save

echo -e "${GREEN}✅ Backend deployed${NC}"

# Frontend deployment
echo -e "\n${YELLOW}📦 Deploying frontend...${NC}"
cd "$PROJECT_ROOT/myaiagent-mvp/frontend"

# Install dependencies
echo "📥 Installing frontend dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Frontend .env file not found, creating default...${NC}"
    cat > .env << 'EOF'
VITE_API_URL=http://3.144.201.118:3000/api
VITE_WS_URL=ws://3.144.201.118:3000/voice
VITE_DEFAULT_MODEL=gpt-4o
EOF
fi

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Stop existing frontend process
echo "🛑 Stopping existing frontend..."
pm2 delete myaiagent-frontend 2>/dev/null || true

# Serve frontend with PM2 using a simple http server
if ! command_exists serve; then
    echo "📥 Installing serve..."
    npm install -g serve
fi

echo "▶️  Starting frontend..."
pm2 start "serve dist -l 5173 -s" --name myaiagent-frontend
pm2 save

echo -e "${GREEN}✅ Frontend deployed${NC}"

# Show PM2 status
echo -e "\n${YELLOW}📊 Service Status:${NC}"
pm2 list

# Save PM2 startup script
echo -e "\n${YELLOW}💾 Configuring PM2 to start on boot...${NC}"
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true
pm2 save

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo -e "${GREEN}Backend: http://3.144.201.118:3000${NC}"
echo -e "${GREEN}Frontend: http://3.144.201.118:5173${NC}"
echo -e "\n${YELLOW}View logs:${NC}"
echo "  pm2 logs myaiagent-backend"
echo "  pm2 logs myaiagent-frontend"
