import express from 'express';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/opportunities
 * List opportunities with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      assignedTo,
      createdBy,
      minScore,
      search,
      limit = 50,
      offset = 0,
      sortBy = 'posted_date',
      sortOrder = 'DESC'
    } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Filter by status
    if (status) {
      whereConditions.push(`internal_status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Filter by assigned user
    if (assignedTo) {
      if (assignedTo === 'me') {
        whereConditions.push(`assigned_to = $${paramIndex}`);
        params.push(req.user.id);
      } else if (assignedTo === 'unassigned') {
        whereConditions.push(`assigned_to IS NULL`);
      } else {
        whereConditions.push(`assigned_to = $${paramIndex}`);
        params.push(parseInt(assignedTo));
      }
      paramIndex++;
    }

    // Filter by creator
    if (createdBy) {
      if (createdBy === 'me') {
        whereConditions.push(`created_by = $${paramIndex}`);
        params.push(req.user.id);
      } else {
        whereConditions.push(`created_by = $${paramIndex}`);
        params.push(parseInt(createdBy));
      }
      paramIndex++;
    }

    // Filter by minimum score
    if (minScore) {
      whereConditions.push(`internal_score >= $${paramIndex}`);
      params.push(parseInt(minScore));
      paramIndex++;
    }

    // Search in title and description
    if (search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Validate sort column
    const validSortColumns = ['posted_date', 'response_deadline', 'internal_score', 'created_at', 'updated_at'];
    const safeSort = validSortColumns.includes(sortBy) ? sortBy : 'posted_date';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM opportunities ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get opportunities with user info for assigned_to
    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT
        o.*,
        u.full_name as assigned_to_name,
        u.email as assigned_to_email,
        creator.full_name as created_by_name
      FROM opportunities o
      LEFT JOIN users u ON o.assigned_to = u.id
      LEFT JOIN users creator ON o.created_by = creator.id
      ${whereClause}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      opportunities: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

/**
 * GET /api/opportunities/:id
 * Get single opportunity by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT
        o.*,
        u.full_name as assigned_to_name,
        u.email as assigned_to_email,
        creator.full_name as created_by_name,
        creator.email as created_by_email
      FROM opportunities o
      LEFT JOIN users u ON o.assigned_to = u.id
      LEFT JOIN users creator ON o.created_by = creator.id
      WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Get activity history
    const activityResult = await query(
      `SELECT
        a.*,
        u.full_name as user_name,
        u.email as user_email
      FROM opportunity_activity a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.opportunity_id = $1
      ORDER BY a.created_at DESC
      LIMIT 50`,
      [id]
    );

    res.json({
      opportunity: result.rows[0],
      activity: activityResult.rows
    });
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
});

/**
 * POST /api/opportunities
 * Create new opportunity (manually or from SAM.gov data)
 */
router.post('/', async (req, res) => {
  try {
    const {
      notice_id,
      solicitation_number,
      title,
      type,
      posted_date,
      response_deadline,
      naics_code,
      set_aside_type,
      contracting_office,
      place_of_performance,
      description,
      raw_data,
      internal_status = 'New',
      internal_score,
      internal_notes
    } = req.body;

    if (!notice_id || !title) {
      return res.status(400).json({ error: 'notice_id and title are required' });
    }

    // Check if opportunity already exists in THIS user's pipeline
    const existingResult = await query(
      'SELECT id FROM opportunities WHERE notice_id = $1 AND created_by = $2',
      [notice_id, req.user.id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Opportunity already in your pipeline',
        id: existingResult.rows[0].id
      });
    }

    const result = await query(
      `INSERT INTO opportunities (
        notice_id, solicitation_number, title, type, posted_date, response_deadline,
        naics_code, set_aside_type, contracting_office, place_of_performance,
        description, raw_data, internal_status, internal_score, internal_notes,
        created_by, last_sync_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        notice_id, solicitation_number, title, type, posted_date, response_deadline,
        naics_code, set_aside_type, contracting_office, place_of_performance,
        description, raw_data, internal_status, internal_score, internal_notes,
        req.user.id
      ]
    );

    // Log activity
    await query(
      `INSERT INTO opportunity_activity (opportunity_id, user_id, activity_type, new_value)
       VALUES ($1, $2, 'created', $3)`,
      [result.rows[0].id, req.user.id, internal_status]
    );

    res.status(201).json({ opportunity: result.rows[0] });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    res.status(500).json({ error: 'Failed to create opportunity' });
  }
});

/**
 * PATCH /api/opportunities/:id/status
 * Update opportunity status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['New', 'Qualified', 'In Progress', 'Submitted', 'Won', 'Lost', 'Archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      });
    }

    // Get current status
    const currentResult = await query(
      'SELECT internal_status FROM opportunities WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const oldStatus = currentResult.rows[0].internal_status;

    // Update status
    const result = await query(
      `UPDATE opportunities
       SET internal_status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    // Log activity
    await query(
      `INSERT INTO opportunity_activity (
        opportunity_id, user_id, activity_type, old_value, new_value, notes
      ) VALUES ($1, $2, 'status_change', $3, $4, $5)`,
      [id, req.user.id, oldStatus, status, notes]
    );

    res.json({ opportunity: result.rows[0] });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * PATCH /api/opportunities/:id/assign
 * Assign opportunity to user
 */
router.patch('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, notes } = req.body;

    // Validate user exists
    if (userId) {
      const userResult = await query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Get current assignment
    const currentResult = await query(
      `SELECT assigned_to,
        (SELECT full_name FROM users WHERE id = opportunities.assigned_to) as old_assigned_name
       FROM opportunities WHERE id = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const oldAssignedTo = currentResult.rows[0].assigned_to;
    const oldAssignedName = currentResult.rows[0].old_assigned_name;

    // Update assignment
    const result = await query(
      `UPDATE opportunities
       SET assigned_to = $1
       WHERE id = $2
       RETURNING *`,
      [userId || null, id]
    );

    // Get new assigned user name
    let newAssignedName = null;
    if (userId) {
      const newUserResult = await query('SELECT full_name FROM users WHERE id = $1', [userId]);
      newAssignedName = newUserResult.rows[0].full_name;
    }

    // Log activity
    await query(
      `INSERT INTO opportunity_activity (
        opportunity_id, user_id, activity_type, old_value, new_value, notes
      ) VALUES ($1, $2, 'assignment', $3, $4, $5)`,
      [id, req.user.id, oldAssignedName || 'Unassigned', newAssignedName || 'Unassigned', notes]
    );

    res.json({ opportunity: result.rows[0] });
  } catch (error) {
    console.error('Error assigning opportunity:', error);
    res.status(500).json({ error: 'Failed to assign opportunity' });
  }
});

/**
 * PATCH /api/opportunities/:id/score
 * Update opportunity score
 */
router.patch('/:id/score', async (req, res) => {
  try {
    const { id } = req.params;
    const { score, notes } = req.body;

    if (score < 0 || score > 100) {
      return res.status(400).json({ error: 'Score must be between 0 and 100' });
    }

    // Get current score
    const currentResult = await query(
      'SELECT internal_score FROM opportunities WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const oldScore = currentResult.rows[0].internal_score;

    // Update score
    const result = await query(
      `UPDATE opportunities
       SET internal_score = $1
       WHERE id = $2
       RETURNING *`,
      [score, id]
    );

    // Log activity
    await query(
      `INSERT INTO opportunity_activity (
        opportunity_id, user_id, activity_type, old_value, new_value, notes
      ) VALUES ($1, $2, 'score_updated', $3, $4, $5)`,
      [id, req.user.id, oldScore?.toString() || 'None', score.toString(), notes]
    );

    res.json({ opportunity: result.rows[0] });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

/**
 * PATCH /api/opportunities/:id/notes
 * Add or update notes
 */
router.patch('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, append = false } = req.body;

    if (!notes || typeof notes !== 'string') {
      return res.status(400).json({ error: 'Notes must be a non-empty string' });
    }

    let updateQuery;
    let params;

    if (append) {
      // Append to existing notes
      updateQuery = `
        UPDATE opportunities
        SET internal_notes = CASE
          WHEN internal_notes IS NULL THEN $1
          ELSE internal_notes || E'\\n\\n---\\n\\n' || $1
        END
        WHERE id = $2
        RETURNING *`;
      params = [notes, id];
    } else {
      // Replace notes
      updateQuery = `
        UPDATE opportunities
        SET internal_notes = $1
        WHERE id = $2
        RETURNING *`;
      params = [notes, id];
    }

    const result = await query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Log activity
    await query(
      `INSERT INTO opportunity_activity (
        opportunity_id, user_id, activity_type, new_value
      ) VALUES ($1, $2, 'note_added', $3)`,
      [id, req.user.id, notes.substring(0, 500)]
    );

    res.json({ opportunity: result.rows[0] });
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

/**
 * DELETE /api/opportunities/:id
 * Delete opportunity (soft delete by archiving)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    if (permanent && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can permanently delete opportunities' });
    }

    if (permanent) {
      // Hard delete
      await query('DELETE FROM opportunities WHERE id = $1', [id]);
    } else {
      // Soft delete (archive)
      await query(
        `UPDATE opportunities SET internal_status = 'Archived' WHERE id = $1`,
        [id]
      );

      await query(
        `INSERT INTO opportunity_activity (
          opportunity_id, user_id, activity_type, new_value
        ) VALUES ($1, $2, 'archived', 'Archived by user')`,
        [id, req.user.id]
      );
    }

    res.json({ success: true, message: permanent ? 'Permanently deleted' : 'Archived' });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    res.status(500).json({ error: 'Failed to delete opportunity' });
  }
});

/**
 * GET /api/opportunities/stats/summary
 * Get summary statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { userId } = req.query;

    let userFilter = '';
    let params = [];

    if (userId) {
      userFilter = 'AND assigned_to = $1';
      params.push(parseInt(userId));
    }

    const result = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE internal_status = 'New') as new_count,
        COUNT(*) FILTER (WHERE internal_status = 'Qualified') as qualified_count,
        COUNT(*) FILTER (WHERE internal_status = 'In Progress') as in_progress_count,
        COUNT(*) FILTER (WHERE internal_status = 'Submitted') as submitted_count,
        COUNT(*) FILTER (WHERE internal_status = 'Won') as won_count,
        COUNT(*) FILTER (WHERE internal_status = 'Lost') as lost_count,
        COUNT(*) FILTER (WHERE assigned_to IS NULL) as unassigned_count,
        AVG(internal_score) as avg_score
      FROM opportunities
      WHERE internal_status != 'Archived' ${userFilter}`,
      params
    );

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
