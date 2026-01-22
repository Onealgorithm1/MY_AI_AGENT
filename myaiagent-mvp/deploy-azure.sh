#!/bin/bash

# ===========================================
# MY AI AGENT - AZURE VM DEPLOYMENT SCRIPT
# ===========================================
# Run this script on your Azure Ubuntu VM after cloning from GitHub
# Recommended VM Image: Ubuntu Server 20.04 LTS or 22.04 LTS

set -e  # Exit on error

echo "🚀 Starting My AI Agent deployment on Azure..."

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
    print_error "Please do not run this script as root. Run as your standard azure user (e.g., azureuser)."
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

# Install Node.js using official repository
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
# Note: In Azure, if you use a managed database (Azure Database for PostgreSQL), you would skip this local setup
# and instead configure the connection string in your .env file.
# This setup assumes a self-contained VM like the EC2 setup.
print_info "Setting up local database..."
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
    
    # Generate random secrets for initial setup
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    
    print_info "Generated a random JWT_SECRET for you."
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
# We use the same nginx.conf as it is standard
sudo cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/myaiagent
sudo ln -sf /etc/nginx/sites-available/myaiagent /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
print_success "Nginx configured"

# Open Firewall (Azure NSG usually handles this, but UFW might be active on the VM)
print_info "Configuring UFW firewall for SSH, HTTP, HTTPS..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# sudo ufw enable # Uncomment if you want to enable UFW, but be careful not to lock yourself out

print_success "==============================================="
print_success "🎉 Azure Deployment complete!"
print_success "==============================================="
print_info "Next steps:"
print_info "1. Edit .env file: nano $BACKEND_DIR/.env"
print_info "   - Update DATABASE_URL if you changed the password"
print_info "   - Add OPENAI_API_KEY and Google Credentials"
print_info "2. Restart backend: pm2 restart myaiagent-backend"
print_info "3. Configure Azure Network Security Group (NSG) to allow Inbound Port 80 (HTTP) and 443 (HTTPS)"
print_info ""
print_info "Your app should be accessible at your VM's Public IP"
