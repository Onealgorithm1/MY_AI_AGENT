import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { performWebSearch, logSearchUsage } from '../services/webSearch.js';

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

export default router;
