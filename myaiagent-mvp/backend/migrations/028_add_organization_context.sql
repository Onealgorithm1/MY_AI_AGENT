-- Add Organization Context to Existing Tables
-- This migration adds organization_id to tables that need organization-based data isolation

-- ===========================================
-- Conversations - Add organization context
-- ===========================================
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_user ON conversations(organization_id, user_id);

-- ===========================================
-- Messages - Add organization context
-- ===========================================
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(organization_id);

-- ===========================================
-- Memory Facts - Add organization context
-- ===========================================
ALTER TABLE memory_facts 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_memory_org ON memory_facts(organization_id);

-- ===========================================
-- User Preferences - Add organization context
-- ===========================================
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_preferences_org ON user_preferences(organization_id);

-- ===========================================
-- Search History - Add organization context
-- ===========================================
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_search_history_org ON search_history(organization_id);

-- ===========================================
-- SAM.gov Cache - Add organization context
-- ===========================================
ALTER TABLE samgov_opportunities_cache
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_samgov_cache_org ON samgov_opportunities_cache(organization_id);

-- ===========================================
-- Opportunities - Add organization context
-- ===========================================
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_opportunities_org ON opportunities(organization_id);

-- ===========================================
-- AI Agents - Add organization context
-- ===========================================
ALTER TABLE user_ai_agents
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_ai_agents_org ON user_ai_agents(organization_id);

-- ===========================================
-- Feedback - Add organization context
-- ===========================================
ALTER TABLE feedback
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_feedback_org ON feedback(organization_id);

-- ===========================================
-- Attachments - Add organization context
-- ===========================================
ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_attachments_org ON attachments(organization_id);

-- ===========================================
-- Usage Tracking - Add organization context
-- ===========================================
ALTER TABLE usage_tracking
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_usage_tracking_org ON usage_tracking(organization_id);

-- ===========================================
-- Audit Logs - Add organization context (if table exists)
-- ===========================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs') THEN
    ALTER TABLE error_logs
    ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_error_logs_org ON error_logs(organization_id);
  END IF;
END
$$;
