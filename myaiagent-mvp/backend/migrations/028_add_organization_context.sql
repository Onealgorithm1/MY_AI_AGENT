-- Add Organization Context to Existing Tables
-- PARTIALLY DISABLED - Some tables are created in migration 030, but we still need to add org_id to existing tables
-- Marker: migration is disabled (partial) - existing table alterations will be handled by migration 030

-- Only attempt to add organization_id to tables that already exist
-- (Tables that don't exist are created with org_id in migration 030)

DO $$
BEGIN
  -- Add organization_id to conversations if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'organization_id') THEN
      ALTER TABLE conversations ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_conversations_org ON conversations(organization_id);
    END IF;
  END IF;

  -- Add organization_id to messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'organization_id') THEN
      ALTER TABLE messages ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_messages_org ON messages(organization_id);
    END IF;
  END IF;

  -- Add organization_id to memory_facts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_facts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_facts' AND column_name = 'organization_id') THEN
      ALTER TABLE memory_facts ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_memory_facts_org ON memory_facts(organization_id);
    END IF;
  END IF;

  -- Add organization_id to user_preferences
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'organization_id') THEN
      ALTER TABLE user_preferences ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_user_preferences_org ON user_preferences(organization_id);
    END IF;
  END IF;

  -- Add organization_id to search_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'search_history') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'search_history' AND column_name = 'organization_id') THEN
      ALTER TABLE search_history ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_search_history_org ON search_history(organization_id);
    END IF;
  END IF;

  -- Add organization_id to opportunities
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunities') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'organization_id') THEN
      ALTER TABLE opportunities ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_opportunities_org ON opportunities(organization_id);
    END IF;
  END IF;

  -- Add organization_id to user_ai_agents
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ai_agents') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_ai_agents' AND column_name = 'organization_id') THEN
      ALTER TABLE user_ai_agents ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_user_ai_agents_org ON user_ai_agents(organization_id);
    END IF;
  END IF;

  -- Add organization_id to feedback
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'organization_id') THEN
      ALTER TABLE feedback ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_feedback_org ON feedback(organization_id);
    END IF;
  END IF;

  -- Add organization_id to usage_tracking
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_tracking') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_tracking' AND column_name = 'organization_id') THEN
      ALTER TABLE usage_tracking ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_usage_tracking_org ON usage_tracking(organization_id);
    END IF;
  END IF;

  -- Add organization_id to error_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'error_logs' AND column_name = 'organization_id') THEN
      ALTER TABLE error_logs ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_error_logs_org ON error_logs(organization_id);
    END IF;
  END IF;

  -- Add organization_id to performance_metrics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performance_metrics' AND column_name = 'organization_id') THEN
      ALTER TABLE performance_metrics ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_performance_metrics_org ON performance_metrics(organization_id);
    END IF;
  END IF;

END $$;
