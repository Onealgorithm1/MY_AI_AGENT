#!/bin/bash

# SAM.gov UI Deployment Script
# Deploys the new SAM.gov frontend to EC2

set -e

echo "🚀 Deploying SAM.gov UI to EC2..."

# Pull latest code
echo "📥 Pulling latest code..."
cd /home/ubuntu/MY_AI_AGENT
git fetch origin claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e
git checkout claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e
git pull origin claude/sam-gov-multiple-responses-01A5dkmoMPZzaXEVXY9u7u1e

# Build frontend
echo "🔨 Building frontend..."
cd myaiagent-mvp/frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build
echo "🏗️  Building production bundle..."
npm run build

# Copy to Nginx
echo "📋 Copying to Nginx..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

# Restart Nginx to ensure latest assets
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

echo "✅ SAM.gov UI deployed successfully!"
echo ""
echo "🌐 Visit: http://werkules.com/samgov"
echo "🌐 Or: http://54.80.235.76/samgov"
