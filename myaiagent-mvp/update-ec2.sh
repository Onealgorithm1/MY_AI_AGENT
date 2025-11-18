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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Run as ubuntu user."
    exit 1
fi

# Detect project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

print_info "Project root: $PROJECT_ROOT"
print_info "Backend: $BACKEND_DIR"
print_info "Frontend: $FRONTEND_DIR"

# Confirmation
print_warning "This will update your production deployment."
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Update cancelled."
    exit 0
fi

# Pull latest code from git
print_info "Pulling latest code from git..."
cd "$PROJECT_ROOT"
git fetch origin
git pull origin $(git rev-parse --abbrev-ref HEAD)
print_success "Code updated"

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

# Restart Nginx
print_info "Restarting Nginx..."
sudo systemctl restart nginx
print_success "Nginx restarted"

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
