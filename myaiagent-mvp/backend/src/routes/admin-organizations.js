import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { query } from '../utils/database.js';

const router = express.Router();

// All routes require system admin role

// Get all organizations
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { isActive, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT id, name, slug, description, owner_id, is_active, created_at, updated_at FROM organizations';
    const params = [];
    let paramCount = 1;

    if (isActive !== undefined) {
      sql += ` WHERE is_active = $${paramCount++}`;
      params.push(isActive === 'true');
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + paramCount + ' OFFSET $' + (paramCount + 1);
    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const result = await query(sql, params);

    // Get total count
    const countSql = 'SELECT COUNT(*) as count FROM organizations' + 
      (params.length > 2 ? ' WHERE is_active = $1' : '');
    const countResult = await query(countSql, params.length > 2 ? [params[0]] : []);

    res.json({
      organizations: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Get all organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get organization details with stats
router.get('/:orgId', authenticate, requireAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);

    // Get organization details
    const orgResult = await query(
      `SELECT id, name, slug, description, website_url, industry, size, 
              logo_url, owner_id, is_active, created_at, updated_at, settings
       FROM organizations WHERE id = $1`,
      [orgId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = orgResult.rows[0];

    // Get member count
    const memberResult = await query(
      'SELECT COUNT(*) as count FROM organization_users WHERE organization_id = $1 AND is_active = TRUE',
      [orgId]
    );

    // Get conversation count
    const conversationResult = await query(
      'SELECT COUNT(*) as count FROM conversations WHERE organization_id = $1',
      [orgId]
    );

    // Get message count
    const messageResult = await query(
      'SELECT COUNT(*) as count FROM messages WHERE organization_id = $1',
      [orgId]
    );

    // Get owner info
    let owner = null;
    if (organization.owner_id) {
      const ownerResult = await query(
        'SELECT id, email, full_name FROM users WHERE id = $1',
        [organization.owner_id]
      );
      owner = ownerResult.rows[0];
    }

    res.json({
      organization: {
        ...organization,
        owner,
        stats: {
          memberCount: parseInt(memberResult.rows[0].count),
          conversationCount: parseInt(conversationResult.rows[0].count),
          messageCount: parseInt(messageResult.rows[0].count),
        },
      },
    });
  } catch (error) {
    console.error('Get organization details error:', error);
    res.status(500).json({ error: 'Failed to fetch organization details' });
  }
});

// Get organization users
router.get('/:orgId/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);

    const result = await query(
      `SELECT ou.id, ou.user_id, ou.role, ou.is_active, ou.joined_at, ou.last_activity_at,
              u.id, u.email, u.full_name, u.created_at
       FROM organization_users ou
       JOIN users u ON ou.user_id = u.id
       WHERE ou.organization_id = $1
       ORDER BY ou.role DESC, ou.joined_at ASC`,
      [orgId]
    );

    res.json({
      users: result.rows,
    });
  } catch (error) {
    console.error('Get organization users error:', error);
    res.status(500).json({ error: 'Failed to fetch organization users' });
  }
});

// Deactivate organization (soft delete)
router.put('/:orgId/deactivate', authenticate, requireAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);

    await query(
      'UPDATE organizations SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [orgId]
    );

    res.json({
      status: 'success',
      message: 'Organization deactivated successfully',
    });
  } catch (error) {
    console.error('Deactivate organization error:', error);
    res.status(500).json({ error: 'Failed to deactivate organization' });
  }
});

// Activate organization
router.put('/:orgId/activate', authenticate, requireAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);

    await query(
      'UPDATE organizations SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [orgId]
    );

    res.json({
      status: 'success',
      message: 'Organization activated successfully',
    });
  } catch (error) {
    console.error('Activate organization error:', error);
    res.status(500).json({ error: 'Failed to activate organization' });
  }
});

// Get admin statistics
router.get('/stats/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    // Total organizations
    const orgResult = await query('SELECT COUNT(*) as count FROM organizations WHERE is_active = TRUE');
    
    // Total users
    const usersResult = await query(
      'SELECT COUNT(DISTINCT user_id) as count FROM organization_users WHERE is_active = TRUE'
    );

    // Total conversations
    const conversationsResult = await query('SELECT COUNT(*) as count FROM conversations');

    // Total messages
    const messagesResult = await query('SELECT COUNT(*) as count FROM messages');

    res.json({
      statistics: {
        activeOrganizations: parseInt(orgResult.rows[0].count),
        totalUsers: parseInt(usersResult.rows[0].count),
        totalConversations: parseInt(conversationsResult.rows[0].count),
        totalMessages: parseInt(messagesResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
