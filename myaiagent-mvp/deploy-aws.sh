#!/bin/bash

# ===========================================
# MY AI AGENT - AWS EC2 DEPLOYMENT SCRIPT
# ===========================================
# Run this script on your AWS EC2 instance after cloning from GitHub

set -e  # Exit on error

echo "🚀 Starting My AI Agent deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Run as ubuntu user."
    exit 1
fi

# Detect project root (script is in myaiagent-mvp/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

print_info "Project detected at: $PROJECT_ROOT"
print_info "Backend: $BACKEND_DIR"
print_info "Frontend: $FRONTEND_DIR"

# Update system
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# Install Node.js using official repository (system-wide, survives reboots)
print_info "Installing Node.js from NodeSource repository..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js installed: $(node -v)"
else
    print_success "Node.js already installed: $(node -v)"
fi

# Install PostgreSQL
print_info "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
print_success "PostgreSQL installed"

# Configure PostgreSQL
print_info "Setting up database..."
sudo -u postgres psql <<EOF
CREATE DATABASE myaiagent;
CREATE USER myaiagent_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE myaiagent TO myaiagent_user;
\c myaiagent
GRANT ALL ON SCHEMA public TO myaiagent_user;
EOF
print_success "Database created"

# Install PM2 (Process Manager)
print_info "Installing PM2..."
sudo npm install -g pm2
print_success "PM2 installed"

# Install Nginx
print_info "Installing Nginx..."
sudo apt install -y nginx
print_success "Nginx installed"

# Install dependencies
print_info "Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install
print_success "Backend dependencies installed"

print_info "Installing frontend dependencies and building..."
cd "$FRONTEND_DIR"
npm install
npm run build
print_success "Frontend built successfully"

# Setup environment file
print_info "Setting up environment configuration..."
cd "$BACKEND_DIR"
if [ ! -f .env ]; then
    cp .env.example .env
    print_info "Created .env file. IMPORTANT: Edit $BACKEND_DIR/.env with your secrets!"
    print_info "Generate secrets with: node -e \"console.log(require('crypto').randomBytes(64).toString('base64'))\""
else
    print_success ".env file already exists"
fi

# Run database migrations/setup if needed
print_info "Setting up database schema..."
npm run setup-db || print_info "No setup script found, skipping..."

# Start backend with PM2
print_info "Starting backend with PM2..."
cd "$BACKEND_DIR"
pm2 delete myaiagent-backend 2>/dev/null || true
pm2 start npm --name "myaiagent-backend" -- start
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
print_success "Backend started with PM2"

# Copy frontend build to Nginx directory
print_info "Setting up frontend files..."
sudo mkdir -p /var/www/myaiagent
sudo cp -r "$FRONTEND_DIR/dist/"* /var/www/myaiagent/
sudo chown -R www-data:www-data /var/www/myaiagent
print_success "Frontend files copied"

# Configure Nginx
print_info "Configuring Nginx..."
sudo cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/myaiagent
sudo ln -sf /etc/nginx/sites-available/myaiagent /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
print_success "Nginx configured"

print_success "==============================================="
print_success "🎉 Deployment complete!"
print_success "==============================================="
print_info "Next steps:"
print_info "1. Edit .env file: nano $BACKEND_DIR/.env"
print_info "2. Add your API keys and secrets"
print_info "3. Update database password in .env"
print_info "4. Restart backend: pm2 restart myaiagent-backend"
print_info "5. For SSL/HTTPS: sudo certbot --nginx -d your-domain.com"
print_info ""
print_info "Your app should be accessible at: http://$(curl -s ifconfig.me)"
print_info ""
print_info "Useful commands:"
print_info "  PM2 status: pm2 status"
print_info "  Backend logs: pm2 logs myaiagent-backend"
print_info "  Nginx logs: sudo tail -f /var/log/nginx/error.log"
print_info "  Restart all: pm2 restart myaiagent-backend && sudo systemctl restart nginx"
