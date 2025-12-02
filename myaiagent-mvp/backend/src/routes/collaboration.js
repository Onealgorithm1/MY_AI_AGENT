import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/collaboration/workspaces
 * @desc    Get all proposal workspaces for user
 * @access  Private
 */
router.get('/workspaces', authenticate, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = `
      SELECT w.*, COUNT(DISTINCT tm.id) as team_member_count
      FROM proposal_workspaces w
      LEFT JOIN proposal_team_members tm ON w.id = tm.workspace_id
      WHERE w.owner_id = $1 OR w.id IN (
        SELECT workspace_id FROM proposal_team_members WHERE user_id = $1
      )
    `;

    const params = [req.user.id];

    if (status) {
      query += ` AND w.status = $2`;
      params.push(status);
    }

    query += ` GROUP BY w.id ORDER BY w.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      workspaces: result.rows,
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get workspaces',
    });
  }
});

/**
 * @route   POST /api/collaboration/workspaces
 * @desc    Create new proposal workspace
 * @access  Private
 */
router.post('/workspaces', authenticate, async (req, res) => {
  try {
    const {
      workspaceName,
      workspaceCode,
      opportunityId,
      noticeId,
      rfpTitle,
      agencyName,
      solicitationNumber,
      responseDeadline,
      questionDeadline,
      proposalManagerId,
      captureManagerId,
    } = req.body;

    if (!workspaceName) {
      return res.status(400).json({
        success: false,
        message: 'Workspace name is required',
      });
    }

    const query = `
      INSERT INTO proposal_workspaces (
        workspace_name, workspace_code, opportunity_id, notice_id,
        rfp_title, agency_name, solicitation_number,
        response_deadline, question_deadline,
        owner_id, proposal_manager_id, capture_manager_id,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      workspaceName,
      workspaceCode,
      opportunityId,
      noticeId,
      rfpTitle,
      agencyName,
      solicitationNumber,
      responseDeadline,
      questionDeadline,
      req.user.id,
      proposalManagerId || req.user.id,
      captureManagerId,
      req.user.id,
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      workspace: result.rows[0],
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create workspace',
    });
  }
});

/**
 * @route   GET /api/collaboration/workspaces/:id
 * @desc    Get workspace details
 * @access  Private
 */
router.get('/workspaces/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT w.*,
        o.email as owner_email,
        pm.email as proposal_manager_email,
        cm.email as capture_manager_email
      FROM proposal_workspaces w
      LEFT JOIN users o ON w.owner_id = o.id
      LEFT JOIN users pm ON w.proposal_manager_id = pm.id
      LEFT JOIN users cm ON w.capture_manager_id = cm.id
      WHERE w.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    // Get team members
    const teamQuery = `
      SELECT tm.*, u.email, u.full_name
      FROM proposal_team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.workspace_id = $1
    `;
    const teamResult = await pool.query(teamQuery, [id]);

    // Get sections
    const sectionsQuery = `
      SELECT * FROM proposal_sections
      WHERE workspace_id = $1
      ORDER BY display_order ASC
    `;
    const sectionsResult = await pool.query(sectionsQuery, [id]);

    // Get checklists
    const checklistsQuery = `
      SELECT * FROM compliance_checklists
      WHERE workspace_id = $1
    `;
    const checklistsResult = await pool.query(checklistsQuery, [id]);

    res.json({
      success: true,
      workspace: result.rows[0],
      team: teamResult.rows,
      sections: sectionsResult.rows,
      checklists: checklistsResult.rows,
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get workspace',
    });
  }
});

/**
 * @route   POST /api/collaboration/workspaces/:id/team
 * @desc    Add team member to workspace
 * @access  Private
 */
router.post('/workspaces/:id/team', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role, responsibilities, canEdit, canReview, canApprove } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const query = `
      INSERT INTO proposal_team_members (
        workspace_id, user_id, role, responsibilities,
        can_edit, can_review, can_approve, added_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (workspace_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        responsibilities = EXCLUDED.responsibilities,
        can_edit = EXCLUDED.can_edit,
        can_review = EXCLUDED.can_review,
        can_approve = EXCLUDED.can_approve
      RETURNING *;
    `;

    const values = [
      id,
      userId,
      role,
      responsibilities,
      canEdit !== false,
      canReview !== false,
      canApprove || false,
      req.user.id,
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      teamMember: result.rows[0],
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add team member',
    });
  }
});

/**
 * @route   POST /api/collaboration/workspaces/:id/sections
 * @desc    Create proposal section
 * @access  Private
 */
router.post('/workspaces/:id/sections', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sectionNumber,
      sectionTitle,
      parentSectionId,
      sectionLevel,
      displayOrder,
      pageLimit,
      required,
      assignedTo,
      reviewerId,
      dueDate,
    } = req.body;

    if (!sectionTitle) {
      return res.status(400).json({
        success: false,
        message: 'Section title is required',
      });
    }

    const query = `
      INSERT INTO proposal_sections (
        workspace_id, section_number, section_title,
        parent_section_id, section_level, display_order,
        page_limit, required, assigned_to, reviewer_id, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const values = [
      id,
      sectionNumber,
      sectionTitle,
      parentSectionId,
      sectionLevel || 1,
      displayOrder,
      pageLimit,
      required !== false,
      assignedTo,
      reviewerId,
      dueDate,
    ];

    const result = await pool.query(query, values);

    // Update workspace sections count
    await pool.query(
      'UPDATE proposal_workspaces SET sections_total = sections_total + 1 WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      section: result.rows[0],
    });
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create section',
    });
  }
});

/**
 * @route   PUT /api/collaboration/sections/:id
 * @desc    Update section content
 * @access  Private
 */
router.put('/sections/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, status, percentComplete } = req.body;

    const query = `
      UPDATE proposal_sections
      SET
        content = COALESCE($1, content),
        status = COALESCE($2, status),
        percent_complete = COALESCE($3, percent_complete),
        last_edited_by = $4,
        last_edited_at = NOW(),
        version = version + 1,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *;
    `;

    const result = await pool.query(query, [
      content,
      status,
      percentComplete,
      req.user.id,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    res.json({
      success: true,
      section: result.rows[0],
    });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update section',
    });
  }
});

/**
 * @route   POST /api/collaboration/workspaces/:id/checklists
 * @desc    Create compliance checklist
 * @access  Private
 */
router.post('/workspaces/:id/checklists', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { checklistName, checklistType, description, ownerId } = req.body;

    if (!checklistName) {
      return res.status(400).json({
        success: false,
        message: 'Checklist name is required',
      });
    }

    const query = `
      INSERT INTO compliance_checklists (
        workspace_id, checklist_name, checklist_type,
        description, owner_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      id,
      checklistName,
      checklistType,
      description,
      ownerId || req.user.id,
      req.user.id,
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      checklist: result.rows[0],
    });
  } catch (error) {
    console.error('Create checklist error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checklist',
    });
  }
});

/**
 * @route   POST /api/collaboration/checklists/:id/items
 * @desc    Add checklist item
 * @access  Private
 */
router.post('/checklists/:id/items', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      itemNumber,
      requirement,
      requirementSource,
      category,
      severity,
      mandatory,
      assignedTo,
      dueDate,
      displayOrder,
    } = req.body;

    if (!requirement) {
      return res.status(400).json({
        success: false,
        message: 'Requirement is required',
      });
    }

    const query = `
      INSERT INTO compliance_checklist_items (
        checklist_id, item_number, requirement, requirement_source,
        category, severity, mandatory, assigned_to, due_date, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      id,
      itemNumber,
      requirement,
      requirementSource,
      category,
      severity || 'Major',
      mandatory !== false,
      assignedTo,
      dueDate,
      displayOrder,
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      item: result.rows[0],
    });
  } catch (error) {
    console.error('Add checklist item error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add checklist item',
    });
  }
});

/**
 * @route   PUT /api/collaboration/checklist-items/:id
 * @desc    Update checklist item status
 * @access  Private
 */
router.put('/checklist-items/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, compliant, evidenceLocation, evidenceNotes } = req.body;

    const query = `
      UPDATE compliance_checklist_items
      SET
        status = COALESCE($1, status),
        compliant = COALESCE($2, compliant),
        evidence_location = COALESCE($3, evidence_location),
        evidence_notes = COALESCE($4, evidence_notes),
        verified_by = $5,
        verified_at = CASE WHEN $1 IN ('Compliant', 'Non-Compliant') THEN NOW() ELSE verified_at END,
        completed_at = CASE WHEN $1 = 'Compliant' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *;
    `;

    const result = await pool.query(query, [
      status,
      compliant,
      evidenceLocation,
      evidenceNotes,
      req.user.id,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Checklist item not found',
      });
    }

    res.json({
      success: true,
      item: result.rows[0],
    });
  } catch (error) {
    console.error('Update checklist item error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update checklist item',
    });
  }
});

/**
 * @route   GET /api/collaboration/checklists/:id
 * @desc    Get checklist with all items
 * @access  Private
 */
router.get('/checklists/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const checklistQuery = 'SELECT * FROM compliance_checklists WHERE id = $1';
    const checklistResult = await pool.query(checklistQuery, [id]);

    if (checklistResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Checklist not found',
      });
    }

    const itemsQuery = `
      SELECT * FROM compliance_checklist_items
      WHERE checklist_id = $1
      ORDER BY display_order ASC, item_number ASC
    `;
    const itemsResult = await pool.query(itemsQuery, [id]);

    res.json({
      success: true,
      checklist: checklistResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Get checklist error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get checklist',
    });
  }
});

/**
 * @route   POST /api/collaboration/workspaces/:id/deadlines
 * @desc    Create deadline
 * @access  Private
 */
router.post('/workspaces/:id/deadlines', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      deadlineName,
      deadlineType,
      deadlineDate,
      description,
      location,
      sendReminder,
      reminderDaysBefore,
    } = req.body;

    if (!deadlineName || !deadlineDate) {
      return res.status(400).json({
        success: false,
        message: 'Deadline name and date are required',
      });
    }

    const query = `
      INSERT INTO proposal_deadlines (
        workspace_id, deadline_name, deadline_type, deadline_date,
        description, location, send_reminder, reminder_days_before,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      id,
      deadlineName,
      deadlineType,
      deadlineDate,
      description,
      location,
      sendReminder !== false,
      reminderDaysBefore || 3,
      req.user.id,
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      deadline: result.rows[0],
    });
  } catch (error) {
    console.error('Create deadline error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create deadline',
    });
  }
});

/**
 * @route   GET /api/collaboration/workspaces/:id/deadlines
 * @desc    Get all deadlines for workspace
 * @access  Private
 */
router.get('/workspaces/:id/deadlines', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM proposal_deadlines
      WHERE workspace_id = $1
      ORDER BY deadline_date ASC
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      deadlines: result.rows,
    });
  } catch (error) {
    console.error('Get deadlines error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get deadlines',
    });
  }
});

export default router;
