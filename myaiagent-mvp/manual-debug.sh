#!/bin/bash
set -e

echo "🔍 Starting Manual Debug Process..."

# 1. Go to project root
cd ~/MY_AI_AGENT
echo "📂 Changed to project root"

# 2. Pull latest changes
echo "⬇️  Pulling latest code..."
git fetch origin development
git reset --hard origin/development

# 3. Ensure Node.js v20 (CRITICAL FIX)
echo "🔍 Checking Node.js version..."
if [[ $(node -v) != v20* ]]; then
    echo "⚠️  Node.js 18 detected. Upgrading to v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    sudo npm install -g pm2
    echo "✅ Upgraded to $(node -v)"
fi

cd myaiagent-mvp

# 4. Backend Setup
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "🔄 Running migrations..."
npm run migrate
cd ..

# 5. Frontend Build
echo "🏗️  Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 6. Deploy Frontend
echo "🚀 Deploying frontend files..."
sudo mkdir -p /var/www/myaiagent
sudo cp -r frontend/dist/* /var/www/myaiagent/

# 7. Restart Backend
echo "🔄 Restarting backend..."
cd backend
pm2 restart myaiagent-backend || pm2 start npm --name "myaiagent-backend" -- start
pm2 save

# 8. Logs
echo "✅ Done! Fetching logs..."
pm2 logs myaiagent-backend --lines 50 --nostream
