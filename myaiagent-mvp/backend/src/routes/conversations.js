import express from 'express';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all conversations for user
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0, archived = false } = req.query;

    // Validate and sanitize pagination parameters
    const validatedLimit = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const validatedOffset = Math.max(0, parseInt(offset) || 0);

    const result = await query(
      `SELECT c.id, c.user_id, c.title, c.model, c.pinned, c.archived,
              c.created_at, c.updated_at,
              COUNT(m.id) as message_count
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.user_id = $1 AND c.archived = $2
       GROUP BY c.id, c.user_id, c.title, c.model, c.pinned, c.archived,
                c.created_at, c.updated_at
       ORDER BY c.pinned DESC, c.updated_at DESC
       LIMIT $3 OFFSET $4`,
      [req.user.id, archived === 'true', validatedLimit, validatedOffset]
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

    // Get messages and verify ownership in one query
    const result = await query(
      `SELECT m.* 
       FROM messages m
       INNER JOIN conversations c ON c.id = m.conversation_id
       WHERE m.conversation_id = $1 AND c.user_id = $2
       ORDER BY m.created_at ASC
       LIMIT $3 OFFSET $4`,
      [id, req.user.id, parseInt(limit), parseInt(offset)]
    );

    if (result.rows.length === 0) {
      // Check if conversation exists to distinguish between "not found" and "no messages"
      const check = await query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    }

    res.json({
      messages: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Get conversation analytics/insights
router.get('/:id/analytics', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const check = await query(
      'SELECT id, created_at FROM conversations WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get comprehensive analytics in a single query
    const analytics = await query(
      `WITH message_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE role = 'user') as user_messages,
          COUNT(*) FILTER (WHERE role = 'assistant') as ai_messages,
          COUNT(DISTINCT model) as models_used,
          array_agg(DISTINCT model) FILTER (WHERE model IS NOT NULL) as models_list,
          COUNT(*) FILTER (WHERE metadata->>'autoSelected' = 'true') as auto_selections
        FROM messages
        WHERE conversation_id = $1
      ),
      memory_stats AS (
        SELECT COUNT(*) as facts_extracted
        FROM memory_facts
        WHERE source_conversation_id = $1
      ),
      feedback_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE rating = 1) as positive_feedback,
          COUNT(*) FILTER (WHERE rating = -1) as negative_feedback,
          ROUND(AVG(rating)::numeric, 2) as avg_rating
        FROM feedback
        WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = $1)
      )
      SELECT 
        ms.user_messages,
        ms.ai_messages,
        ms.models_used,
        ms.models_list,
        ms.auto_selections,
        COALESCE(mem.facts_extracted, 0) as facts_extracted,
        COALESCE(fb.positive_feedback, 0) as positive_feedback,
        COALESCE(fb.negative_feedback, 0) as negative_feedback,
        fb.avg_rating
      FROM message_stats ms
      CROSS JOIN memory_stats mem
      CROSS JOIN feedback_stats fb`,
      [id]
    );

    res.json({
      conversationId: id,
      createdAt: check.rows[0].created_at,
      analytics: analytics.rows[0]
    });
  } catch (error) {
    console.error('Get conversation analytics error:', error);
    res.status(500).json({ error: 'Failed to get conversation analytics' });
  }
});

// Helper function to extract keywords and generate title (exported for use in messages route)
export function generateTitleFromMessages(messages) {
  // Common stop words to filter out
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'what', 'when', 'where', 'who', 'why',
    'how', 'can', 'could', 'should', 'would', 'i', 'you', 'we', 'they',
    'my', 'your', 'me', 'this', 'these', 'those', 'do', 'does', 'did',
    'have', 'had', 'been', 'being', 'but', 'or', 'if', 'then', 'than',
    'so', 'just', 'now', 'any', 'some', 'all', 'get', 'make', 'go',
    'want', 'need', 'like', 'know', 'think', 'see', 'use', 'help',
    'please', 'thanks', 'thank', 'hello', 'hi', 'hey'
  ]);

  // Combine all user message content
  const allText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ');

  if (!allText || allText.trim().length === 0) {
    return 'New Chat';
  }

  // Tokenize: lowercase, remove punctuation, split on whitespace
  const words = allText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  if (words.length === 0) {
    return 'New Chat';
  }

  // Count word frequency
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Sort by frequency, then alphabetically
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // Sort by frequency descending
      return a[0].localeCompare(b[0]); // Then alphabetically
    })
    .map(([word]) => word);

  // Take top 2-4 words and capitalize them
  const keyWords = sortedWords.slice(0, 4).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  );

  // Construct title
  let title = keyWords.join(' ');

  // If title is too short, try to add more context
  if (title.length < 10 && keyWords.length < 4) {
    const additionalWords = sortedWords.slice(keyWords.length, 6).map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    );
    title = [...keyWords, ...additionalWords].slice(0, 4).join(' ');
  }

  // Truncate if too long (max 50 characters)
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }

  // Fallback if still empty or too short
  if (!title || title.length < 3) {
    return 'New Chat';
  }

  return title;
}

// Auto-generate conversation title based on content
router.post('/:id/auto-name', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const check = await query(
      'SELECT id, title FROM conversations WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const currentTitle = check.rows[0].title;

    // Don't auto-rename if user has manually changed the title
    // (We'll consider it manual if it's not a default title)
    const defaultTitles = ['New Conversation', 'New Chat', 'Untitled Chat'];
    if (!defaultTitles.includes(currentTitle)) {
      return res.json({ 
        message: 'Conversation already has a custom title',
        title: currentTitle,
        renamed: false
      });
    }

    // Get first 3 user messages
    const messages = await query(
      `SELECT role, content FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC
       LIMIT 5`,
      [id]
    );

    if (messages.rows.length === 0) {
      return res.json({ 
        message: 'No messages found to generate title',
        title: currentTitle,
        renamed: false
      });
    }

    // Generate title from messages
    const newTitle = generateTitleFromMessages(messages.rows);

    // Update conversation title
    const result = await query(
      `UPDATE conversations 
       SET title = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3 
       RETURNING id, title`,
      [newTitle, id, req.user.id]
    );

    res.json({
      message: 'Conversation title auto-generated',
      title: result.rows[0].title,
      renamed: true
    });
  } catch (error) {
    console.error('Auto-name conversation error:', error);
    res.status(500).json({ error: 'Failed to auto-name conversation' });
  }
});

// Export auto-naming function for direct use (no HTTP needed)
export async function autoNameConversation(conversationId, userId) {
  try {
    // Verify ownership
    const check = await query(
      'SELECT id, title FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (check.rows.length === 0) {
      return { success: false, message: 'Conversation not found' };
    }

    const currentTitle = check.rows[0].title;

    // Don't auto-rename if user has manually changed the title
    const defaultTitles = ['New Conversation', 'New Chat', 'Untitled Chat'];
    if (!defaultTitles.includes(currentTitle)) {
      return { 
        success: false,
        message: 'Conversation already has a custom title',
        title: currentTitle
      };
    }

    // Get first 5 user messages
    const messages = await query(
      `SELECT role, content FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC
       LIMIT 5`,
      [conversationId]
    );

    if (messages.rows.length === 0) {
      return { 
        success: false,
        message: 'No messages found to generate title',
        title: currentTitle
      };
    }

    // Generate title from messages
    const newTitle = generateTitleFromMessages(messages.rows);

    // Update conversation title
    const result = await query(
      `UPDATE conversations 
       SET title = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3 
       RETURNING id, title`,
      [newTitle, conversationId, userId]
    );

    return {
      success: true,
      message: 'Conversation title auto-generated',
      title: result.rows[0].title
    };
  } catch (error) {
    console.error('Auto-name conversation error:', error);
    return { success: false, message: 'Failed to auto-name conversation' };
  }
}

export default router;
