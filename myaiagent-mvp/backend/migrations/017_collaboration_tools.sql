-- Migration: Collaboration Tools (Proposal Workspace & Compliance Checklist)
-- This migration adds tables for team collaboration on proposals and compliance tracking

-- Proposal Workspaces
CREATE TABLE IF NOT EXISTS proposal_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workspace Identification
  workspace_name VARCHAR(500) NOT NULL,
  workspace_code VARCHAR(50) UNIQUE,

  -- Linked Opportunity
  opportunity_id UUID REFERENCES opportunities(id),
  notice_id VARCHAR(255),

  -- Proposal Details
  rfp_title TEXT,
  agency_name VARCHAR(500),
  solicitation_number VARCHAR(255),

  -- Dates
  response_deadline TIMESTAMP,
  submission_date TIMESTAMP,
  question_deadline TIMESTAMP,

  -- Status
  status VARCHAR(50) DEFAULT 'Planning', -- Planning, Writing, Review, Submitted, Won, Lost
  bid_decision VARCHAR(50), -- Bid, No-Bid, Pending

  -- Team
  owner_id UUID REFERENCES users(id),
  proposal_manager_id UUID REFERENCES users(id),
  capture_manager_id UUID REFERENCES users(id),

  -- Strategy
  win_themes JSONB, -- Array of key win themes
  discriminators JSONB, -- What sets us apart
  price_to_win DECIMAL(15, 2),
  our_price DECIMAL(15, 2),

  -- Risk Assessment
  technical_risk_level VARCHAR(20), -- Low, Medium, High
  pricing_risk_level VARCHAR(20),
  past_performance_risk_level VARCHAR(20),
  overall_risk_score INTEGER, -- 0-100

  -- Progress Tracking
  percent_complete INTEGER DEFAULT 0,
  sections_complete INTEGER DEFAULT 0,
  sections_total INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Proposal Team Members
CREATE TABLE IF NOT EXISTS proposal_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID REFERENCES proposal_workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  -- Role
  role VARCHAR(100), -- Writer, Reviewer, Subject Matter Expert, Editor, etc.
  responsibilities TEXT,

  -- Permissions
  can_edit BOOLEAN DEFAULT TRUE,
  can_review BOOLEAN DEFAULT TRUE,
  can_approve BOOLEAN DEFAULT FALSE,

  -- Activity
  last_active TIMESTAMP,
  contribution_count INTEGER DEFAULT 0,

  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(id),

  CONSTRAINT unique_workspace_user UNIQUE(workspace_id, user_id)
);

-- Proposal Sections (Outline/Structure)
CREATE TABLE IF NOT EXISTS proposal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID REFERENCES proposal_workspaces(id) ON DELETE CASCADE,

  -- Section Hierarchy
  section_number VARCHAR(50), -- e.g., "L.1.2.3"
  section_title VARCHAR(500) NOT NULL,
  parent_section_id UUID REFERENCES proposal_sections(id),
  section_level INTEGER NOT NULL, -- 1 = top level
  display_order INTEGER,

  -- Requirements
  page_limit INTEGER,
  current_page_count INTEGER DEFAULT 0,
  required BOOLEAN DEFAULT TRUE,

  -- Content
  content TEXT,
  content_format VARCHAR(20) DEFAULT 'markdown', -- markdown, html, plaintext

  -- Assignments
  assigned_to UUID REFERENCES users(id),
  reviewer_id UUID REFERENCES users(id),

  -- Status
  status VARCHAR(50) DEFAULT 'Not Started', -- Not Started, In Progress, Draft, Review, Approved
  percent_complete INTEGER DEFAULT 0,

  -- Dates
  due_date TIMESTAMP,
  completed_at TIMESTAMP,

  -- Version Control
  version INTEGER DEFAULT 1,
  last_edited_by UUID REFERENCES users(id),
  last_edited_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance Checklists
CREATE TABLE IF NOT EXISTS compliance_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID REFERENCES proposal_workspaces(id) ON DELETE CASCADE,

  -- Checklist Info
  checklist_name VARCHAR(500) NOT NULL,
  checklist_type VARCHAR(100), -- Pre-Submission, Technical, Past Performance, Pricing, etc.
  description TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'In Progress', -- In Progress, Completed, Failed
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,

  -- Responsible Party
  owner_id UUID REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Compliance Checklist Items
CREATE TABLE IF NOT EXISTS compliance_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  checklist_id UUID REFERENCES compliance_checklists(id) ON DELETE CASCADE,

  -- Item Details
  item_number VARCHAR(50),
  requirement TEXT NOT NULL,
  requirement_source VARCHAR(500), -- e.g., "RFP Section L.3.2"

  -- Classification
  category VARCHAR(100), -- Format, Content, Submittal, Administrative
  severity VARCHAR(20), -- Critical, Major, Minor
  mandatory BOOLEAN DEFAULT TRUE,

  -- Status
  status VARCHAR(50) DEFAULT 'Pending', -- Pending, Compliant, Non-Compliant, N/A, Waived
  compliant BOOLEAN,

  -- Evidence
  evidence_location TEXT, -- Where compliance is demonstrated
  evidence_notes TEXT,
  attachments JSONB, -- Array of file references

  -- Assignments
  assigned_to UUID REFERENCES users(id),
  verified_by UUID REFERENCES users(id),

  -- Dates
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  verified_at TIMESTAMP,

  -- Display
  display_order INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Proposal Comments/Reviews
CREATE TABLE IF NOT EXISTS proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID REFERENCES proposal_workspaces(id) ON DELETE CASCADE,
  section_id UUID REFERENCES proposal_sections(id),

  -- Comment Details
  comment_text TEXT NOT NULL,
  comment_type VARCHAR(50), -- General, Suggestion, Issue, Question, Approval

  -- Context
  highlighted_text TEXT, -- Text being commented on
  position_start INTEGER, -- Character position
  position_end INTEGER,

  -- Status
  status VARCHAR(50) DEFAULT 'Open', -- Open, Resolved, Dismissed
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),

  -- Thread
  parent_comment_id UUID REFERENCES proposal_comments(id),
  thread_count INTEGER DEFAULT 0,

  -- Author
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Proposal Activity Log
CREATE TABLE IF NOT EXISTS proposal_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID REFERENCES proposal_workspaces(id) ON DELETE CASCADE,

  -- Activity Details
  activity_type VARCHAR(100), -- section_created, section_updated, comment_added, status_changed, etc.
  description TEXT,

  -- Context
  entity_type VARCHAR(50), -- section, checklist, comment, workspace
  entity_id UUID,

  -- Changes
  old_value TEXT,
  new_value TEXT,
  changes JSONB,

  -- User
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deadline Calendar Integration
CREATE TABLE IF NOT EXISTS proposal_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID REFERENCES proposal_workspaces(id) ON DELETE CASCADE,

  -- Deadline Details
  deadline_name VARCHAR(500) NOT NULL,
  deadline_type VARCHAR(100), -- Submission, Question Period, Site Visit, Oral Presentation, etc.
  deadline_date TIMESTAMP NOT NULL,

  -- Notifications
  send_reminder BOOLEAN DEFAULT TRUE,
  reminder_days_before INTEGER DEFAULT 3,
  last_reminder_sent TIMESTAMP,

  -- Description
  description TEXT,
  location VARCHAR(500), -- For site visits, presentations, etc.

  -- Status
  status VARCHAR(50) DEFAULT 'Upcoming', -- Upcoming, Due Soon, Overdue, Completed, Cancelled
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,

  -- Calendar Integration
  google_calendar_event_id VARCHAR(255),
  calendar_sync_status VARCHAR(50),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_workspaces_opportunity ON proposal_workspaces(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON proposal_workspaces(status);
CREATE INDEX IF NOT EXISTS idx_workspaces_deadline ON proposal_workspaces(response_deadline);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON proposal_workspaces(owner_id);

CREATE INDEX IF NOT EXISTS idx_team_members_workspace ON proposal_team_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON proposal_team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_sections_workspace ON proposal_sections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sections_parent ON proposal_sections(parent_section_id);
CREATE INDEX IF NOT EXISTS idx_sections_assigned ON proposal_sections(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sections_status ON proposal_sections(status);

CREATE INDEX IF NOT EXISTS idx_checklists_workspace ON compliance_checklists(workspace_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON compliance_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_status ON compliance_checklist_items(status);

CREATE INDEX IF NOT EXISTS idx_comments_workspace ON proposal_comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comments_section ON proposal_comments(section_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON proposal_comments(status);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON proposal_activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON proposal_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deadlines_workspace ON proposal_deadlines(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_date ON proposal_deadlines(deadline_date);

-- Triggers for automatic updates
CREATE TRIGGER workspaces_updated_at_trigger
  BEFORE UPDATE ON proposal_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER sections_updated_at_trigger
  BEFORE UPDATE ON proposal_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER checklists_updated_at_trigger
  BEFORE UPDATE ON compliance_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER checklist_items_updated_at_trigger
  BEFORE UPDATE ON compliance_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER comments_updated_at_trigger
  BEFORE UPDATE ON proposal_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

CREATE TRIGGER deadlines_updated_at_trigger
  BEFORE UPDATE ON proposal_deadlines
  FOR EACH ROW
  EXECUTE FUNCTION update_evm_updated_at();

-- Function to update checklist progress
CREATE OR REPLACE FUNCTION update_checklist_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE compliance_checklists
  SET
    completed_items = (
      SELECT COUNT(*)
      FROM compliance_checklist_items
      WHERE checklist_id = NEW.checklist_id
      AND status = 'Compliant'
    ),
    failed_items = (
      SELECT COUNT(*)
      FROM compliance_checklist_items
      WHERE checklist_id = NEW.checklist_id
      AND status = 'Non-Compliant'
    ),
    total_items = (
      SELECT COUNT(*)
      FROM compliance_checklist_items
      WHERE checklist_id = NEW.checklist_id
    ),
    updated_at = NOW()
  WHERE id = NEW.checklist_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checklist_item_status_changed
  AFTER INSERT OR UPDATE OF status ON compliance_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_checklist_progress();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_proposal_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO proposal_activity_log (
    workspace_id,
    activity_type,
    description,
    entity_type,
    entity_id,
    user_id
  ) VALUES (
    NEW.workspace_id,
    TG_TABLE_NAME || '_' || TG_OP,
    'Record ' || TG_OP || ' on ' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    NEW.id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_section_activity
  AFTER INSERT OR UPDATE ON proposal_sections
  FOR EACH ROW
  EXECUTE FUNCTION log_proposal_activity();

-- Comments for documentation
COMMENT ON TABLE proposal_workspaces IS 'Team collaboration spaces for proposal development';
COMMENT ON TABLE proposal_team_members IS 'Team members assigned to proposal workspaces';
COMMENT ON TABLE proposal_sections IS 'Hierarchical proposal sections with assignments';
COMMENT ON TABLE compliance_checklists IS 'Compliance verification checklists';
COMMENT ON TABLE compliance_checklist_items IS 'Individual compliance requirements to verify';
COMMENT ON TABLE proposal_comments IS 'Threaded comments and reviews on proposal sections';
COMMENT ON TABLE proposal_activity_log IS 'Audit trail of all proposal activities';
COMMENT ON TABLE proposal_deadlines IS 'Deadline tracking with calendar integration';
