import express from 'express';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// GET /api/saved-searches - List saved searches
router.get('/', async (req, res) => {
    try {
        const result = await query(
            `SELECT * FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json({ searches: result.rows });
    } catch (error) {
        console.error('Error fetching saved searches:', error);
        res.status(500).json({ error: 'Failed to fetch saved searches' });
    }
});

// POST /api/saved-searches - Create saved search
router.post('/', async (req, res) => {
    try {
        const { name, filters, frequency } = req.body;

        if (!name || !filters) {
            return res.status(400).json({ error: 'Name and filters are required' });
        }

        const result = await query(
            `INSERT INTO saved_searches (user_id, name, filters, frequency)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [req.user.id, name, filters, frequency || 'daily']
        );

        res.status(201).json({ search: result.rows[0] });
    } catch (error) {
        console.error('Error creating saved search:', error);
        res.status(500).json({ error: 'Failed to create saved search' });
    }
});

// DELETE /api/saved-searches/:id - Delete saved search
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            `DELETE FROM saved_searches WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Saved search not found or permission denied' });
        }

        res.json({ success: true, id });
    } catch (error) {
        console.error('Error deleting saved search:', error);
        res.status(500).json({ error: 'Failed to delete saved search' });
    }
});

export default router;
