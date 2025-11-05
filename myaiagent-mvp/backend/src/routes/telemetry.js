import express from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { query } from '../utils/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const telemetryRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many telemetry events, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/error',
  authenticate,
  telemetryRateLimiter,
  [
    body('type').isString().trim().notEmpty(),
    body('timestamp').isISO8601(),
    body('error').isObject(),
    body('context').isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, timestamp, error, context } = req.body;
      const userId = req.user?.id || null;

      const sessionId = req.headers['x-session-id'] || `session_${Date.now()}`;

      await query(
        `INSERT INTO telemetry_errors 
         (user_id, session_id, error_type, error_message, error_stack, component_stack, context, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          sessionId,
          type,
          error.message?.substring(0, 500),
          error.stack?.substring(0, 1000),
          error.componentStack?.substring(0, 1000),
          JSON.stringify(context),
          timestamp,
        ]
      );

      console.log('[TELEMETRY] Error reported:', {
        type,
        message: error.message,
        url: context.url,
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error processing telemetry error:', error);
      res.status(500).json({ error: 'Failed to process error report' });
    }
  }
);

router.post(
  '/event',
  authenticate,
  telemetryRateLimiter,
  [
    body('type').isString().trim().notEmpty(),
    body('timestamp').isISO8601(),
    body('data').isObject(),
    body('context').isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, timestamp, data, context } = req.body;
      const userId = req.user?.id || null;

      const sessionId = req.headers['x-session-id'] || `session_${Date.now()}`;

      await query(
        `INSERT INTO telemetry_events 
         (user_id, session_id, type, data, context, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          sessionId,
          type,
          JSON.stringify(data),
          JSON.stringify(context),
          timestamp,
        ]
      );

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error processing telemetry event:', error);
      res.status(500).json({ error: 'Failed to process event' });
    }
  }
);

router.get('/errors', authenticate, requireAdmin, async (req, res) => {
  try {

    const limit = parseInt(req.query.limit) || 50;
    
    const result = await query(
      `SELECT * FROM telemetry_errors 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );

    res.json({
      errors: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching telemetry errors:', error);
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

router.get('/events', authenticate, requireAdmin, async (req, res) => {
  try {

    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type;

    let queryText = `SELECT * FROM telemetry_events`;
    const params = [];

    if (type) {
      queryText += ` WHERE type = $1`;
      params.push(type);
    }

    queryText += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(queryText, params);

    res.json({
      events: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching telemetry events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/diagnostics', authenticate, requireAdmin, async (req, res) => {
  try {

    const [errorsResult, eventsResult, errorsByTypeResult, eventsByTypeResult] = await Promise.all([
      query(`SELECT COUNT(*) FROM telemetry_errors WHERE created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(*) FROM telemetry_events WHERE timestamp > NOW() - INTERVAL '24 hours'`),
      query(`
        SELECT error_type, COUNT(*) as count
        FROM telemetry_errors
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY error_type
        ORDER BY count DESC
        LIMIT 10
      `),
      query(`
        SELECT type, COUNT(*) as count
        FROM telemetry_events
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY type
        ORDER BY count DESC
        LIMIT 10
      `),
    ]);

    const recentErrorsResult = await query(
      `SELECT * FROM telemetry_errors 
       ORDER BY created_at DESC 
       LIMIT 10`
    );

    res.json({
      summary: {
        totalErrors: parseInt(errorsResult.rows[0].count),
        totalEvents: parseInt(eventsResult.rows[0].count),
      },
      errorsByType: errorsByTypeResult.rows,
      eventsByType: eventsByTypeResult.rows,
      recentErrors: recentErrorsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching diagnostics:', error);
    res.status(500).json({ error: 'Failed to fetch diagnostics' });
  }
});

export default router;
