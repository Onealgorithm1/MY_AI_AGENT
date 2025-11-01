-- ============================================
-- My AI Agent - Database Schema
-- PostgreSQL 14+
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE users (
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
    preferences JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================
-- Conversations Table
-- ============================================
CREATE TABLE conversations (
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

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_pinned ON conversations(pinned);
CREATE INDEX idx_conversations_archived ON conversations(archived);

-- ============================================
-- Messages Table
-- ============================================
CREATE TABLE messages (
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

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_role ON messages(role);

-- ============================================
-- Memory Facts Table (User Memory System)
-- ============================================
CREATE TABLE memory_facts (
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

CREATE INDEX idx_memory_facts_user_id ON memory_facts(user_id);
CREATE INDEX idx_memory_facts_category ON memory_facts(category);
CREATE INDEX idx_memory_facts_approved ON memory_facts(approved);

-- ============================================
-- Attachments Table
-- ============================================
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(200),
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
    analysis_result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_attachments_conversation_id ON attachments(conversation_id);
CREATE INDEX idx_attachments_message_id ON attachments(message_id);
CREATE INDEX idx_attachments_user_id ON attachments(user_id);
CREATE INDEX idx_attachments_status ON attachments(status);

-- ============================================
-- Error Logs Table
-- ============================================
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    request_url TEXT,
    request_method VARCHAR(10),
    status_code INTEGER,
    severity VARCHAR(50) DEFAULT 'error' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);

-- ============================================
-- Performance Metrics Table
-- ============================================
CREATE TABLE performance_metrics (
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

CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

-- ============================================
-- Feedback Table
-- ============================================
CREATE TABLE feedback (
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

CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_conversation_id ON feedback(conversation_id);
CREATE INDEX idx_feedback_message_id ON feedback(message_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);

-- ============================================
-- Usage Tracking Table (for rate limiting)
-- ============================================
CREATE TABLE usage_tracking (
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

CREATE INDEX idx_usage_tracking_user_date ON usage_tracking(user_id, date);

-- ============================================
-- Voice Sessions Table
-- ============================================
CREATE TABLE voice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'interrupted', 'error')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    tokens_used INTEGER DEFAULT 0,
    model VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX idx_voice_sessions_started_at ON voice_sessions(started_at DESC);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversations 
        SET message_count = message_count + 1,
            last_message_at = NEW.created_at
        WHERE id = NEW.conversation_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations 
        SET message_count = GREATEST(0, message_count - 1)
        WHERE id = OLD.conversation_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_conversation_message_count
AFTER INSERT OR DELETE ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_message_count();

-- ============================================
-- Initial Data / Seeds
-- ============================================

-- Create default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, full_name, role, email_verified) VALUES
('admin@myaiagent.com', '$2a$10$rGQ8VqKLxJ5K9xJ5K9xJ5eLG0KqV3wvJ5K9xJ5K9xJ5K9xJ5K9xJ5u', 'Admin User', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Views for Common Queries
-- ============================================

-- Active users view
CREATE OR REPLACE VIEW active_users AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.created_at,
    u.last_login_at,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(DISTINCT m.id) as message_count
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE u.is_active = true
GROUP BY u.id;

-- Daily usage stats view
CREATE OR REPLACE VIEW daily_usage_stats AS
SELECT 
    date,
    COUNT(DISTINCT user_id) as active_users,
    SUM(messages_sent) as total_messages,
    SUM(voice_minutes_used) as total_voice_minutes,
    SUM(tokens_consumed) as total_tokens
FROM usage_tracking
GROUP BY date
ORDER BY date DESC;

-- ============================================
-- Indexes for Performance
-- ============================================

-- Composite indexes for common queries
CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_memory_facts_user_referenced ON memory_facts(user_id, last_referenced_at DESC);

-- ============================================
-- Database Info
-- ============================================

COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON TABLE conversations IS 'Chat conversations between users and AI';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE memory_facts IS 'AI memory system - facts remembered about users';
COMMENT ON TABLE attachments IS 'Files uploaded by users (images, documents, etc)';
COMMENT ON TABLE error_logs IS 'System error tracking for debugging';
COMMENT ON TABLE performance_metrics IS 'Performance monitoring and analytics';
COMMENT ON TABLE feedback IS 'User feedback on AI responses';
COMMENT ON TABLE usage_tracking IS 'Daily usage limits and rate limiting';
COMMENT ON TABLE voice_sessions IS 'Real-time voice conversation sessions';

-- ============================================
-- End of Schema
-- ============================================

-- ============================================
-- API Secrets Management Table
-- Supports multiple API keys per service with labels and types
-- ============================================
CREATE TABLE api_secrets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name VARCHAR(100) NOT NULL,
    key_value TEXT NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    key_label VARCHAR(100),
    key_type VARCHAR(50) DEFAULT 'project' CHECK (key_type IN ('project', 'admin', 'other')),
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

CREATE INDEX idx_api_secrets_key_name ON api_secrets(key_name);
CREATE INDEX idx_api_secrets_service_name ON api_secrets(service_name);
CREATE INDEX idx_api_secrets_is_active ON api_secrets(is_active);
CREATE INDEX idx_api_secrets_key_type ON api_secrets(key_type);
CREATE INDEX idx_api_secrets_is_default ON api_secrets(is_default);

COMMENT ON TABLE api_secrets IS 'Encrypted storage for API keys and secrets with support for multiple keys per service';
COMMENT ON COLUMN api_secrets.key_label IS 'User-friendly label for the key (e.g., "Production Chat", "Development")';
COMMENT ON COLUMN api_secrets.key_type IS 'Type of key: project (sk-proj-), admin (sk-admin-), or other';
COMMENT ON COLUMN api_secrets.is_default IS 'Mark this key as the default for the service';

-- Trigger for updated_at
CREATE TRIGGER update_api_secrets_updated_at BEFORE UPDATE ON api_secrets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- UI Actions Table (AI Agent Action Execution)
-- ============================================
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

CREATE INDEX idx_ui_actions_user_id ON ui_actions(user_id);
CREATE INDEX idx_ui_actions_executed_at ON ui_actions(executed_at DESC);
CREATE INDEX idx_ui_actions_action_type ON ui_actions(action_type);

COMMENT ON TABLE ui_actions IS 'Tracks AI agent UI action executions for audit and debugging';

-- ============================================
-- User Events Table (Bidirectional Event System)
-- ============================================
CREATE TABLE IF NOT EXISTS user_events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_created_at ON user_events(created_at DESC);
CREATE INDEX idx_user_events_event_type ON user_events(event_type);

COMMENT ON TABLE user_events IS 'Tracks user interactions and events for AI context awareness';

