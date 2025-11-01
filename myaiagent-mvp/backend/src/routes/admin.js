import express from 'express';
import { query } from '../utils/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin
router.use(authenticate, requireAdmin);

// Dashboard statistics - Optimized single query
router.get('/stats', async (req, res) => {
  try {
    const statsResult = await query(`
      WITH stats AS (
        SELECT
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL '7 days') as active_users,
          (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE) as new_users_today,
          (SELECT COUNT(*) FROM conversations) as total_conversations,
          (SELECT COUNT(*) FROM conversations WHERE DATE(created_at) = CURRENT_DATE) as conversations_today,
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT COUNT(*) FROM attachments) as total_files,
          (SELECT COUNT(*) FROM error_logs WHERE created_at > NOW() - INTERVAL '24 hours' AND resolved = false) as recent_errors,
          (SELECT COALESCE(AVG(duration_ms), 0) FROM (
            SELECT duration_ms FROM performance_metrics 
            WHERE created_at > NOW() - INTERVAL '1 hour' AND duration_ms IS NOT NULL
            ORDER BY created_at DESC LIMIT 100
          ) recent_perf) as avg_response_time
      ),
      today_usage AS (
        SELECT 
          COALESCE(SUM(messages_sent), 0) as messages_today,
          COALESCE(SUM(voice_minutes_used), 0) as voice_minutes_today,
          COALESCE(SUM(tokens_consumed), 0) as tokens_today,
          COALESCE(SUM(files_uploaded), 0) as files_today
        FROM usage_tracking 
        WHERE date = CURRENT_DATE
      ),
      total_usage AS (
        SELECT 
          COALESCE(SUM(tokens_consumed), 0) as total_tokens,
          COALESCE(SUM(voice_minutes_used), 0) as total_voice_minutes
        FROM usage_tracking
      )
      SELECT 
        s.*,
        t.messages_today,
        t.voice_minutes_today,
        t.tokens_today,
        t.files_today,
        tu.total_tokens,
        tu.total_voice_minutes
      FROM stats s
      CROSS JOIN today_usage t
      CROSS JOIN total_usage tu
    `);

    const stats = statsResult.rows[0];
    const estimatedCost = (parseInt(stats.total_tokens) / 1000) * 0.01;

    res.json({
      users: {
        total: parseInt(stats.total_users),
        active: parseInt(stats.active_users),
        newToday: parseInt(stats.new_users_today),
      },
      conversations: {
        total: parseInt(stats.total_conversations),
        todayCount: parseInt(stats.conversations_today),
      },
      messages: {
        total: parseInt(stats.total_messages),
        today: parseInt(stats.messages_today),
      },
      voice: {
        minutesToday: parseFloat(stats.voice_minutes_today),
        minutesTotal: parseFloat(stats.total_voice_minutes),
      },
      tokens: {
        total: parseInt(stats.total_tokens),
        today: parseInt(stats.tokens_today),
        estimatedCost: estimatedCost.toFixed(2),
      },
      files: {
        today: parseInt(stats.files_today),
        total: parseInt(stats.total_files),
      },
      system: {
        recentErrors: parseInt(stats.recent_errors),
        avgResponseTime: Math.round(parseFloat(stats.avg_response_time)),
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

    const result = await query(
      `SELECT 
         metric_type,
         AVG(value) as avg_value,
         MAX(value) as max_value,
         MIN(value) as min_value,
         COUNT(*) as count
       FROM performance_metrics 
       WHERE created_at > NOW() - INTERVAL '${parseInt(hours)} hours'
       GROUP BY metric_type
       ORDER BY metric_type`,
      []
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

export default router;
