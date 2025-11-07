#!/bin/bash
# ============================================
# Werkules.com - Rollback Script
# ============================================
# Rolls back to previous deployment

set -e

APP_DIR="/home/ubuntu/MY_AI_AGENT"
BACKUP_DIR="$APP_DIR/backups"

echo "🔙 Rolling back to previous version..."

# Find latest backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No backups found!"
    exit 1
fi

echo "Found backup: $LATEST_BACKUP"
echo "Are you sure you want to rollback? (yes/no)"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Stop application
echo "Stopping application..."
if command -v pm2 &> /dev/null; then
    pm2 stop all
elif systemctl is-active --quiet werkules; then
    sudo systemctl stop werkules
else
    pkill -f "node.*server.js" || true
fi

# Restore backup
echo "Restoring backup..."
rm -rf "$APP_DIR"
cp -r "$BACKUP_DIR/$LATEST_BACKUP/MY_AI_AGENT" "$(dirname $APP_DIR)/"

# Restart application
echo "Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart all
elif systemctl is-active --quiet werkules; then
    sudo systemctl restart werkules
else
    cd "$APP_DIR/myaiagent-mvp/backend"
    nohup node src/server.js > /tmp/werkules.log 2>&1 &
fi

echo "✅ Rollback complete!"
