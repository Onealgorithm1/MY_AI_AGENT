import express from 'express';
import pool from '../utils/database.js';

const router = express.Router();

/**
 * GET /api/sam-gov/health - Check if SAM.gov refresh cron is running
 * Returns status, last update time, and number of cached opportunities
 */
router.get('/health', async (req, res) => {
  try {
    // Check if SAM_GOV_API_KEY is configured
    const apiKeyConfigured = !!process.env.SAM_GOV_API_KEY;

    // Get cache statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_cached,
        MAX(last_seen_at) as last_refresh_time,
        MIN(first_seen_at) as first_cached_time,
        AVG(seen_count) as avg_seen_count,
        COUNT(CASE WHEN last_seen_at > NOW() - INTERVAL '1 hour' THEN 1 END) as updated_last_hour,
        COUNT(CASE WHEN last_seen_at > NOW() - INTERVAL '24 hours' THEN 1 END) as updated_last_24h
      FROM samgov_opportunities_cache
    `);

    const stats = statsResult.rows[0];

    // Check if cron has been running (if last_refresh_time exists and is recent)
    const lastRefreshTime = stats.last_refresh_time ? new Date(stats.last_refresh_time) : null;
    const now = new Date();
    const timeSinceLastRefresh = lastRefreshTime ? (now - lastRefreshTime) / 1000 / 60 : null; // in minutes

    // Determine health status
    let cronStatus = 'unknown';
    let cronMessage = '';

    if (!lastRefreshTime) {
      cronStatus = 'no_data';
      cronMessage = 'No cached opportunities found. Cron may never have run.';
    } else if (timeSinceLastRefresh <= 70) {
      // Within 70 minutes (slightly over 1 hour to account for execution time)
      cronStatus = 'healthy';
      cronMessage = `Cron appears to be running. Last refresh: ${Math.round(timeSinceLastRefresh)} minutes ago.`;
    } else if (timeSinceLastRefresh <= 1440) {
      // Within 24 hours
      cronStatus = 'stale';
      cronMessage = `Cron may have stopped. Last refresh: ${Math.round(timeSinceLastRefresh)} minutes ago (${Math.round(timeSinceLastRefresh / 60)} hours).`;
    } else {
      cronStatus = 'offline';
      cronMessage = `Cron appears to be offline. Last refresh: ${Math.round(timeSinceLastRefresh / 60)} hours ago.`;
    }

    res.json({
      timestamp: now.toISOString(),
      cron_status: cronStatus,
      cron_message: cronMessage,
      
      api_configuration: {
        sam_gov_api_key_configured: apiKeyConfigured,
      },

      cache_statistics: {
        total_opportunities_cached: parseInt(stats.total_cached),
        last_refresh_time: lastRefreshTime?.toISOString() || null,
        minutes_since_last_refresh: timeSinceLastRefresh ? Math.round(timeSinceLastRefresh) : null,
        first_cached_time: stats.first_cached_time ? new Date(stats.first_cached_time).toISOString() : null,
        
        recent_activity: {
          updated_last_1_hour: parseInt(stats.updated_last_hour),
          updated_last_24_hours: parseInt(stats.updated_last_24h),
        },
        
        average_times_seen: parseFloat(stats.avg_seen_count).toFixed(2),
      },

      next_steps: getCronNextSteps(cronStatus, apiKeyConfigured),
    });

  } catch (error) {
    console.error('Error checking SAM.gov health:', error);
    res.status(500).json({
      error: 'Failed to check SAM.gov cron status',
      message: error.message,
    });
  }
});

/**
 * Provide actionable next steps based on cron status
 */
function getCronNextSteps(cronStatus, apiKeyConfigured) {
  const steps = [];

  if (!apiKeyConfigured) {
    steps.push({
      priority: 'critical',
      action: 'Configure SAM_GOV_API_KEY',
      details: 'Set the SAM_GOV_API_KEY environment variable to enable API access',
    });
  }

  switch (cronStatus) {
    case 'no_data':
      steps.push({
        priority: 'high',
        action: 'Run refresh script manually',
        command: 'cd myaiagent-mvp/backend && node refresh-samgov-opportunities.js',
        details: 'Test if the refresh script works and populates the cache',
      });
      steps.push({
        priority: 'high',
        action: 'Set up cron job',
        command: 'bash setup-hourly-refresh.sh',
        details: 'Create a cron job to run the refresh script every hour',
      });
      break;

    case 'stale':
    case 'offline':
      steps.push({
        priority: 'high',
        action: 'Check cron job status',
        command: 'crontab -l | grep refresh-samgov',
        details: 'Verify the cron job is still configured',
      });
      steps.push({
        priority: 'high',
        action: 'Check system logs',
        command: 'grep CRON /var/log/syslog | tail -20',
        details: 'Look for cron execution errors in system logs',
      });
      steps.push({
        priority: 'high',
        action: 'Run refresh script manually',
        command: 'cd myaiagent-mvp/backend && node refresh-samgov-opportunities.js',
        details: 'Test if the script still works',
      });
      break;

    case 'healthy':
      steps.push({
        priority: 'info',
        action: 'Monitor regularly',
        details: 'Cron job appears to be running correctly. Check this endpoint periodically.',
      });
      break;
  }

  return steps;
}

export default router;
