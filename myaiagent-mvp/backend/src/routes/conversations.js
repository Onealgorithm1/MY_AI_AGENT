import express from 'express';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all conversations for user
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0, archived = false } = req.query;

    const result = await query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
       FROM conversations c
       WHERE c.user_id = $1 AND c.archived = $2
       ORDER BY c.pinned DESC, c.updated_at DESC
       LIMIT $3 OFFSET $4`,
      [req.user.id, archived === 'true', parseInt(limit), parseInt(offset)]
    );

    res.json({
      conversations: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get single conversation
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation: result.rows[0] });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Create new conversation
router.post('/', authenticate, async (req, res) => {
  try {
    const { title = 'New Conversation', model = 'gpt-4o' } = req.body;

    const result = await query(
      `INSERT INTO conversations (user_id, title, model)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, title, model]
    );

    res.status(201).json({ conversation: result.rows[0] });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Update conversation
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, model, pinned, archived } = req.body;

    // Verify ownership
    const check = await query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (model !== undefined) {
      updates.push(`model = $${paramCount++}`);
      values.push(model);
    }
    if (pinned !== undefined) {
      updates.push(`pinned = $${paramCount++}`);
      values.push(pinned);
    }
    if (archived !== undefined) {
      updates.push(`archived = $${paramCount++}`);
      values.push(archived);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);

    const result = await query(
      `UPDATE conversations SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json({ conversation: result.rows[0] });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete conversation
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Get messages for conversation
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify ownership
    const check = await query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const result = await query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      messages: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

export default router;
