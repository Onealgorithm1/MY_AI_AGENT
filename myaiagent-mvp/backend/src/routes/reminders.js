import express from 'express';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// GET /api/reminders - List pending reminders for user
router.get('/', async (req, res) => {
    try {
        // Join with opportunities to get context
        const result = await query(
            `SELECT r.*, o.title as opportunity_title, o.solicitation_number, o.notice_id
       FROM opportunity_reminders r
       LEFT JOIN opportunities o ON r.opportunity_id = o.id
       WHERE r.user_id = $1 AND r.is_sent = FALSE
       ORDER BY r.reminder_date ASC`,
            [req.user.id]
        );
        res.json({ reminders: result.rows });
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
});

// POST /api/reminders - Create a reminder
router.post('/', async (req, res) => {
    try {
        const { opportunityId, reminderDate, note } = req.body;

        if (!opportunityId || !reminderDate) {
            return res.status(400).json({ error: 'opportunityId and reminderDate are required' });
        }

        const result = await query(
            `INSERT INTO opportunity_reminders (opportunity_id, user_id, reminder_date, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [opportunityId, req.user.id, reminderDate, note]
        );

        res.status(201).json({ reminder: result.rows[0] });
    } catch (error) {
        console.error('Error creating reminder:', error);
        res.status(500).json({ error: 'Failed to create reminder' });
    }
});

// DELETE /api/reminders/:id - Delete a reminder
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            `DELETE FROM opportunity_reminders WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Reminder not found or permission denied' });
        }

        res.json({ success: true, id });
    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({ error: 'Failed to delete reminder' });
    }
});

export default router;
