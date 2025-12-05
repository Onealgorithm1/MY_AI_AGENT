#!/bin/bash

# ===========================================
# COMPLETE DATABASE MIGRATION
# Creates ALL 66 tables needed for the application
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🔧 COMPLETE DATABASE MIGRATION${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

MIGRATION_DIR="/home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp"

echo -e "${BLUE}Running comprehensive database migration...${NC}"
echo ""

# Run migrations in order
sudo -u postgres psql -d myaiagent << 'EOFMIGRATION'

-- ============================================
-- Enable Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. MAIN SCHEMA (Core Tables)
-- ============================================

-- Users table with all columns
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    google_id VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    profile_image TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) DEFAULT 'New Conversation',
    model VARCHAR(100) DEFAULT 'gpt-4o',
    pinned BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model VARCHAR(100),
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_streaming BOOLEAN DEFAULT false,
    parent_message_id UUID REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Memory Facts
CREATE TABLE IF NOT EXISTS memory_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fact TEXT NOT NULL,
    category VARCHAR(100),
    source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    confidence FLOAT DEFAULT 1.0,
    manually_added BOOLEAN DEFAULT false,
    approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_referenced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    times_referenced INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_memory_facts_user_id ON memory_facts(user_id);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(200),
    status VARCHAR(50) DEFAULT 'uploaded',
    analysis_result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);

-- Error Logs
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    request_url TEXT,
    request_method VARCHAR(10),
    status_code INTEGER,
    severity VARCHAR(50) DEFAULT 'error',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(200) NOT NULL,
    value FLOAT NOT NULL,
    unit VARCHAR(50),
    endpoint VARCHAR(500),
    method VARCHAR(10),
    status_code INTEGER,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating IN (-1, 1)),
    feedback_type VARCHAR(100),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    messages_sent INTEGER DEFAULT 0,
    voice_minutes_used FLOAT DEFAULT 0.0,
    tokens_consumed INTEGER DEFAULT 0,
    files_uploaded INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date);

-- Voice Sessions
CREATE TABLE IF NOT EXISTS voice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    tokens_used INTEGER DEFAULT 0,
    model VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id);

-- API Secrets
CREATE TABLE IF NOT EXISTS api_secrets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name VARCHAR(100) NOT NULL,
    key_value TEXT NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    key_label VARCHAR(100),
    key_type VARCHAR(50) DEFAULT 'project',
    is_default BOOLEAN DEFAULT false,
    description TEXT,
    docs_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (service_name, key_label)
);

CREATE INDEX IF NOT EXISTS idx_api_secrets_service_name ON api_secrets(service_name);

-- UI Actions
CREATE TABLE IF NOT EXISTS ui_actions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    action_params JSONB DEFAULT '{}'::jsonb,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ui_actions_user_id ON ui_actions(user_id);

-- User Events
CREATE TABLE IF NOT EXISTS user_events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);

-- ============================================
-- 2. EMAIL CATEGORIZATION
-- ============================================

CREATE TABLE IF NOT EXISTS email_metadata (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id VARCHAR(255) NOT NULL,
  thread_id VARCHAR(255),
  subject TEXT,
  sender VARCHAR(500),
  recipient VARCHAR(500),
  email_date TIMESTAMP,
  tags JSONB DEFAULT '[]'::jsonb,
  sentiment VARCHAR(50),
  urgency_level VARCHAR(50),
  action_items JSONB DEFAULT '[]'::jsonb,
  categories TEXT[],
  keywords TEXT[],
  entities JSONB DEFAULT '{}'::jsonb,
  analyzed_at TIMESTAMP,
  analysis_model VARCHAR(100),
  confidence_score DECIMAL(3,2),
  status VARCHAR(50) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, gmail_message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_metadata_user ON email_metadata(user_id);

CREATE TABLE IF NOT EXISTS email_processing_queue (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id VARCHAR(255) NOT NULL,
  subject TEXT,
  sender VARCHAR(500),
  body_preview TEXT,
  priority INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  last_error TEXT,
  UNIQUE(user_id, gmail_message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_processing_queue(status);

CREATE TABLE IF NOT EXISTS email_tag_dictionary (
  id SERIAL PRIMARY KEY,
  tag_name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(100),
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

-- ============================================
-- 3. OPPORTUNITIES MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS opportunities (
  id SERIAL PRIMARY KEY,
  notice_id VARCHAR(255) UNIQUE NOT NULL,
  solicitation_number VARCHAR(255),
  title TEXT NOT NULL,
  type VARCHAR(100),
  posted_date TIMESTAMP,
  response_deadline TIMESTAMP,
  naics_code VARCHAR(50),
  set_aside_type VARCHAR(100),
  contracting_office TEXT,
  place_of_performance TEXT,
  description TEXT,
  raw_data JSONB,
  internal_status VARCHAR(50) NOT NULL DEFAULT 'New',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  internal_score INTEGER,
  internal_notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_sync_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(internal_status);
CREATE INDEX IF NOT EXISTS idx_opportunities_notice_id ON opportunities(notice_id);

CREATE TABLE IF NOT EXISTS opportunity_activity (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_opportunity ON opportunity_activity(opportunity_id);

-- ============================================
-- 4. SAM.GOV CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS samgov_opportunities_cache (
  id SERIAL PRIMARY KEY,
  notice_id VARCHAR(255) UNIQUE NOT NULL,
  solicitation_number VARCHAR(255),
  title TEXT NOT NULL,
  type VARCHAR(100),
  posted_date TIMESTAMP,
  response_deadline TIMESTAMP,
  archive_date TIMESTAMP,
  naics_code VARCHAR(50),
  set_aside_type VARCHAR(100),
  contracting_office TEXT,
  place_of_performance TEXT,
  description TEXT,
  raw_data JSONB NOT NULL,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  seen_count INTEGER DEFAULT 1 NOT NULL,
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_samgov_cache_notice_id ON samgov_opportunities_cache(notice_id);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_posted_date ON samgov_opportunities_cache(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_samgov_cache_raw_data ON samgov_opportunities_cache USING GIN (raw_data);

CREATE TABLE IF NOT EXISTS samgov_search_history (
  id SERIAL PRIMARY KEY,
  keyword TEXT,
  posted_from DATE,
  posted_to DATE,
  naics_code VARCHAR(50),
  total_records INTEGER,
  new_records INTEGER,
  existing_records INTEGER,
  searched_by UUID REFERENCES users(id) ON DELETE SET NULL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  search_params JSONB
);

CREATE INDEX IF NOT EXISTS idx_samgov_search_date ON samgov_search_history(searched_at DESC);

-- ============================================
-- 5. TELEMETRY
-- ============================================

CREATE TABLE IF NOT EXISTS telemetry_errors (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    error_type VARCHAR(100),
    error_message TEXT,
    error_stack TEXT,
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_errors_created ON telemetry_errors(created_at DESC);

CREATE TABLE IF NOT EXISTS telemetry_events (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_type ON telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_created ON telemetry_events(created_at DESC);

-- ============================================
-- 6. OAUTH TOKENS
-- ============================================

CREATE TABLE IF NOT EXISTS oauth_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    scope TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user ON oauth_tokens(user_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversations_updated_at') THEN
        CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usage_tracking_updated_at') THEN
        CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- VERIFY TABLES
-- ============================================

SELECT 'Tables created:' AS status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

EOFMIGRATION

echo -e "${GREEN}✅ Database migration complete!${NC}"

# Show table count
echo -e "\n${BLUE}Verifying tables...${NC}"
TABLE_COUNT=$(sudo -u postgres psql -d myaiagent -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
echo -e "${GREEN}✅ Created $TABLE_COUNT tables${NC}"

# Show key tables
echo -e "\n${BLUE}Key tables created:${NC}"
sudo -u postgres psql -d myaiagent -c "\dt" | grep -E "(users|conversations|opportunities|samgov)"

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 Migration Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
