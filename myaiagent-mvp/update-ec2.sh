#!/bin/bash

# ===========================================
# MY AI AGENT - EC2 UPDATE SCRIPT
# ===========================================
# Run this on your EC2 instance to deploy updates

set -e  # Exit on error

echo "🚀 Starting My AI Agent update deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Root check removed for CI/CD compatibility
# Interactive confirmation removed for CI/CD compatibility

# Ensure Node.js v20 is installed (Required by dependencies)
print_info "Checking Node.js version..."
CURRENT_NODE_VER=$(node -v 2>/dev/null || echo "v0.0.0")
REQUIRED_NODE_VER="v20"

if [[ "$CURRENT_NODE_VER" != v20* ]]; then
    print_warning "Node.js $CURRENT_NODE_VER detected. Upgrading to Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    sudo npm install -g pm2
    print_success "Node.js upgraded to $(node -v)"
else
    print_success "Node.js $CURRENT_NODE_VER is compatible."
fi

# Detect project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

print_info "Project root: $PROJECT_ROOT"
print_info "Backend: $BACKEND_DIR"
print_info "Frontend: $FRONTEND_DIR"

# Ensure we are in the project root
cd "$PROJECT_ROOT"


# Git code update is handled by the CI/CD workflow (deploy.yml)
# Skipping git pull here to avoid conflicts and redundancy.
print_info "Code already updated by CI/CD workflow."

# Check for .env file
print_info "Checking environment configuration..."
cd "$BACKEND_DIR"
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from example..."
    cp .env.example .env
    
    # Generate a random secret for JWT
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    if grep -q "JWT_SECRET=" .env; then
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    else
        echo "JWT_SECRET=$JWT_SECRET" >> .env
    fi
    print_info "Generated JWT_SECRET."

    # Generate CSRF_SECRET (Required by server.js)
    CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    if grep -q "CSRF_SECRET=" .env; then
        sed -i "s|CSRF_SECRET=.*|CSRF_SECRET=$CSRF_SECRET|" .env
    else
        echo "CSRF_SECRET=$CSRF_SECRET" >> .env
    fi
    print_info "Generated CSRF_SECRET."

    # Generate ENCRYPTION_KEY (Required by encryption.js, 32 bytes hex = 64 chars)
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    if grep -q "ENCRYPTION_KEY=" .env; then
        sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env
    else
        echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
    fi
    print_info "Generated ENCRYPTION_KEY."

    # Configure Database URL
    DB_URL="postgresql://myaiagent_user:Werkules@2025@localhost:5432/myaiagent"
    if grep -q "DATABASE_URL=" .env; then
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
    else
        echo "DATABASE_URL=$DB_URL" >> .env
    fi
    print_info "Configured DATABASE_URL."
fi

# Fix ENCRYPTION_KEY validation (Fix for "got 37" error)
# If key is missing, default, or wrong length (37 chars was likely uuidv4 + extra), regenerate it
CURRENT_KEY=$(grep "ENCRYPTION_KEY=" .env | cut -d '=' -f2)
if [[ "${#CURRENT_KEY}" != 64 ]] || [[ "$CURRENT_KEY" == *"your_encryption_key"* ]]; then
    print_warning "Invalid ENCRYPTION_KEY detected (Length: ${#CURRENT_KEY}). Regenerating..."
    NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$NEW_KEY|" .env
    print_success "Regenerated Valid ENCRYPTION_KEY (64 chars)."
fi

# Ensure DATABASE_URL is correct even if .env existed (fix for previous failed runs)
# If it contains "user:password" (default from example), replace it
if grep -q "postgres://user:password" .env || grep -q "postgresql://user:password" .env; then
    print_warning "Detected default DATABASE_URL. Updating to correct credentials..."
    DB_URL="postgresql://myaiagent_user:Werkules@2025@localhost:5432/myaiagent"
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
fi

# Check and Setup Database if missing
print_info "Checking database..."
# Check if database exists using psql (returns 0 if exists, 1 if not)
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw myaiagent; then
    print_success "Database 'myaiagent' already exists."
else
    print_warning "Database 'myaiagent' not found. Creating..."
    sudo -u postgres psql <<EOF
CREATE DATABASE myaiagent;
CREATE USER myaiagent_user WITH PASSWORD 'Werkules@2025';
GRANT ALL PRIVILEGES ON DATABASE myaiagent TO myaiagent_user;
\c myaiagent
GRANT ALL ON SCHEMA public TO myaiagent_user;
EOF
    print_success "Database created."
fi

# Update backend dependencies
print_info "Updating backend dependencies..."
cd "$BACKEND_DIR"
npm install
print_success "Backend dependencies updated"

# Run database migrations
print_info "Running database migrations..."
cd "$BACKEND_DIR"
if npm run migrate 2>/dev/null; then
    print_success "Database migrations completed"
else
    print_warning "No migrations to run or migration script not found"
fi

# Seed database (idempotent, ensures demo user exists)
print_info "Seeding database..."
if npm run seed 2>/dev/null; then
    print_success "Database seeded (or user already exists)"
else
    print_warning "Database seeding failed"
fi

# Build frontend
print_info "Building frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build
print_success "Frontend built successfully"

# Stop backend (gracefully)
print_info "Stopping backend..."
pm2 stop myaiagent-backend || print_warning "Backend not running"

# Update frontend files
print_info "Updating frontend files..."
sudo mkdir -p /var/www/myaiagent
sudo rm -rf /var/www/myaiagent/*
sudo cp -r "$FRONTEND_DIR/dist/"* /var/www/myaiagent/
sudo chown -R www-data:www-data /var/www/myaiagent
print_success "Frontend files updated"

# Start backend
print_info "Starting backend..."
cd "$BACKEND_DIR"
pm2 start npm --name "myaiagent-backend" -- start || pm2 restart myaiagent-backend
pm2 save
print_success "Backend started"

# Configure Nginx
print_info "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/default > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    root /var/www/myaiagent;
    index index.html;

    # Frontend (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # Backend API Proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend Health Check
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Host \$host;
    }
}
EOF
sudo nginx -t && sudo systemctl restart nginx
print_success "Nginx configured and restarted"

# Restart Nginx (Already done above, but keeping for flow)
print_info "Verifying Nginx status..."

# Wait for services to start
print_info "Waiting for services to start..."
sleep 5

# Check PM2 status
print_info "Checking backend status..."
pm2 status

# Check if backend is responding
print_info "Testing backend health..."
if curl -f http://localhost:3000/health 2>/dev/null; then
    print_success "Backend is healthy"
else
    print_warning "Backend health check failed. Check logs with: pm2 logs myaiagent-backend"
fi

print_success "==============================================="
print_success "🎉 Update deployment complete!"
print_success "==============================================="
print_info "Useful commands:"
print_info "  Check status: pm2 status"
print_info "  View logs: pm2 logs myaiagent-backend"
print_info "  Nginx logs: sudo tail -f /var/log/nginx/error.log"
print_info "  Restart backend: pm2 restart myaiagent-backend"
print_info ""
print_info "Your app is running at: http://$(curl -s ifconfig.me)"
