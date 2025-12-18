import express from 'express';
import { query } from '../utils/database.js';
import { authenticate, requireAdmin, requireMasterAdmin } from '../middleware/auth.js';
import { getSystemApiKeys } from '../services/apiKeyResolver.js';

const router = express.Router();

// All routes require admin
router.use(authenticate, requireAdmin);

// Dashboard statistics - Simplified safe query
router.get('/stats', async (req, res) => {
  try {
    // Use individual queries to avoid failures from missing tables
    const usersResult = await query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') as active_users
      FROM users
    `);

    const conversationsResult = await query(`
      SELECT COUNT(*) as total FROM conversations
    `);

    const messagesResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today
      FROM messages
    `);

    const users = usersResult.rows[0];
    const conversations = conversationsResult.rows[0];
    const messages = messagesResult.rows[0];

    res.json({
      users: {
        total: parseInt(users.total_users) || 0,
        active: parseInt(users.active_users) || 0,
      },
      conversations: {
        total: parseInt(conversations.total) || 0,
      },
      messages: {
        total: parseInt(messages.total) || 0,
        today: parseInt(messages.today) || 0,
      },
      voice: {
        minutesToday: 0,
      },
      tokens: {
        total: 0,
        today: 0,
        estimatedCost: '0.00',
      },
      system: {
        recentErrors: 0,
        avgResponseTime: 0,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    let sql = `
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, 
             u.created_at, u.last_login_at,
             COUNT(DISTINCT c.id) as conversation_count,
             COUNT(DISTINCT m.id) as message_count
      FROM users u
      LEFT JOIN conversations c ON u.id = c.user_id
      LEFT JOIN messages m ON c.id = m.conversation_id
    `;

    const params = [];
    let paramCount = 1;

    if (search) {
      sql += ` WHERE u.email ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    sql += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    res.json({
      users: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get single user details
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await query(
      `SELECT id, email, full_name, role, is_active, created_at, last_login_at, settings, preferences
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user's usage stats
    const usageResult = await query(
      `SELECT 
         SUM(messages_sent) as total_messages,
         SUM(voice_minutes_used) as total_voice_minutes,
         SUM(tokens_consumed) as total_tokens,
         SUM(files_uploaded) as total_files
       FROM usage_tracking WHERE user_id = $1`,
      [id]
    );

    const usage = usageResult.rows[0];

    res.json({
      user,
      usage: {
        totalMessages: parseInt(usage.total_messages) || 0,
        totalVoiceMinutes: parseFloat(usage.total_voice_minutes) || 0,
        totalTokens: parseInt(usage.total_tokens) || 0,
        totalFiles: parseInt(usage.total_files) || 0,
      },
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// Create new user (admin/superadmin)
router.post('/users', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields (email, password, fullName, role) are required' });
    }

    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const { hashPassword } = await import('../utils/auth.js');
    const hashedPassword = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, full_name, role`,
      [email, hashedPassword, fullName, role]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (activate/deactivate, change role)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, role, email, fullName } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (role !== undefined) {
      if (!['user', 'admin', 'superadmin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);

    // If updating email, check for duplicates
    if (email) {
      const existingUser = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
    }

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user password
router.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { hashPassword } = await import('../utils/auth.js');
    const hashedPassword = await hashPassword(password);

    await query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [hashedPassword, id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Get error logs
router.get('/errors', async (req, res) => {
  try {
    const { limit = 100, resolved = false } = req.query;

    const result = await query(
      `SELECT * FROM error_logs 
       WHERE resolved = $1
       ORDER BY created_at DESC 
       LIMIT $2`,
      [resolved === 'true', parseInt(limit)]
    );

    res.json({
      errors: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Get errors error:', error);
    res.status(500).json({ error: 'Failed to get error logs' });
  }
});

// Mark error as resolved
router.put('/errors/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;

    await query('UPDATE error_logs SET resolved = true WHERE id = $1', [id]);

    res.json({ message: 'Error marked as resolved' });
  } catch (error) {
    console.error('Resolve error log error:', error);
    res.status(500).json({ error: 'Failed to resolve error' });
  }
});

// Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const hoursInt = Math.max(1, Math.min(168, parseInt(hours) || 24)); // Validate: 1-168 hours (1 week max)

    const result = await query(
      `SELECT
         metric_type,
         AVG(value) as avg_value,
         MAX(value) as max_value,
         MIN(value) as min_value,
         COUNT(*) as count
       FROM performance_metrics
       WHERE created_at > NOW() - (INTERVAL '1 hour' * $1)
       GROUP BY metric_type
       ORDER BY metric_type`,
      [hoursInt]
    );

    res.json({
      metrics: result.rows,
      period: `${hours} hours`,
    });
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// System health check
router.get('/health', async (req, res) => {
  try {
    // Check database
    const dbCheck = await query('SELECT NOW()');
    const dbHealthy = dbCheck.rows.length > 0;

    // Check OpenAI key
    const openaiHealthy = !!process.env.OPENAI_API_KEY;

    res.json({
      status: dbHealthy && openaiHealthy ? 'healthy' : 'degraded',
      database: dbHealthy ? 'connected' : 'error',
      openai: openaiHealthy ? 'configured' : 'not configured',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Get API key status (masked)
router.get('/api-keys', async (req, res) => {
  try {
    const { hasApiKey } = await import('../utils/apiKeys.js');
    const openaiConfigured = await hasApiKey('openai');
    const elevenLabsConfigured = await hasApiKey('elevenlabs');

    res.json({
      openai: {
        configured: openaiConfigured,
        preview: openaiConfigured ? 'sk-...****' : null,
      },
      elevenlabs: {
        configured: elevenLabsConfigured,
        preview: elevenLabsConfigured ? 'xi-...****' : null,
      },
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
});

// Save API keys
// Save API keys
router.post('/api-keys', async (req, res) => {
  try {
    const { provider, apiKey, keyLabel } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API key are required' });
    }

    const allowedProviders = ['openai', 'elevenlabs', 'gemini', 'anthropic', 'stripe', 'google'];
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const { saveApiKey } = await import('../utils/apiKeys.js');
    await saveApiKey(provider, apiKey, req.user.id, null, keyLabel);

    res.json({ message: `${provider} API key saved successfully` });
  } catch (error) {
    console.error('Save API key error:', error);
    res.status(500).json({ error: error.message || 'Failed to save API key' });
  }
});

// Get feedback analytics - model performance and ratings
router.get('/feedback-analytics', async (req, res) => {
  try {
    const analyticsResult = await query(`
      WITH feedback_by_model AS (
        SELECT 
          m.model,
          COUNT(*) as total_ratings,
          COUNT(*) FILTER (WHERE f.rating = 1) as positive_count,
          COUNT(*) FILTER (WHERE f.rating = -1) as negative_count,
          ROUND(AVG(f.rating)::numeric, 2) as avg_rating,
          ROUND((COUNT(*) FILTER (WHERE f.rating = 1)::float / NULLIF(COUNT(*), 0) * 100), 1) as satisfaction_rate
        FROM feedback f
        JOIN messages m ON f.message_id = m.id
        WHERE f.created_at > NOW() - INTERVAL '30 days'
        GROUP BY m.model
      ),
      recent_feedback AS (
        SELECT 
          f.id,
          f.rating,
          f.comment,
          f.created_at,
          m.model,
          m.content as message_content,
          u.full_name as user_name
        FROM feedback f
        JOIN messages m ON f.message_id = m.id
        JOIN users u ON f.user_id = u.id
        ORDER BY f.created_at DESC
        LIMIT 20
      ),
      problem_messages AS (
        SELECT 
          m.id,
          m.content,
          m.model,
          f.comment,
          u.full_name as user_name,
          f.created_at
        FROM feedback f
        JOIN messages m ON f.message_id = m.id
        JOIN users u ON f.user_id = u.id
        WHERE f.rating = -1 AND f.created_at > NOW() - INTERVAL '7 days'
        ORDER BY f.created_at DESC
        LIMIT 10
      )
      SELECT 
        json_build_object(
          'by_model', (SELECT json_agg(row_to_json(fbm)) FROM feedback_by_model fbm),
          'recent_feedback', (SELECT json_agg(row_to_json(rf)) FROM recent_feedback rf),
          'problem_messages', (SELECT json_agg(row_to_json(pm)) FROM problem_messages pm)
        ) as analytics
    `);

    const analytics = analyticsResult.rows[0]?.analytics || {
      by_model: [],
      recent_feedback: [],
      problem_messages: []
    };

    res.json(analytics);
  } catch (error) {
    console.error('Feedback analytics error:', error);
    res.status(500).json({ error: 'Failed to get feedback analytics' });
  }
});

// ============================================
// MASTER ADMIN ENDPOINTS (System-wide admin)
// ============================================

/**
 * GET /api/admin/organizations
 * List all organizations in the system (master admin only)
 */
router.get('/organizations', requireMasterAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT o.id, o.name, o.slug, o.owner_id, o.is_active, o.created_at, o.updated_at,
             COUNT(DISTINCT ou.user_id) as user_count,
             COUNT(DISTINCT c.id) as conversation_count,
             COUNT(DISTINCT m.id) as message_count
      FROM organizations o
      LEFT JOIN organization_users ou ON o.id = ou.organization_id AND ou.is_active = TRUE
      LEFT JOIN conversations c ON o.id = c.organization_id
      LEFT JOIN messages m ON c.id = m.conversation_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);

    res.json({
      organizations: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

/**
 * GET /api/admin/organizations/:orgId
 * Get details of specific organization (master admin only)
 */
router.get('/organizations/:orgId', requireMasterAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;

    const result = await query(`
      SELECT o.*, u.full_name as owner_name, u.email as owner_email
      FROM organizations o
      LEFT JOIN users u ON o.owner_id = u.id
      WHERE o.id = $1
    `, [parseInt(orgId)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

/**
 * GET /api/admin/organizations/:orgId/users
 * List all users in specific organization (master admin only)
 */
router.get('/organizations/:orgId/users', requireMasterAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(`
      SELECT u.id, u.email, u.full_name, u.is_active, u.role,
             ou.role as org_role, ou.joined_at, ou.is_active as org_active,
             COUNT(DISTINCT c.id) as conversation_count
      FROM users u
      JOIN organization_users ou ON u.id = ou.user_id
      LEFT JOIN conversations c ON u.id = c.user_id AND c.organization_id = $1
      WHERE ou.organization_id = $1
      GROUP BY u.id, ou.id
      ORDER BY ou.joined_at DESC
      LIMIT $2 OFFSET $3
    `, [parseInt(orgId), parseInt(limit), parseInt(offset)]);

    res.json({
      users: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching organization users:', error);
    res.status(500).json({ error: 'Failed to fetch organization users' });
  }
});

/**
 * GET /api/admin/api-keys
 * List all API keys across all organizations (master admin only, audit view)
 */
router.get('/api-keys', requireMasterAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT a.id, a.key_label, a.service_name, a.is_active, a.created_at, a.updated_at,
             a.organization_id,
             o.name as org_name
      FROM api_secrets a
      LEFT JOIN organizations o ON a.organization_id = o.id
      ORDER BY a.organization_id ASC, a.created_at DESC
    `);

    res.json({
      apiKeys: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * GET /api/admin/api-keys/:keyId
 * Get specific API key details (master admin only)
 */
router.get('/api-keys/:keyId', requireMasterAdmin, async (req, res) => {
  try {
    const { keyId } = req.params;

    const result = await query(`
      SELECT a.id, a.key_label, a.service_name, a.is_active, a.created_at, a.updated_at,
             a.organization_id,
             o.name as org_name
      FROM api_secrets a
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE a.id = $1
    `, [parseInt(keyId)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ apiKey: result.rows[0] });
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({ error: 'Failed to fetch API key' });
  }
});

/**
 * GET /api/admin/master-stats
 * Get master admin dashboard statistics (master admin only)
 */
router.get('/master-stats', requireMasterAdmin, async (req, res) => {
  try {
    const orgsResult = await query('SELECT COUNT(*) as count FROM organizations WHERE is_active = TRUE');
    const usersResult = await query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
    const conversationsResult = await query('SELECT COUNT(*) as count FROM conversations');
    const messagesResult = await query('SELECT COUNT(*) as count FROM messages');
    const apiKeysResult = await query('SELECT COUNT(*) as count FROM api_secrets WHERE is_active = TRUE');

    res.json({
      organizations: {
        total: parseInt(orgsResult.rows[0].count) || 0
      },
      users: {
        total: parseInt(usersResult.rows[0].count) || 0
      },
      conversations: {
        total: parseInt(conversationsResult.rows[0].count) || 0
      },
      messages: {
        total: parseInt(messagesResult.rows[0].count) || 0
      },
      apiKeys: {
        total: parseInt(apiKeysResult.rows[0].count) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching master stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
