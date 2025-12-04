#!/bin/bash

# EC2 Setup Script for Werkules Deployment
# This script prepares an EC2 instance for automatic deployments from GitHub Actions

set -e  # Exit on any error

echo "🚀 Starting EC2 setup for Werkules deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_PATH="${DEPLOY_PATH:-/home/$USER/MY_AI_AGENT/myaiagent-mvp}"
WEB_DIR="/var/www/myaiagent"
LOG_DIR="/var/log/myaiagent"
DEPLOY_USER=$(whoami)

echo -e "${YELLOW}This script will:${NC}"
echo "  1. Install Node.js 22 via nvm"
echo "  2. Install PM2 process manager"
echo "  3. Create deployment directories"
echo "  4. Create web directory for frontend"
echo "  5. Setup logging directories"
echo "  6. Create PM2 ecosystem config"
echo "  7. Setup PostgreSQL (optional)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Install Node.js 22 via nvm
echo ""
echo "📦 Installing Node.js 22..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "Node.js is already installed: $NODE_VERSION"
    read -p "Reinstall Node.js 22 via nvm? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Skipping Node.js installation"
    fi
fi

if [[ $REPLY =~ ^[Yy]$ ]] || ! command -v node &> /dev/null; then
    # Install nvm if not present
    if [ ! -d "$HOME/.nvm" ]; then
        echo "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        print_status "nvm installed"
    else
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        print_status "nvm already installed"
    fi

    # Install Node.js 22
    nvm install 22
    nvm use 22
    nvm alias default 22
    print_status "Node.js 22 installed"
fi

# Verify Node.js installation
NODE_VERSION=$(node --version)
echo "Current Node.js version: $NODE_VERSION"

# 2. Install PM2
echo ""
echo "📦 Installing PM2..."
if command -v pm2 &> /dev/null; then
    print_status "PM2 is already installed"
else
    npm install -g pm2
    print_status "PM2 installed"
fi

# Setup PM2 startup script
echo ""
echo "🔧 Setting up PM2 startup script..."
pm2 startup | grep -E "^sudo" | bash || true
print_status "PM2 startup configured"

# 3. Create deployment directory
echo ""
echo "📂 Creating deployment directory..."
mkdir -p $DEPLOY_PATH
chmod -R 755 $DEPLOY_PATH
print_status "Deployment directory created: $DEPLOY_PATH"

# 3b. Create web directory for frontend
echo ""
echo "📂 Creating web directory for frontend..."
sudo mkdir -p $WEB_DIR
sudo chown -R $DEPLOY_USER:$DEPLOY_USER $WEB_DIR
chmod -R 755 $WEB_DIR
print_status "Web directory created: $WEB_DIR"

# 4. Create logging directory
echo ""
echo "📂 Creating logging directory..."
sudo mkdir -p $LOG_DIR
sudo chown -R $DEPLOY_USER:$DEPLOY_USER $LOG_DIR
print_status "Logging directory created: $LOG_DIR"

# 5. Create PM2 ecosystem config
echo ""
echo "📝 Creating PM2 ecosystem config..."
cat > $DEPLOY_PATH/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'myaiagent-backend',
      script: './backend/server.js',
      cwd: '${DEPLOY_PATH}',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '${LOG_DIR}/backend-error.log',
      out_file: '${LOG_DIR}/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      autorestart: true,
      watch: false
    }
  ]
};
EOF
print_status "PM2 ecosystem config created"

# 6. Create placeholder .env file
echo ""
echo "📝 Creating placeholder .env file..."
mkdir -p $DEPLOY_PATH/backend
cat > $DEPLOY_PATH/backend/.env << 'EOF'
# Werkules Backend Environment Variables
# TODO: Update these values with your actual configuration

NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/werkules

# Security
JWT_SECRET=change-this-to-a-secure-random-string
SESSION_SECRET=change-this-to-another-secure-random-string

# OpenAI
OPENAI_API_KEY=your-openai-api-key-here

# ElevenLabs
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://werkules.com/api/auth/google/callback

# SAM.gov
SAM_GOV_API_KEY=your-sam-gov-api-key-here

# Add other required environment variables below
EOF
chmod 600 $DEPLOY_PATH/backend/.env
print_status "Placeholder .env file created"
echo -e "${YELLOW}⚠️  IMPORTANT: Edit $DEPLOY_PATH/backend/.env with your actual values${NC}"

# 7. Setup basic firewall (optional)
echo ""
read -p "Setup UFW firewall? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v ufw &> /dev/null; then
        echo "Configuring UFW..."
        sudo ufw --force enable
        sudo ufw allow 22/tcp   # SSH
        sudo ufw allow 80/tcp   # HTTP
        sudo ufw allow 443/tcp  # HTTPS
        sudo ufw status
        print_status "UFW firewall configured"
    else
        echo "UFW not installed. Skipping firewall setup."
    fi
fi

# 8. Install Nginx (optional)
echo ""
read -p "Install Nginx? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v nginx &> /dev/null; then
        print_status "Nginx is already installed"
    else
        echo "Installing Nginx..."
        sudo apt-get update
        sudo apt-get install -y nginx
        print_status "Nginx installed"
    fi

    # Create Nginx config
    echo "Creating Nginx configuration..."
    sudo tee /etc/nginx/sites-available/myaiagent > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name werkules.com www.werkules.com;

    # Frontend - serve static files
    location / {
        root /var/www/myaiagent;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - proxy to Node.js
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # STT Stream WebSocket
    location /stt-stream {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Voice WebSocket
    location /voice {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
}
NGINXEOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/myaiagent /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default

    # Test Nginx config
    sudo nginx -t

    # Restart Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx

    print_status "Nginx configured and started"
    echo -e "${YELLOW}⚠️  Don't forget to setup SSL with: sudo certbot --nginx -d werkules.com${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ EC2 Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit environment variables:"
echo -e "     ${YELLOW}nano $DEPLOY_PATH/backend/.env${NC}"
echo ""
echo "  2. Configure GitHub Secrets:"
echo "     - EC2_SSH_KEY: Your EC2 private key"
echo "     - EC2_HOST: $(curl -s http://checkip.amazonaws.com)"
echo "     - EC2_USER: $DEPLOY_USER"
echo "     - EC2_DEPLOY_PATH: $DEPLOY_PATH"
echo ""
echo "  3. Setup SSL certificate (if Nginx installed):"
echo -e "     ${YELLOW}sudo apt-get install certbot python3-certbot-nginx${NC}"
echo -e "     ${YELLOW}sudo certbot --nginx -d werkules.com -d www.werkules.com${NC}"
echo ""
echo "  4. Push to main branch to trigger automatic deployment"
echo ""
echo "Useful commands:"
echo "  - View logs: pm2 logs myaiagent-backend"
echo "  - Restart app: pm2 restart myaiagent-backend"
echo "  - Check status: pm2 status"
echo "  - Monitor: pm2 monit"
echo "  - Run migrations: cd $DEPLOY_PATH/backend && node run-new-migrations.js"
echo ""
print_status "Setup script completed successfully!"
