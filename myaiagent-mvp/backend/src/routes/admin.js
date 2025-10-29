import express from 'express';
import { query } from '../utils/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin
router.use(authenticate, requireAdmin);

// Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Total users
    const usersResult = await query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Active users (logged in last 7 days)
    const activeUsersResult = await query(
      `SELECT COUNT(*) FROM users 
       WHERE last_login_at > NOW() - INTERVAL '7 days'`
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].count);

    // Total conversations
    const conversationsResult = await query('SELECT COUNT(*) FROM conversations');
    const totalConversations = parseInt(conversationsResult.rows[0].count);

    // Total messages
    const messagesResult = await query('SELECT COUNT(*) FROM messages');
    const totalMessages = parseInt(messagesResult.rows[0].count);

    // Today's usage
    const todayUsageResult = await query(
      `SELECT 
         SUM(messages_sent) as messages_today,
         SUM(voice_minutes_used) as voice_minutes_today,
         SUM(tokens_consumed) as tokens_today,
         SUM(files_uploaded) as files_today
       FROM usage_tracking 
       WHERE date = CURRENT_DATE`
    );
    const todayUsage = todayUsageResult.rows[0];

    // Total tokens used (all time)
    const totalTokensResult = await query(
      'SELECT SUM(tokens_consumed) as total_tokens FROM usage_tracking'
    );
    const totalTokens = parseInt(totalTokensResult.rows[0].total_tokens) || 0;

    // Estimated cost (rough: $0.01 per 1000 tokens)
    const estimatedCost = (totalTokens / 1000) * 0.01;

    // Error count (last 24 hours)
    const errorsResult = await query(
      `SELECT COUNT(*) FROM error_logs 
       WHERE created_at > NOW() - INTERVAL '24 hours' AND resolved = false`
    );
    const recentErrors = parseInt(errorsResult.rows[0].count);

    // Average response time (last 100 requests)
    const perfResult = await query(
      `SELECT AVG(duration_ms) as avg_duration 
       FROM performance_metrics 
       WHERE created_at > NOW() - INTERVAL '1 hour'
       LIMIT 100`
    );
    const avgResponseTime = Math.round(perfResult.rows[0].avg_duration) || 0;

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: 0, // TODO: Calculate
      },
      conversations: {
        total: totalConversations,
        todayCount: 0, // TODO: Calculate
      },
      messages: {
        total: totalMessages,
        today: parseInt(todayUsage.messages_today) || 0,
      },
      voice: {
        minutesToday: parseFloat(todayUsage.voice_minutes_today) || 0,
        minutesTotal: 0, // TODO: Calculate
      },
      tokens: {
        total: totalTokens,
        today: parseInt(todayUsage.tokens_today) || 0,
        estimatedCost: estimatedCost.toFixed(2),
      },
      files: {
        today: parseInt(todayUsage.files_today) || 0,
        total: 0, // TODO: Calculate
      },
      system: {
        recentErrors,
        avgResponseTime,
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
    const openaiKey = process.env.OPENAI_API_KEY;

    res.json({
      openai: {
        configured: !!openaiKey,
        preview: openaiKey ? `${openaiKey.substring(0, 10)}...${openaiKey.substring(openaiKey.length - 4)}` : null,
      },
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
});

export default router;
