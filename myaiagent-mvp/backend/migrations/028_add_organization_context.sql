-- Add Organization Context to Existing Tables
-- Ensures all user data is properly isolated by organization

-- ============================================
-- Add organization_id to conversations
-- ============================================
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);

-- ============================================
-- Add organization_id to messages
-- ============================================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(organization_id);

-- ============================================
-- Add organization_id to memory_facts
-- ============================================
ALTER TABLE memory_facts ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_memory_facts_org ON memory_facts(organization_id);

-- ============================================
-- Add organization_id to attachments
-- ============================================
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_attachments_org ON attachments(organization_id);

-- ============================================
-- Add organization_id to user_preferences
-- ============================================
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_preferences_org ON user_preferences(organization_id);

-- ============================================
-- Add organization_id to search_history
-- ============================================
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_search_history_org ON search_history(organization_id);

-- ============================================
-- Add organization_id to samgov_opportunities_cache
-- ============================================
ALTER TABLE samgov_opportunities_cache ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_samgov_cache_org ON samgov_opportunities_cache(organization_id);

-- ============================================
-- Add organization_id to opportunities
-- ============================================
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_opportunities_org ON opportunities(organization_id);

-- ============================================
-- Add organization_id to user_ai_agents
-- ============================================
ALTER TABLE user_ai_agents ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_ai_agents_org ON user_ai_agents(organization_id);

-- ============================================
-- Add organization_id to feedback
-- ============================================
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_feedback_org ON feedback(organization_id);

-- ============================================
-- Add organization_id to usage_tracking
-- ============================================
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org ON usage_tracking(organization_id);

-- ============================================
-- Add organization_id to error_logs
-- ============================================
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_error_logs_org ON error_logs(organization_id);

-- ============================================
-- Add organization_id to performance_metrics
-- ============================================
ALTER TABLE performance_metrics ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_performance_metrics_org ON performance_metrics(organization_id);
