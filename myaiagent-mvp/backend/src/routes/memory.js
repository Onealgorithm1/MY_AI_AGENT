import express from 'express';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';
import { extractMemoryFacts } from '../services/openai.js';
import cache from '../services/cacheService.js';

const router = express.Router();

// Get all memory facts for user (with caching)
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, approved } = req.query;

    // Create cache key based on query parameters
    const cacheKey = `${req.user.id}:${category || 'all'}:${approved || 'all'}`;

    // Check cache first
    const cached = cache.get('memory_facts', cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let sql = `SELECT
      id,
      user_id,
      fact_text as fact,
      fact_type as category,
      conversation_id as source_conversation_id,
      source_message_id,
      COALESCE(relevance_score, 1.0) as confidence,
      false as manually_added,
      approved,
      created_at,
      created_at as last_referenced_at,
      0 as times_referenced
    FROM memory_facts
    WHERE user_id = $1`;
    const params = [req.user.id];
    let paramCount = 2;

    if (category) {
      sql += ` AND fact_type = $${paramCount++}`;
      params.push(category);
    }

    if (approved !== undefined) {
      sql += ` AND approved = $${paramCount++}`;
      params.push(approved === 'true');
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);

    const response = {
      facts: result.rows,
      total: result.rows.length,
    };

    // Cache for 3 minutes (memory facts change less frequently)
    cache.set('memory_facts', cacheKey, response, 3 * 60 * 1000);

    res.json(response);
  } catch (error) {
    console.error('Get memory facts error:', error);
    res.status(500).json({ error: 'Failed to get memory facts' });
  }
});

// Add memory fact manually
router.post('/', authenticate, async (req, res) => {
  try {
    const { fact, category = 'general' } = req.body;

    if (!fact) {
      return res.status(400).json({ error: 'Fact is required' });
    }

    const result = await query(
      `INSERT INTO memory_facts (user_id, fact_text, fact_type, approved)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, fact_text as fact, fact_type as category, approved, created_at`,
      [req.user.id, fact, category, true]
    );

    // Invalidate memory facts cache for this user
    cache.invalidateNamespace('memory_facts');

    res.status(201).json({ memoryFact: result.rows[0] });
  } catch (error) {
    console.error('Add memory fact error:', error);
    res.status(500).json({ error: 'Failed to add memory fact' });
  }
});

// Extract memory facts from conversation
router.post('/extract/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify conversation ownership
    const convCheck = await query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, req.user.id]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get conversation messages
    const messages = await query(
      `SELECT role, content FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    if (messages.rows.length === 0) {
      return res.json({ memoryFacts: [], message: 'No messages to analyze' });
    }

    // Extract facts using AI
    const extractedFacts = await extractMemoryFacts(messages.rows);

    // Save facts using bulk insert for better performance
    let savedFacts = [];
    
    if (extractedFacts.length > 0) {
      // Build bulk insert query
      const values = extractedFacts.map((factData, index) => {
        const baseParam = index * 7;
        return `($${baseParam + 1}, $${baseParam + 2}, $${baseParam + 3}, $${baseParam + 4}, $${baseParam + 5}, $${baseParam + 6}, $${baseParam + 7})`;
      }).join(', ');

      const params = extractedFacts.flatMap(factData => [
        req.user.id,
        factData.fact,
        factData.category || 'general',
        conversationId,
        false,
        false, // Requires user approval
        factData.confidence || 0.8,
      ]);

      const result = await query(
        `INSERT INTO memory_facts 
         (user_id, fact, category, source_conversation_id, manually_added, approved, confidence)
         VALUES ${values}
         ON CONFLICT DO NOTHING
         RETURNING *`,
        params
      );

      savedFacts = result.rows;
      
      // Invalidate memory facts cache for this user
      cache.invalidateNamespace('memory_facts');
    }

    res.json({
      memoryFacts: savedFacts,
      total: savedFacts.length,
      message: `Extracted ${savedFacts.length} new facts for your review`,
    });
  } catch (error) {
    console.error('Extract memory facts error:', error);
    res.status(500).json({ error: 'Failed to extract memory facts' });
  }
});

// Update memory fact
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { fact, category, approved } = req.body;

    // Verify ownership
    const check = await query(
      'SELECT id FROM memory_facts WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Memory fact not found' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fact !== undefined) {
      updates.push(`fact = $${paramCount++}`);
      values.push(fact);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (approved !== undefined) {
      updates.push(`approved = $${paramCount++}`);
      values.push(approved);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);

    const result = await query(
      `UPDATE memory_facts SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    // Invalidate memory facts cache
    cache.invalidateNamespace('memory_facts');

    res.json({ memoryFact: result.rows[0] });
  } catch (error) {
    console.error('Update memory fact error:', error);
    res.status(500).json({ error: 'Failed to update memory fact' });
  }
});

// Delete memory fact
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM memory_facts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Memory fact not found' });
    }

    // Invalidate memory facts cache
    cache.invalidateNamespace('memory_facts');

    res.json({ message: 'Memory fact deleted successfully' });
  } catch (error) {
    console.error('Delete memory fact error:', error);
    res.status(500).json({ error: 'Failed to delete memory fact' });
  }
});

// Clear all memory facts for user
router.delete('/', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM memory_facts WHERE user_id = $1', [req.user.id]);

    // Invalidate memory facts cache
    cache.invalidateNamespace('memory_facts');

    res.json({ message: 'All memory facts cleared' });
  } catch (error) {
    console.error('Clear memory error:', error);
    res.status(500).json({ error: 'Failed to clear memory' });
  }
});

// Get memory categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT category, COUNT(*) as count 
       FROM memory_facts 
       WHERE user_id = $1 AND approved = true
       GROUP BY category
       ORDER BY count DESC`,
      [req.user.id]
    );

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router;
