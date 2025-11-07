#!/bin/bash
# ============================================
# Werkules.com - Health Check Script
# ============================================
# Verifies the application is running correctly

echo "🏥 Running health checks..."

# Check backend API
echo "Checking backend API..."
if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API is down"
    exit 1
fi

# Check database connection
echo "Checking database..."
if psql -U postgres -d myaiagent -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database is accessible"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Check frontend (if built)
if [ -d "/home/ubuntu/MY_AI_AGENT/myaiagent-mvp/frontend/dist" ]; then
    echo "✅ Frontend build exists"
else
    echo "⚠️  Frontend build not found"
fi

echo "✅ All health checks passed!"
exit 0
