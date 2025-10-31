import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { EventTracker } from '../services/eventTracker.js';

const router = express.Router();

router.post('/track', authenticate, async (req, res) => {
  try {
    const { eventType, eventData } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Event type is required' 
      });
    }
    
    const event = await EventTracker.logUserAction(
      req.user.id,
      eventType,
      eventData || {}
    );
    
    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Event tracking error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to track event' 
    });
  }
});

router.get('/recent', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await EventTracker.getRecentEvents(req.user.id, limit);
    
    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Get recent events error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve events' 
    });
  }
});

router.get('/since', authenticate, async (req, res) => {
  try {
    const { timestamp } = req.query;
    
    if (!timestamp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Timestamp is required' 
      });
    }
    
    const events = await EventTracker.getEventsSince(
      req.user.id,
      new Date(timestamp)
    );
    
    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Get events since error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve events' 
    });
  }
});

export default router;
