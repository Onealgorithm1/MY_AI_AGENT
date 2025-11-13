#!/bin/bash
# Rebuild frontend with proper environment variables and deploy

set -e  # Exit on any error

echo "========================================="
echo "  Frontend Rebuild & Deploy Script"
echo "========================================="
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")/myaiagent-mvp/frontend" || exit 1

# Show current environment settings
echo "📋 Current Production Environment:"
echo "-----------------------------------"
cat .env.production
echo ""

# Confirm before proceeding
read -p "Continue with rebuild? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

# Clean old build
echo "🧹 Cleaning old build..."
rm -rf dist/
echo "✅ Old build removed"
echo ""

# Build frontend
echo "🔨 Building frontend with production environment..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Check errors above."
    exit 1
fi
echo "✅ Build successful"
echo ""

# Verify VITE_ENABLE_ENHANCED_STT is in build
echo "🔍 Verifying VITE_ENABLE_ENHANCED_STT in build..."
if grep -rq "VITE_ENABLE_ENHANCED_STT" dist/assets/ 2>/dev/null; then
    echo "✅ VITE_ENABLE_ENHANCED_STT found in build"
else
    echo "⚠️  WARNING: VITE_ENABLE_ENHANCED_STT not found in build!"
    echo "This might be expected if it's optimized out, but verify manually"
fi
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    SUDO=""
else
    SUDO="sudo"
fi

# Deploy to production
echo "🚀 Deploying to /var/www/html..."
$SUDO rm -rf /var/www/html/*
$SUDO cp -r dist/* /var/www/html/
$SUDO chown -R www-data:www-data /var/www/html
$SUDO chmod -R 755 /var/www/html
echo "✅ Deployed successfully"
echo ""

# Show deployment info
echo "========================================="
echo "  ✅ Deployment Complete!"
echo "========================================="
echo ""
echo "📁 Build size:"
du -sh dist/
echo ""
echo "📂 Deployed files:"
ls -lh /var/www/html/ | head -10
echo ""
echo "🔄 Next Steps:"
echo "   1. Clear your browser cache (Ctrl+Shift+R)"
echo "   2. Reload the application"
echo "   3. Check for 'Real-time' badge when using voice input"
echo "   4. Verify console shows: 'WebSocket STT connected'"
echo ""
echo "💡 Troubleshooting:"
echo "   - If still using Standard STT, check browser console"
echo "   - Look for WebSocket connection errors"
echo "   - Verify backend is running: sudo systemctl status myaiagent-backend"
echo ""
