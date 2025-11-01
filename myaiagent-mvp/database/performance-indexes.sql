-- ============================================
-- Performance Optimization Indexes
-- Additional indexes for frequently queried patterns
-- ============================================

-- Optimize error log queries (created_at + resolved filter)
CREATE INDEX IF NOT EXISTS idx_error_logs_created_resolved 
ON error_logs(created_at DESC, resolved) 
WHERE resolved = false;

-- Optimize memory facts approved queries
CREATE INDEX IF NOT EXISTS idx_memory_facts_user_approved_referenced 
ON memory_facts(user_id, approved, last_referenced_at DESC) 
WHERE approved = true;

-- Optimize conversations listing with pinned+archived filter
CREATE INDEX IF NOT EXISTS idx_conversations_user_archived_pinned_updated 
ON conversations(user_id, archived, pinned DESC, updated_at DESC);

-- Optimize message history queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_desc 
ON messages(conversation_id, created_at DESC);

-- Optimize user last_login queries for active users
CREATE INDEX IF NOT EXISTS idx_users_last_login_active 
ON users(last_login_at DESC) 
WHERE is_active = true;

-- Optimize API secrets lookup by service and type
CREATE INDEX IF NOT EXISTS idx_api_secrets_service_active_default_type 
ON api_secrets(service_name, is_active, is_default, key_type) 
WHERE is_active = true;

-- Optimize UI actions history
CREATE INDEX IF NOT EXISTS idx_ui_actions_user_executed_desc 
ON ui_actions(user_id, executed_at DESC);

-- Optimize performance metrics queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_endpoint 
ON performance_metrics(created_at DESC, endpoint);

-- Add BIST index for JSONB metadata searches if needed
CREATE INDEX IF NOT EXISTS idx_conversations_metadata_gin 
ON conversations USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin 
ON messages USING GIN (metadata);

-- Vacuum and analyze to update statistics
VACUUM ANALYZE users;
VACUUM ANALYZE conversations;
VACUUM ANALYZE messages;
VACUUM ANALYZE memory_facts;
VACUUM ANALYZE usage_tracking;
VACUUM ANALYZE error_logs;
VACUUM ANALYZE performance_metrics;
VACUUM ANALYZE api_secrets;
VACUUM ANALYZE ui_actions;

-- Display index statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
