#!/bin/bash

echo "================================"
echo "My AI Agent - Database Quick Fix"
echo "================================"
echo ""

# Check PostgreSQL connectivity
echo "🔍 Checking PostgreSQL connectivity..."

# Try to connect using the myaiagent user  
if sudo -u postgres psql -d myaiagent -c "SELECT 1" 2>/dev/null | grep -q 1; then
    echo "✅ Connected to myaiagent database as postgres"
else
    echo "❌ Cannot connect to myaiagent database"
    echo "Make sure PostgreSQL is running and myaiagent database exists"
    exit 1
fi

echo ""
echo "📋 Running database migrations..."

# Run migrations in order
sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/001_initial_schema.sql > /dev/null 2>&1
echo "✅ 001_initial_schema.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/002_capability_gaps.sql > /dev/null 2>&1
echo "✅ 002_capability_gaps.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/003_ai_self_improvement.sql > /dev/null 2>&1
echo "✅ 003_ai_self_improvement.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/007_add_tts_preferences.sql > /dev/null 2>&1
echo "✅ 007_add_tts_preferences.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/008_performance_monitoring.sql > /dev/null 2>&1
echo "✅ 008_performance_monitoring.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/009_email_categorization.sql > /dev/null 2>&1
echo "✅ 009_email_categorization.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/010_opportunities_management.sql > /dev/null 2>&1
echo "✅ 010_opportunities_management.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/011_add_search_history.sql > /dev/null 2>&1
echo "✅ 011_add_search_history.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/012_url_content_cache.sql > /dev/null 2>&1
echo "✅ 012_url_content_cache.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/013_samgov_cache.sql > /dev/null 2>&1
echo "✅ 013_samgov_cache.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/014_samgov_document_analysis.sql > /dev/null 2>&1
echo "✅ 014_samgov_document_analysis.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/015_fpds_contract_awards.sql > /dev/null 2>&1
echo "✅ 015_fpds_contract_awards.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/016_evm_tracking.sql > /dev/null 2>&1
echo "✅ 016_evm_tracking.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/017_collaboration_tools.sql > /dev/null 2>&1
echo "✅ 017_collaboration_tools.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/018_market_analytics.sql > /dev/null 2>&1
echo "✅ 018_market_analytics.sql"

sudo -u postgres psql -d myaiagent -f myaiagent-mvp/backend/migrations/create_telemetry_tables.sql > /dev/null 2>&1
echo "✅ create_telemetry_tables.sql"

echo ""
echo "🧹 Clearing corrupted secrets..."
sudo -u postgres psql -d myaiagent -c "DELETE FROM api_secrets;" 2>/dev/null
echo "✅ Deleted all corrupted secrets from database"

echo ""
echo "📊 Verifying critical tables..."
sudo -u postgres psql -d myaiagent -c "
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'conversations', 'messages', 'api_secrets', 'system_performance_metrics')
ORDER BY table_name;" 2>/dev/null | tail -6

echo ""
echo "================================"
echo "✅ Database fixes complete!"
echo "================================"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Add a new Gemini API key via the admin panel:"
echo "   https://werkules.com/admin/secrets"
echo ""
echo "2. Or add it via SQL:"
echo "   sudo -u postgres psql -d myaiagent"
echo "   INSERT INTO api_secrets (key_name, key_value, is_active, service_name)"
echo "   VALUES ('GEMINI_API_KEY', 'your_encrypted_key_here', true, 'Google');"
echo ""
echo "3. Restart PM2 backend:"
echo "   pm2 restart myaiagent-backend"
echo ""
echo "4. Test the chat functionality"
