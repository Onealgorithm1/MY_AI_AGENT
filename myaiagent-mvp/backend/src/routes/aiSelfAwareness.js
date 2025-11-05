import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/frontend-diagnostics', authenticate, requireAdmin, async (req, res) => {
  try {
    const { query } = await import('../utils/database.js');

    const recentErrors = await query(
      `SELECT * FROM telemetry_errors ORDER BY created_at DESC LIMIT 20`
    );

    const errorSummary = await query(
      `SELECT 
         error_type,
         COUNT(*) as count,
         MAX(created_at) as last_occurrence
       FROM telemetry_errors
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY error_type
       ORDER BY count DESC`
    );

    const activeUsers = await query(
      `SELECT 
         user_id,
         COUNT(DISTINCT session_id) as sessions,
         MAX(timestamp) as last_activity
       FROM telemetry_events
       WHERE timestamp > NOW() - INTERVAL '1 hour'
       GROUP BY user_id`
    );

    const pageViewStats = await query(
      `SELECT 
         data->>'page' as page,
         COUNT(*) as views,
         COUNT(DISTINCT user_id) as unique_users
       FROM telemetry_events
       WHERE type = 'page_view'
         AND timestamp > NOW() - INTERVAL '24 hours'
       GROUP BY data->>'page'
       ORDER BY views DESC`
    );

    res.json({
      summary: {
        totalErrors24h: errorSummary.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        activeUsersLastHour: activeUsers.rows.length,
        mostCommonError: errorSummary.rows[0]?.error_type || 'none',
      },
      recentErrors: recentErrors.rows,
      errorSummary: errorSummary.rows,
      activeUsers: activeUsers.rows,
      pageViewStats: pageViewStats.rows,
    });
  } catch (error) {
    console.error('Error fetching frontend diagnostics:', error);
    res.status(500).json({ error: 'Failed to fetch diagnostics' });
  }
});

router.get('/user-experience/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { query } = await import('../utils/database.js');

    const recentErrors = await query(
      `SELECT * FROM telemetry_errors 
       WHERE user_id = $1 
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    const recentEvents = await query(
      `SELECT * FROM telemetry_events 
       WHERE user_id = $1 
       ORDER BY timestamp DESC LIMIT 20`,
      [userId]
    );

    const sessionStats = await query(
      `SELECT 
         session_id,
         MIN(timestamp) as session_start,
         MAX(timestamp) as session_end,
         COUNT(*) as events_count
       FROM telemetry_events
       WHERE user_id = $1
         AND timestamp > NOW() - INTERVAL '7 days'
       GROUP BY session_id
       ORDER BY session_start DESC
       LIMIT 5`,
      [userId]
    );

    res.json({
      userId,
      recentErrors: recentErrors.rows,
      recentEvents: recentEvents.rows,
      sessionStats: sessionStats.rows,
    });
  } catch (error) {
    console.error('Error fetching user experience:', error);
    res.status(500).json({ error: 'Failed to fetch user experience data' });
  }
});

router.get('/feature-health', authenticate, requireAdmin, async (req, res) => {
  try {
    const { query } = await import('../utils/database.js');

    const featureUsage = await query(
      `SELECT 
         data->>'feature' as feature,
         COUNT(*) as usage_count,
         COUNT(DISTINCT user_id) as unique_users,
         MAX(timestamp) as last_used
       FROM telemetry_events
       WHERE type = 'feature_usage'
         AND timestamp > NOW() - INTERVAL '7 days'
       GROUP BY data->>'feature'
       ORDER BY usage_count DESC`
    );

    const featureErrors = await query(
      `SELECT 
         context->>'url' as page,
         COUNT(*) as error_count,
         MAX(created_at) as last_error
       FROM telemetry_errors
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY context->>'url'
       ORDER BY error_count DESC`
    );

    res.json({
      featureUsage: featureUsage.rows,
      featureErrors: featureErrors.rows,
      healthScore: calculateHealthScore(featureUsage.rows, featureErrors.rows),
    });
  } catch (error) {
    console.error('Error fetching feature health:', error);
    res.status(500).json({ error: 'Failed to fetch feature health' });
  }
});

function calculateHealthScore(usage, errors) {
  const totalUsage = usage.reduce((sum, row) => sum + parseInt(row.usage_count), 0);
  const totalErrors = errors.reduce((sum, row) => sum + parseInt(row.error_count), 0);
  
  if (totalUsage === 0) return 100;
  
  const errorRate = totalErrors / totalUsage;
  const healthScore = Math.max(0, Math.min(100, 100 - (errorRate * 1000)));
  
  return Math.round(healthScore);
}

export default router;
