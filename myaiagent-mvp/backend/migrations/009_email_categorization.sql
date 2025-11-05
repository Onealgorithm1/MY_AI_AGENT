-- Email Categorization System
-- Enables intelligent categorization, tagging, and prioritization of emails
-- Provides deep contextual understanding of email content for AI

-- Table 1: Email Metadata with AI-Generated Tags and Analysis
CREATE TABLE IF NOT EXISTS email_metadata (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Gmail identifiers
  gmail_message_id VARCHAR(255) NOT NULL,
  thread_id VARCHAR(255),
  
  -- Email basics
  subject TEXT,
  sender VARCHAR(500),
  recipient VARCHAR(500),
  email_date TIMESTAMP,
  
  -- AI-generated insights
  tags JSONB DEFAULT '[]'::jsonb,
  sentiment VARCHAR(50) CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  urgency_level VARCHAR(50) CHECK (urgency_level IN ('critical', 'high', 'medium', 'low')),
  action_items JSONB DEFAULT '[]'::jsonb,
  
  -- Categorization details
  categories TEXT[],
  keywords TEXT[],
  entities JSONB DEFAULT '{}'::jsonb,
  
  -- Analysis metadata
  analyzed_at TIMESTAMP,
  analysis_model VARCHAR(100),
  confidence_score DECIMAL(3,2),
  
  -- Processing status
  status VARCHAR(50) CHECK (status IN ('pending', 'processing', 'analyzed', 'failed')) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one record per email per user
  UNIQUE(user_id, gmail_message_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_email_metadata_user ON email_metadata(user_id);
CREATE INDEX idx_email_metadata_urgency ON email_metadata(urgency_level);
CREATE INDEX idx_email_metadata_sentiment ON email_metadata(sentiment);
CREATE INDEX idx_email_metadata_analyzed ON email_metadata(analyzed_at DESC);
CREATE INDEX idx_email_metadata_status ON email_metadata(status);
CREATE INDEX idx_email_metadata_tags ON email_metadata USING gin(tags);
CREATE INDEX idx_email_metadata_categories ON email_metadata USING gin(categories);
CREATE INDEX idx_email_metadata_thread ON email_metadata(thread_id);

-- Table 2: Email Processing Queue (for async background processing)
CREATE TABLE IF NOT EXISTS email_processing_queue (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id VARCHAR(255) NOT NULL,
  
  -- Email content for processing
  subject TEXT,
  sender VARCHAR(500),
  body_preview TEXT,
  
  -- Queue management
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status VARCHAR(50) CHECK (status IN ('queued', 'processing', 'completed', 'failed')) DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Timestamps
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  
  -- Error tracking
  last_error TEXT,
  
  UNIQUE(user_id, gmail_message_id)
);

CREATE INDEX idx_email_queue_status ON email_processing_queue(status);
CREATE INDEX idx_email_queue_priority ON email_processing_queue(priority DESC, queued_at ASC);
CREATE INDEX idx_email_queue_retry ON email_processing_queue(next_retry_at) WHERE status = 'failed';
CREATE INDEX idx_email_queue_user ON email_processing_queue(user_id);

-- Table 3: Email Tag Dictionary (for tag standardization and learning)
CREATE TABLE IF NOT EXISTS email_tag_dictionary (
  id SERIAL PRIMARY KEY,
  tag_name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(100),
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE INDEX idx_tag_dictionary_category ON email_tag_dictionary(category);
CREATE INDEX idx_tag_dictionary_usage ON email_tag_dictionary(usage_count DESC);

-- Add comments for documentation
COMMENT ON TABLE email_metadata IS 'Stores AI-analyzed email metadata with tags, sentiment, urgency, and action items';
COMMENT ON TABLE email_processing_queue IS 'Async queue for background email categorization processing';
COMMENT ON TABLE email_tag_dictionary IS 'Dictionary of standardized email tags with usage tracking';

COMMENT ON COLUMN email_metadata.tags IS 'AI-generated tags as JSONB array, e.g., ["Urgent", "Project X", "Follow-up"]';
COMMENT ON COLUMN email_metadata.action_items IS 'Extracted action items as JSONB array with type and description';
COMMENT ON COLUMN email_metadata.entities IS 'Named entities extracted from email (people, organizations, dates, etc.)';
COMMENT ON COLUMN email_metadata.confidence_score IS 'AI confidence in the analysis (0.00 to 1.00)';
