import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { performWebSearch, logSearchUsage } from '../services/webSearch.js';
import monitoringService from '../services/monitoringService.js';

const router = express.Router();

router.use(authenticate);

router.post('/web-search', async (req, res) => {
  try {
    const { query: searchQuery, numResults = 5, conversationId } = req.body;

    if (!searchQuery || typeof searchQuery !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (searchQuery.trim().length === 0) {
      return res.status(400).json({ error: 'Search query cannot be empty' });
    }

    const results = await performWebSearch(searchQuery, numResults);
    
    await logSearchUsage(
      req.user.id,
      searchQuery,
      results.results.length,
      conversationId
    );

    res.json(results);
  } catch (error) {
    console.error('Web search endpoint error:', error);
    res.status(500).json({ 
      error: error.message || 'Web search failed',
      success: false 
    });
  }
});

router.get('/search-history', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const { query } = await import('../utils/database.js');

    const result = await query(
      `SELECT id, query, results_count, conversation_id, searched_at, metadata
       FROM search_history
       WHERE user_id = $1
       ORDER BY searched_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ searches: result.rows });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ error: 'Failed to get search history' });
  }
});

/**
 * AI Self-Awareness: Get performance summary
 * Allows AI to understand its own operational performance
 */
router.get('/performance-metrics', async (req, res) => {
  try {
    const { timeRange = '1 hour' } = req.query;
    
    const summary = await monitoringService.getPerformanceSummary(timeRange);
    
    res.json({
      success: true,
      timeRange,
      metrics: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to get performance metrics',
      success: false 
    });
  }
});

/**
 * AI Self-Awareness: Query specific metric
 * Allows AI to drill down into specific performance data
 */
router.post('/performance-query', async (req, res) => {
  try {
    const { metricName, timeRange = '1 hour', tags = {}, limit = 100 } = req.body;
    
    if (!metricName) {
      return res.status(400).json({ error: 'metricName is required' });
    }
    
    const metrics = await monitoringService.queryMetrics(metricName, {
      timeRange,
      tags,
      limit
    });
    
    res.json({
      success: true,
      metricName,
      dataPoints: metrics,
      count: metrics.length
    });
  } catch (error) {
    console.error('Performance query error:', error);
    res.status(500).json({ 
      error: 'Failed to query performance metrics',
      success: false 
    });
  }
});

/**
 * AI Self-Awareness: Detect anomalies
 * Allows AI to identify its own performance issues
 */
router.post('/performance-anomalies', async (req, res) => {
  try {
    const { metricName, timeRange = '1 hour' } = req.body;
    
    if (!metricName) {
      return res.status(400).json({ error: 'metricName is required' });
    }
    
    const anomalyReport = await monitoringService.detectAnomalies(metricName, timeRange);
    
    res.json({
      success: true,
      metricName,
      ...anomalyReport
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({ 
      error: 'Failed to detect anomalies',
      success: false 
    });
  }
});

/**
 * AI Self-Awareness: Get active anomalies
 * Shows all detected anomalies across all metrics
 */
router.get('/active-anomalies', async (req, res) => {
  try {
    const { timeRange = '24 hours', minSeverity = 'low' } = req.query;
    
    const anomalies = await monitoringService.getActiveAnomalies(timeRange, minSeverity);
    
    res.json({
      success: true,
      anomalies,
      count: anomalies.length,
      timeRange
    });
  } catch (error) {
    console.error('Get active anomalies error:', error);
    res.status(500).json({ 
      error: 'Failed to get active anomalies',
      success: false 
    });
  }
});

export default router;
