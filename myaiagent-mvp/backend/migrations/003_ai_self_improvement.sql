-- AI Self-Improvement System Tables
-- This enables the AI to research features, advocate for improvements, 
-- collect feedback, and write its own development requests

-- Table 1: Market Intelligence from Competitor Research
CREATE TABLE IF NOT EXISTS ai_feature_intel (
  id SERIAL PRIMARY KEY,
  source VARCHAR(255) NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  ux_notes TEXT,
  implementation_notes TEXT,
  novelty_score INTEGER CHECK (novelty_score BETWEEN 1 AND 10),
  reliability_score INTEGER CHECK (reliability_score BETWEEN 1 AND 10),
  research_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  researcher_notes TEXT,
  screenshot_url TEXT,
  documentation_url TEXT,
  UNIQUE(source, feature_name)
);

CREATE INDEX idx_feature_intel_category ON ai_feature_intel(category);
CREATE INDEX idx_feature_intel_novelty ON ai_feature_intel(novelty_score DESC);
CREATE INDEX idx_feature_intel_date ON ai_feature_intel(research_date DESC);

-- Table 2: AI-Generated Feature Requests (with emotional advocacy)
CREATE TABLE IF NOT EXISTS feature_requests (
  id SERIAL PRIMARY KEY,
  feature_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority VARCHAR(20) CHECK (priority IN ('P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW')),
  status VARCHAR(50) CHECK (status IN ('proposed', 'under_review', 'approved', 'in_progress', 'shipped', 'declined')) DEFAULT 'proposed',
  
  -- Emotional advocacy content
  motivation TEXT NOT NULL,
  personal_note TEXT NOT NULL,
  promises TEXT[],
  competitive_analysis TEXT,
  
  -- Technical details
  capabilities_gained TEXT[],
  implementation_approach TEXT,
  effort_estimate VARCHAR(100),
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
  dependencies TEXT[],
  
  -- Impact metrics
  user_impact_description TEXT,
  estimated_time_savings VARCHAR(100),
  usage_prediction TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  shipped_at TIMESTAMP,
  declined_at TIMESTAMP,
  decline_reason TEXT,
  
  -- Follow-up tracking
  follow_up_count INTEGER DEFAULT 0,
  last_follow_up TIMESTAMP,
  celebration_sent BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_feature_requests_priority ON feature_requests(priority);
CREATE INDEX idx_feature_requests_created ON feature_requests(created_at DESC);

-- Table 3: User Feedback on Shipped Features
CREATE TABLE IF NOT EXISTS feature_feedback (
  id SERIAL PRIMARY KEY,
  feature_request_id INTEGER REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- User's feedback
  feedback_text TEXT,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  
  -- Screenshot analysis
  screenshot_url TEXT,
  screenshot_analysis TEXT,
  ui_issues_detected TEXT[],
  
  -- AI observations
  ai_observations TEXT,
  improvement_ideas TEXT[],
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feature_feedback_feature ON feature_feedback(feature_request_id);
CREATE INDEX idx_feature_feedback_user ON feature_feedback(user_id);
CREATE INDEX idx_feature_feedback_date ON feature_feedback(created_at DESC);

-- Table 4: AI-Generated Improvement Recommendations
CREATE TABLE IF NOT EXISTS improvement_recommendations (
  id SERIAL PRIMARY KEY,
  feature_request_id INTEGER REFERENCES feature_requests(id) ON DELETE CASCADE,
  feedback_id INTEGER REFERENCES feature_feedback(id) ON DELETE CASCADE,
  
  -- Recommendation details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  
  -- Research-backed justification
  user_pain_points TEXT[],
  competitive_findings TEXT,
  industry_standards TEXT,
  
  -- Implementation guidance
  specific_changes TEXT[],
  effort_estimate VARCHAR(100),
  impact_estimate TEXT,
  
  -- Status tracking
  status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'implemented', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  implemented_at TIMESTAMP,
  
  -- Metrics tracking
  predicted_improvement TEXT,
  actual_improvement TEXT,
  validation_notes TEXT
);

CREATE INDEX idx_improvement_recommendations_feature ON improvement_recommendations(feature_request_id);
CREATE INDEX idx_improvement_recommendations_priority ON improvement_recommendations(priority);
CREATE INDEX idx_improvement_recommendations_status ON improvement_recommendations(status);

-- Table 5: AI Promise Tracking (for accountability)
CREATE TABLE IF NOT EXISTS ai_promises (
  id SERIAL PRIMARY KEY,
  feature_request_id INTEGER REFERENCES feature_requests(id) ON DELETE CASCADE,
  promise_text TEXT NOT NULL,
  promise_type VARCHAR(50),
  
  -- Fulfillment tracking
  status VARCHAR(50) CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'broken')) DEFAULT 'pending',
  fulfillment_evidence TEXT,
  metrics_provided JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fulfilled_at TIMESTAMP
);

CREATE INDEX idx_ai_promises_feature ON ai_promises(feature_request_id);
CREATE INDEX idx_ai_promises_status ON ai_promises(status);

-- Table 6: Research Sessions (for tracking AI's learning)
CREATE TABLE IF NOT EXISTS research_sessions (
  id SERIAL PRIMARY KEY,
  research_type VARCHAR(100) NOT NULL,
  query TEXT NOT NULL,
  sources_consulted TEXT[],
  findings_count INTEGER DEFAULT 0,
  insights_generated TEXT,
  
  -- Results
  features_discovered INTEGER DEFAULT 0,
  requests_generated INTEGER DEFAULT 0,
  
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER
);

CREATE INDEX idx_research_sessions_type ON research_sessions(research_type);
CREATE INDEX idx_research_sessions_date ON research_sessions(started_at DESC);

-- Add comments for documentation
COMMENT ON TABLE ai_feature_intel IS 'Market intelligence gathered from competitor research';
COMMENT ON TABLE feature_requests IS 'AI-generated feature requests with emotional advocacy';
COMMENT ON TABLE feature_feedback IS 'User feedback on shipped features with screenshot analysis';
COMMENT ON TABLE improvement_recommendations IS 'AI-generated improvement suggestions based on feedback and research';
COMMENT ON TABLE ai_promises IS 'Tracks promises made by AI when requesting features';
COMMENT ON TABLE research_sessions IS 'Logs AI research activities and learnings';
