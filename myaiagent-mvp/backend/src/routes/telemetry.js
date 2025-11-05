import express from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const telemetryStore = {
  errors: [],
  events: [],
  uiState: new Map(),
};

const MAX_STORED_ERRORS = 100;
const MAX_STORED_EVENTS = 500;
const EVENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const telemetryRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many telemetry events, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

function cleanOldData() {
  const cutoffTime = Date.now() - EVENT_RETENTION_MS;
  
  telemetryStore.errors = telemetryStore.errors.filter(
    e => new Date(e.timestamp).getTime() > cutoffTime
  );
  
  telemetryStore.events = telemetryStore.events.filter(
    e => new Date(e.timestamp).getTime() > cutoffTime
  );
}

setInterval(cleanOldData, 60 * 60 * 1000);

router.post(
  '/error',
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

      const errorEntry = {
        id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: req.user?.id || 'anonymous',
        type,
        timestamp,
        error: {
          message: error.message?.substring(0, 500),
          stack: error.stack?.substring(0, 1000),
          componentStack: error.componentStack?.substring(0, 1000),
        },
        context: {
          url: context.url?.substring(0, 200),
          userAgent: context.userAgent?.substring(0, 200),
        },
        receivedAt: new Date().toISOString(),
      };

      telemetryStore.errors.unshift(errorEntry);

      if (telemetryStore.errors.length > MAX_STORED_ERRORS) {
        telemetryStore.errors = telemetryStore.errors.slice(0, MAX_STORED_ERRORS);
      }

      console.log('[TELEMETRY] Error reported:', {
        type: errorEntry.type,
        message: errorEntry.error.message,
        url: errorEntry.context.url,
      });

      res.status(200).json({ success: true, id: errorEntry.id });
    } catch (error) {
      console.error('Error processing telemetry error:', error);
      res.status(500).json({ error: 'Failed to process error report' });
    }
  }
);

router.post(
  '/event',
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

      const eventEntry = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: req.user?.id || 'anonymous',
        type,
        timestamp,
        data,
        context: {
          url: context.url?.substring(0, 200),
          userAgent: context.userAgent?.substring(0, 200),
          viewport: context.viewport,
          performance: context.performance,
        },
        receivedAt: new Date().toISOString(),
      };

      telemetryStore.events.unshift(eventEntry);

      if (telemetryStore.events.length > MAX_STORED_EVENTS) {
        telemetryStore.events = telemetryStore.events.slice(0, MAX_STORED_EVENTS);
      }

      if (req.user?.id) {
        telemetryStore.uiState.set(req.user.id, {
          lastActivity: timestamp,
          currentPage: context.url,
          viewport: context.viewport,
          lastEvent: type,
        });
      }

      res.status(200).json({ success: true, id: eventEntry.id });
    } catch (error) {
      console.error('Error processing telemetry event:', error);
      res.status(500).json({ error: 'Failed to process event' });
    }
  }
);

router.get('/errors', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const errors = telemetryStore.errors.slice(0, limit);

    res.json({
      errors,
      total: telemetryStore.errors.length,
    });
  } catch (error) {
    console.error('Error fetching telemetry errors:', error);
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

router.get('/events', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type;

    let events = telemetryStore.events;
    if (type) {
      events = events.filter(e => e.type === type);
    }

    res.json({
      events: events.slice(0, limit),
      total: events.length,
    });
  } catch (error) {
    console.error('Error fetching telemetry events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/ui-state/:userId', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const state = telemetryStore.uiState.get(userId);

    if (!state) {
      return res.status(404).json({ error: 'No UI state found for user' });
    }

    res.json({ state });
  } catch (error) {
    console.error('Error fetching UI state:', error);
    res.status(500).json({ error: 'Failed to fetch UI state' });
  }
});

router.get('/diagnostics', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const recentErrors = telemetryStore.errors.slice(0, 10);
    const errorsByType = {};
    telemetryStore.errors.forEach(err => {
      errorsByType[err.type] = (errorsByType[err.type] || 0) + 1;
    });

    const eventsByType = {};
    telemetryStore.events.forEach(evt => {
      eventsByType[evt.type] = (eventsByType[evt.type] || 0) + 1;
    });

    res.json({
      summary: {
        totalErrors: telemetryStore.errors.length,
        totalEvents: telemetryStore.events.length,
        activeUsers: telemetryStore.uiState.size,
      },
      errorsByType,
      eventsByType,
      recentErrors,
    });
  } catch (error) {
    console.error('Error fetching diagnostics:', error);
    res.status(500).json({ error: 'Failed to fetch diagnostics' });
  }
});

export default router;
