import express from 'express';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';
import { checkRateLimit } from '../middleware/rateLimit.js';
import { attachUIContext, generateUIAwarePrompt, buildEnhancedContext } from '../middleware/uiContext.js';
import { 
  createChatCompletion, 
  buildMessagesWithMemory,
  estimateTokens 
} from '../services/openai.js';

const router = express.Router();

// Send message and get AI response
router.post('/', authenticate, attachUIContext, checkRateLimit, async (req, res) => {
  try {
    const { conversationId, content, model = 'gpt-4o', stream = false } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ error: 'conversationId and content required' });
    }

    // Verify conversation ownership
    const convCheck = await query(
      'SELECT id, model FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, req.user.id]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = convCheck.rows[0];
    const selectedModel = model || conversation.model;

    // Save user message
    const userMessage = await query(
      `INSERT INTO messages (conversation_id, role, content, model)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [conversationId, 'user', content, selectedModel]
    );

    // Get conversation history
    const historyResult = await query(
      `SELECT role, content FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC
       LIMIT 20`,
      [conversationId]
    );

    const conversationHistory = historyResult.rows.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Get user's memory facts
    const memoryResult = await query(
      `SELECT fact, category FROM memory_facts 
       WHERE user_id = $1 AND approved = true
       ORDER BY last_referenced_at DESC
       LIMIT 10`,
      [req.user.id]
    );

    const memoryFacts = memoryResult.rows;

    // Build UI-aware context
    const uiAwareSystemPrompt = generateUIAwarePrompt(req.uiContext, {
      fullName: req.user.fullName,
      role: req.user.role
    });

    // Build messages with memory context and UI awareness
    const messages = buildMessagesWithMemory(conversationHistory, memoryFacts, selectedModel, uiAwareSystemPrompt);

    // Update memory references
    if (memoryFacts.length > 0) {
      await query(
        `UPDATE memory_facts 
         SET times_referenced = times_referenced + 1,
             last_referenced_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [req.user.id]
      );
    }

    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.flushHeaders(); // Send headers immediately

      let fullResponse = '';
      let tokensUsed = 0;

      const completion = await createChatCompletion(messages, selectedModel, true);

      completion.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.includes('[DONE]')) continue;
          
          try {
            const parsed = JSON.parse(line.replace('data: ', ''));
            const content = parsed.choices[0]?.delta?.content;
            
            if (content) {
              fullResponse += content;
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      });

      completion.on('end', async () => {
        tokensUsed = estimateTokens(fullResponse);

        // Save assistant message
        await query(
          `INSERT INTO messages (conversation_id, role, content, model, tokens_used)
           VALUES ($1, $2, $3, $4, $5)`,
          [conversationId, 'assistant', fullResponse, selectedModel, tokensUsed]
        );

        // Update usage tracking
        await query(
          `UPDATE usage_tracking 
           SET messages_sent = messages_sent + 1,
               tokens_consumed = tokens_consumed + $1
           WHERE user_id = $2 AND date = CURRENT_DATE`,
          [tokensUsed, req.user.id]
        );

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      });

      completion.on('error', (error) => {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
        res.end();
      });

    } else {
      // Non-streaming response
      const completion = await createChatCompletion(messages, selectedModel, false);
      const aiResponse = completion.choices[0].message.content;
      const tokensUsed = completion.usage.total_tokens;

      // Save assistant message
      const assistantMessage = await query(
        `INSERT INTO messages (conversation_id, role, content, model, tokens_used)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [conversationId, 'assistant', aiResponse, selectedModel, tokensUsed]
      );

      // Update usage tracking
      await query(
        `UPDATE usage_tracking 
         SET messages_sent = messages_sent + 1,
             tokens_consumed = tokens_consumed + $1
         WHERE user_id = $2 AND date = CURRENT_DATE`,
        [tokensUsed, req.user.id]
      );

      res.json({
        message: assistantMessage.rows[0],
        tokensUsed,
      });
    }

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get single message
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT m.* FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.id = $1 AND c.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to get message' });
  }
});

// Delete message
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM messages m
       USING conversations c
       WHERE m.id = $1 
       AND m.conversation_id = c.id 
       AND c.user_id = $2
       RETURNING m.id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
