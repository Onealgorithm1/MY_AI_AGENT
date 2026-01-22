import express from 'express';
import intelligenceService from '../services/intelligence.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// GET /api/recommendations
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const recommendations = await intelligenceService.getRecommendations(req.user.id, limit);
        res.json({ recommendations });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

export default router;
