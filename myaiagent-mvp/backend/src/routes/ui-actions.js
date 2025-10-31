import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { ActionExecutor } from '../services/actionExecutor.js';

const router = express.Router();

router.post('/execute', authenticate, async (req, res) => {
  try {
    const { action, params } = req.body;
    
    if (!action) {
      return res.status(400).json({ 
        success: false, 
        error: 'Action type is required' 
      });
    }
    
    const result = await ActionExecutor.executeAction(
      action,
      params || {},
      req.user.id
    );
    
    res.json(result);
  } catch (error) {
    console.error('UI Action execution error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.post('/validate', authenticate, async (req, res) => {
  try {
    const { action, params } = req.body;
    
    if (!action) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Action type is required' 
      });
    }
    
    const validation = await ActionExecutor.validateAction(
      action,
      params || {},
      req.user.id
    );
    
    res.json(validation);
  } catch (error) {
    console.error('UI Action validation error:', error);
    res.status(400).json({ 
      valid: false, 
      error: error.message 
    });
  }
});

router.get('/available', authenticate, async (req, res) => {
  try {
    const actions = ActionExecutor.getAvailableActions(req.user.role);
    
    res.json({
      success: true,
      actions
    });
  } catch (error) {
    console.error('Get available actions error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve available actions' 
    });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const pool = (await import('../utils/database.js')).default;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await pool.query(
      `SELECT id, action_type, action_params, executed_at, success 
       FROM ui_actions 
       WHERE user_id = $1 
       ORDER BY executed_at DESC 
       LIMIT $2`,
      [req.user.id, limit]
    );
    
    res.json({
      success: true,
      history: result.rows
    });
  } catch (error) {
    console.error('Get action history error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve action history' 
    });
  }
});

export default router;
