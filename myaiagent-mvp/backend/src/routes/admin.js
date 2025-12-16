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

// Update user (activate/deactivate, change role)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, role } = req.body;

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

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);

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
router.post('/api-keys', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    
    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API key are required' });
    }
    
    const allowedProviders = ['openai', 'elevenlabs'];
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    const { saveApiKey } = await import('../utils/apiKeys.js');
    const success = await saveApiKey(provider, apiKey, req.user.id);
    
    if (success) {
      res.json({ message: `${provider} API key saved successfully` });
    } else {
      res.status(500).json({ error: 'Failed to save API key' });
    }
  } catch (error) {
    console.error('Save API key error:', error);
    res.status(500).json({ error: 'Failed to save API key' });
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

export default router;
