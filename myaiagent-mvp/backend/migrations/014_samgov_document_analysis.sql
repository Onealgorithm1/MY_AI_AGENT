-- Migration 014: SAM.gov Document Analysis
-- Stores fetched and analyzed documents from SAM.gov opportunities

CREATE TABLE IF NOT EXISTS samgov_documents (
  id SERIAL PRIMARY KEY,
  opportunity_cache_id INTEGER REFERENCES samgov_opportunities_cache(id) ON DELETE CASCADE,
  notice_id VARCHAR(255) NOT NULL,
  document_url TEXT NOT NULL,
  document_type VARCHAR(100), -- pdf, docx, html, etc.
  file_name VARCHAR(500),
  file_size BIGINT, -- in bytes

  -- Extracted content
  raw_text TEXT,
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- AI Analysis
  analyzed BOOLEAN DEFAULT FALSE,
  analysis_completed_at TIMESTAMP,

  -- Analyzed content (structured JSON)
  key_requirements JSONB, -- extracted requirements
  evaluation_criteria JSONB, -- scoring criteria
  deadlines JSONB, -- important dates
  technical_specifications JSONB, -- technical details
  contact_info JSONB, -- extracted contacts
  pricing_info JSONB, -- budget/pricing details

  -- AI-generated summaries
  executive_summary TEXT,
  requirements_summary TEXT,
  technical_summary TEXT,
  compliance_requirements TEXT,
  risk_assessment TEXT,
  bid_recommendation TEXT, -- AI recommendation: bid/no-bid with reasoning
  win_probability DECIMAL(5,2), -- 0-100 estimated win probability

  -- Metadata
  fetch_status VARCHAR(50) DEFAULT 'pending', -- pending, fetched, failed, analyzing, analyzed
  fetch_error TEXT,
  fetch_attempts INTEGER DEFAULT 0,
  last_fetch_attempt TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(opportunity_cache_id, document_url)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_samgov_documents_notice_id ON samgov_documents(notice_id);
CREATE INDEX IF NOT EXISTS idx_samgov_documents_status ON samgov_documents(fetch_status);
CREATE INDEX IF NOT EXISTS idx_samgov_documents_analyzed ON samgov_documents(analyzed);
CREATE INDEX IF NOT EXISTS idx_samgov_documents_opportunity ON samgov_documents(opportunity_cache_id);

-- Table for tracking document analysis jobs
CREATE TABLE IF NOT EXISTS samgov_document_analysis_queue (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES samgov_documents(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 5, -- 1-10, higher = more urgent
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON samgov_document_analysis_queue(status, priority DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_samgov_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER samgov_documents_updated_at
  BEFORE UPDATE ON samgov_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_samgov_documents_updated_at();

CREATE TRIGGER samgov_analysis_queue_updated_at
  BEFORE UPDATE ON samgov_document_analysis_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_samgov_documents_updated_at();
