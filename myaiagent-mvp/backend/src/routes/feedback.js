import express from 'express';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Submit feedback
router.post('/', authenticate, async (req, res) => {
  try {
    const { conversationId, messageId, rating, feedbackType, comment } = req.body;

    if (!rating || (rating !== 1 && rating !== -1)) {
      return res.status(400).json({ error: 'Rating must be 1 (thumbs up) or -1 (thumbs down)' });
    }

    const result = await query(
      `INSERT INTO feedback (user_id, conversation_id, message_id, rating, feedback_type, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, conversationId || null, messageId || null, rating, feedbackType || null, comment || null]
    );

    res.status(201).json({
      feedback: result.rows[0],
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get user's feedback history
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(
      `SELECT f.*, 
              c.title as conversation_title,
              m.content as message_content
       FROM feedback f
       LEFT JOIN conversations c ON f.conversation_id = c.id
       LEFT JOIN messages m ON f.message_id = m.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      feedback: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Get feedback for specific message
router.get('/message/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await query(
      `SELECT f.* FROM feedback f
       JOIN messages m ON f.message_id = m.id
       JOIN conversations c ON m.conversation_id = c.id
       WHERE f.message_id = $1 AND c.user_id = $2`,
      [messageId, req.user.id]
    );

    res.json({ feedback: result.rows });
  } catch (error) {
    console.error('Get message feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Delete feedback
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM feedback WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

export default router;
