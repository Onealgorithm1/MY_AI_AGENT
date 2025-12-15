-- Migration: Fix Type Mismatches in user_id columns
-- Problem: users.id is INTEGER (SERIAL) but many tables reference it as UUID
-- Solution: Convert all UUID user_id columns to INTEGER
-- Date: 2025-12-15

-- This migration handles the type mismatch between users.id (INTEGER) and UUID references
-- It converts all problematic UUID user_id columns to INTEGER

-- ============================================
-- Fix capability_gaps.user_id
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'capability_gaps' AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE capability_gaps 
    DROP CONSTRAINT IF EXISTS capability_gaps_user_id_fkey;
    
    ALTER TABLE capability_gaps 
    ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
    
    ALTER TABLE capability_gaps 
    ADD CONSTRAINT capability_gaps_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- Fix memory_facts.user_id and approved_by
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE memory_facts 
    DROP CONSTRAINT IF EXISTS memory_facts_user_id_fkey;
    
    ALTER TABLE memory_facts 
    ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
    
    ALTER TABLE memory_facts 
    ADD CONSTRAINT memory_facts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_facts' AND column_name = 'approved_by' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE memory_facts 
    DROP CONSTRAINT IF EXISTS memory_facts_approved_by_fkey;
    
    ALTER TABLE memory_facts 
    ALTER COLUMN approved_by TYPE INTEGER USING CAST(approved_by AS INTEGER);
    
    ALTER TABLE memory_facts 
    ADD CONSTRAINT memory_facts_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- Fix search_history.user_id
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_history' AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE search_history 
    DROP CONSTRAINT IF EXISTS search_history_user_id_fkey;
    
    ALTER TABLE search_history 
    ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
    
    ALTER TABLE search_history 
    ADD CONSTRAINT search_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- Fix activity_logs.user_id
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_logs' AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE activity_logs 
    DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
    
    ALTER TABLE activity_logs 
    ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
    
    ALTER TABLE activity_logs 
    ADD CONSTRAINT activity_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_logs' AND column_name = 'updated_by' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE activity_logs 
    DROP CONSTRAINT IF EXISTS activity_logs_updated_by_fkey;
    
    ALTER TABLE activity_logs 
    ALTER COLUMN updated_by TYPE INTEGER USING CAST(updated_by AS INTEGER);
    
    ALTER TABLE activity_logs 
    ADD CONSTRAINT activity_logs_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- Fix system_config.updated_by
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_config' AND column_name = 'updated_by' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE system_config 
    DROP CONSTRAINT IF EXISTS system_config_updated_by_fkey;
    
    ALTER TABLE system_config 
    ALTER COLUMN updated_by TYPE INTEGER USING CAST(updated_by AS INTEGER);
    
    ALTER TABLE system_config 
    ADD CONSTRAINT system_config_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- Fix url_cache.user_id
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'url_cache'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'url_cache' AND column_name = 'user_id' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE url_cache 
      DROP CONSTRAINT IF EXISTS url_cache_user_id_fkey;
      
      ALTER TABLE url_cache 
      ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
      
      ALTER TABLE url_cache 
      ADD CONSTRAINT url_cache_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================
-- Fix url_summaries.user_id and conversation_id
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'url_summaries'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'url_summaries' AND column_name = 'user_id' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE url_summaries 
      DROP CONSTRAINT IF EXISTS url_summaries_user_id_fkey;
      
      ALTER TABLE url_summaries 
      ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
      
      ALTER TABLE url_summaries 
      ADD CONSTRAINT url_summaries_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================
-- Fix email_templates.user_id
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'email_templates'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'email_templates' AND column_name = 'user_id' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE email_templates 
      DROP CONSTRAINT IF EXISTS email_templates_user_id_fkey;
      
      ALTER TABLE email_templates 
      ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
      
      ALTER TABLE email_templates 
      ADD CONSTRAINT email_templates_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================
-- Fix categorized_emails.user_id
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'categorized_emails'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'categorized_emails' AND column_name = 'user_id' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE categorized_emails 
      DROP CONSTRAINT IF EXISTS categorized_emails_user_id_fkey;
      
      ALTER TABLE categorized_emails 
      ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
      
      ALTER TABLE categorized_emails 
      ADD CONSTRAINT categorized_emails_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================
-- Fix email_categorization.user_id
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'email_categorization'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'email_categorization' AND column_name = 'user_id' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE email_categorization 
      DROP CONSTRAINT IF EXISTS email_categorization_user_id_fkey;
      
      ALTER TABLE email_categorization 
      ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
      
      ALTER TABLE email_categorization 
      ADD CONSTRAINT email_categorization_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================
-- Fix samgov_opportunity_cache.created_by and searched_by
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'samgov_opportunity_cache'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'samgov_opportunity_cache' AND column_name = 'created_by' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE samgov_opportunity_cache 
      DROP CONSTRAINT IF EXISTS samgov_opportunity_cache_created_by_fkey;
      
      ALTER TABLE samgov_opportunity_cache 
      ALTER COLUMN created_by TYPE INTEGER USING CAST(created_by AS INTEGER);
      
      ALTER TABLE samgov_opportunity_cache 
      ADD CONSTRAINT samgov_opportunity_cache_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'samgov_opportunity_cache' AND column_name = 'searched_by' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE samgov_opportunity_cache 
      DROP CONSTRAINT IF EXISTS samgov_opportunity_cache_searched_by_fkey;
      
      ALTER TABLE samgov_opportunity_cache 
      ALTER COLUMN searched_by TYPE INTEGER USING CAST(searched_by AS INTEGER);
      
      ALTER TABLE samgov_opportunity_cache 
      ADD CONSTRAINT samgov_opportunity_cache_searched_by_fkey 
      FOREIGN KEY (searched_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================
-- Fix ai_self_improvement_feedback.user_id
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'ai_self_improvement_feedback'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ai_self_improvement_feedback' AND column_name = 'user_id' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE ai_self_improvement_feedback 
      DROP CONSTRAINT IF EXISTS ai_self_improvement_feedback_user_id_fkey;
      
      ALTER TABLE ai_self_improvement_feedback 
      ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
      
      ALTER TABLE ai_self_improvement_feedback 
      ADD CONSTRAINT ai_self_improvement_feedback_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================
-- Fix opportunities.assigned_to and created_by
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'opportunities'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'opportunities' AND column_name = 'assigned_to' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE opportunities 
      DROP CONSTRAINT IF EXISTS opportunities_assigned_to_fkey;
      
      ALTER TABLE opportunities 
      ALTER COLUMN assigned_to TYPE INTEGER USING CAST(assigned_to AS INTEGER);
      
      ALTER TABLE opportunities 
      ADD CONSTRAINT opportunities_assigned_to_fkey 
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'opportunities' AND column_name = 'created_by' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE opportunities 
      DROP CONSTRAINT IF EXISTS opportunities_created_by_fkey;
      
      ALTER TABLE opportunities 
      ALTER COLUMN created_by TYPE INTEGER USING CAST(created_by AS INTEGER);
      
      ALTER TABLE opportunities 
      ADD CONSTRAINT opportunities_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================
-- Fix opportunity_activity.user_id
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'opportunity_activity'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'opportunity_activity' AND column_name = 'user_id' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE opportunity_activity 
      DROP CONSTRAINT IF EXISTS opportunity_activity_user_id_fkey;
      
      ALTER TABLE opportunity_activity 
      ALTER COLUMN user_id TYPE INTEGER USING CAST(user_id AS INTEGER);
      
      ALTER TABLE opportunity_activity 
      ADD CONSTRAINT opportunity_activity_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Note: Additional tables in migrations 016, 017, 018 with UUID user_id references
-- will need similar fixes, but they reference tables that may not exist yet.
-- This migration focuses on the core tables that cause immediate foreign key errors.
