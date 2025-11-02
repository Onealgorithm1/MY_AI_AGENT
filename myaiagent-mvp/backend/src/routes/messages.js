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
import { selectBestModel, explainModelSelection } from '../services/modelSelector.js';
import { UI_FUNCTIONS, executeUIFunction } from '../services/uiFunctions.js';
import { autoNameConversation } from './conversations.js';

const router = express.Router();

// Helper function to trigger auto-naming after a few messages
async function triggerAutoNaming(conversationId, userId) {
  try {
    // Count user messages in this conversation
    const countResult = await query(
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1 AND role = $2',
      [conversationId, 'user']
    );
    
    const userMessageCount = parseInt(countResult.rows[0].count);
    
    // Trigger auto-naming after 2-3 user messages
    if (userMessageCount === 2 || userMessageCount === 3) {
      // Call auto-naming function directly (asynchronously, don't await)
      setImmediate(async () => {
        try {
          const result = await autoNameConversation(conversationId, userId);
          if (result.success) {
            console.log(`📝 Auto-named conversation ${conversationId} to "${result.title}" after ${userMessageCount} messages`);
          }
        } catch (error) {
          // Silently fail - auto-naming is not critical
          console.error('Auto-naming failed (non-critical):', error.message);
        }
      });
    }
  } catch (error) {
    // Silently fail - don't disrupt message flow
    console.error('Auto-naming trigger error:', error);
  }
}

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
    let selectedModel = model || conversation.model;
    let wasAutoSelected = false;
    
    // Auto model selection
    if (selectedModel === 'auto') {
      wasAutoSelected = true;
      // Get conversation history for context
      const historyForSelection = await query(
        `SELECT role, content FROM messages 
         WHERE conversation_id = $1 
         ORDER BY created_at ASC
         LIMIT 20`,
        [conversationId]
      );
      
      const hasAttachments = req.body.attachments && req.body.attachments.length > 0;
      selectedModel = selectBestModel(content, hasAttachments, historyForSelection.rows);
      
      console.log(`🤖 Auto-selected model: ${selectedModel} for query: "${content.substring(0, 50)}..."`);
    }

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

    // Build UI-aware context with complete user information
    const uiAwareSystemPrompt = generateUIAwarePrompt(req.uiContext, {
      fullName: req.user.full_name,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone,
      profileImage: req.user.profile_image,
      createdAt: req.user.created_at,
      lastLoginAt: req.user.last_login_at,
      settings: req.user.settings,
      preferences: req.user.preferences,
      googleId: req.user.google_id
    }, req.fullUISchema);

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

    // Detect if message is an action request (only pass functions if likely)
    const actionKeywords = [
      'switch', 'change', 'use', 'select', 'set', // model selection  
      'create', 'new', 'start', 'make', // creation
      'delete', 'remove', 'clear', 'trash', // deletion
      'rename', 'call', 'name', // renaming
      'pin', 'unpin', // pinning
      'navigate', 'go to', 'open', // navigation
      'upload', 'attach', 'file', // file upload
      'voice', 'call', 'speak', // voice
      'email', 'mail', 'inbox', 'send', 'read', 'search', 'archive', 'message', // gmail
      'calendar', 'event', 'schedule', 'meeting', 'appointment', // calendar
      'drive', 'files', 'folder', 'document', 'share', 'storage', // drive
      'doc', 'docs', 'write', 'edit', 'text', // docs
      'sheet', 'sheets', 'spreadsheet', 'table', 'data', 'row', 'column', 'cell' // sheets
    ];
    const lowercaseContent = content.toLowerCase();
    const isLikelyAction = actionKeywords.some(keyword => lowercaseContent.includes(keyword));
    
    // Only pass functions if message likely contains an action request
    const functionsToPass = isLikelyAction ? UI_FUNCTIONS : null;

    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.flushHeaders(); // Send headers immediately

      let fullResponse = '';
      let tokensUsed = 0;
      let functionCall = null;
      let functionName = '';
      let functionArgs = '';

      const completion = await createChatCompletion(messages, selectedModel, true, functionsToPass);

      completion.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.includes('[DONE]')) continue;
          
          try {
            const parsed = JSON.parse(line.replace('data: ', ''));
            const delta = parsed.choices[0]?.delta;
            
            // Check for function call
            if (delta?.function_call) {
              if (delta.function_call.name) {
                functionName = delta.function_call.name;
              }
              if (delta.function_call.arguments) {
                functionArgs += delta.function_call.arguments;
              }
              functionCall = { name: functionName, arguments: functionArgs };
            }
            
            // Regular text content
            if (delta?.content) {
              fullResponse += delta.content;
              res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      });

      completion.on('end', async () => {
        tokensUsed = estimateTokens(fullResponse || functionArgs);

        // Handle function call execution
        if (functionCall && functionCall.name) {
          console.log(`🎯 AI wants to call function: ${functionCall.name} with args: ${functionCall.arguments}`);
          
          try {
            const parsedArgs = JSON.parse(functionCall.arguments);
            const functionResult = await executeUIFunction(functionCall.name, parsedArgs, {
              user: req.user,
              userId: req.user.id,
              conversationId,
            });
            
            const responseMessage = `✅ ${functionResult.message}`;
            
            // Save assistant message with search results in metadata if webSearch
            const metadataObj = wasAutoSelected ? { autoSelected: true } : {};
            if (functionCall.name === 'webSearch' && functionResult.data) {
              metadataObj.searchResults = functionResult.data;
            }
            const metadata = JSON.stringify(metadataObj);
            
            await query(
              `INSERT INTO messages (conversation_id, role, content, model, tokens_used, metadata)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [conversationId, 'assistant', responseMessage, selectedModel, tokensUsed, metadata]
            );
            
            // Update usage tracking
            await query(
              `UPDATE usage_tracking 
               SET messages_sent = messages_sent + 1,
                   tokens_consumed = tokens_consumed + $1
               WHERE user_id = $2 AND date = CURRENT_DATE`,
              [tokensUsed, req.user.id]
            );
            
            // Send action to frontend
            res.write(`data: ${JSON.stringify({ 
              content: responseMessage,
              action: {
                type: functionCall.name,
                params: parsedArgs,
                result: functionResult.data
              },
              done: true 
            })}\n\n`);
            res.end();
            return;
          } catch (error) {
            console.error('Function execution error:', error);
            const errorMessage = `❌ Failed to ${functionCall.name}: ${error.message}`;
            
            const metadata = wasAutoSelected ? JSON.stringify({ autoSelected: true }) : '{}';
            await query(
              `INSERT INTO messages (conversation_id, role, content, model, tokens_used, metadata)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [conversationId, 'assistant', errorMessage, selectedModel, tokensUsed, metadata]
            );
            
            res.write(`data: ${JSON.stringify({ 
              content: errorMessage,
              error: error.message,
              done: true 
            })}\n\n`);
            res.end();
            return;
          }
        }
        
        // Regular text response (no function call)
        const metadata = wasAutoSelected ? JSON.stringify({ autoSelected: true }) : '{}';
        await query(
          `INSERT INTO messages (conversation_id, role, content, model, tokens_used, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [conversationId, 'assistant', fullResponse, selectedModel, tokensUsed, metadata]
        );

        // Update usage tracking
        await query(
          `UPDATE usage_tracking 
           SET messages_sent = messages_sent + 1,
               tokens_consumed = tokens_consumed + $1
           WHERE user_id = $2 AND date = CURRENT_DATE`,
          [tokensUsed, req.user.id]
        );

        // Trigger auto-naming if appropriate
        triggerAutoNaming(conversationId, req.user.id);

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      });

      completion.on('error', (error) => {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
        res.end();
      });

    } else {
      // Non-streaming response with function calling support
      const completion = await createChatCompletion(messages, selectedModel, false, functionsToPass);
      const responseMessage = completion.choices[0].message;
      const tokensUsed = completion.usage.total_tokens;
      
      // Check if AI wants to call a function
      if (responseMessage.function_call) {
        const functionName = responseMessage.function_call.name;
        const functionArgs = JSON.parse(responseMessage.function_call.arguments);
        
        console.log(`🎯 AI wants to call function: ${functionName} with args:`, functionArgs);
        
        try {
          // Execute the UI function
          const functionResult = await executeUIFunction(functionName, functionArgs, {
            user: req.user,
            userId: req.user.id,
            conversationId,
          });
          
          // Send the result back to the frontend
          const aiResponse = `✅ ${functionResult.message}`;
          
          // Save assistant message
          const metadata = wasAutoSelected ? JSON.stringify({ autoSelected: true }) : '{}';
          await query(
            `INSERT INTO messages (conversation_id, role, content, model, tokens_used, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [conversationId, 'assistant', aiResponse, selectedModel, tokensUsed, metadata]
          );
          
          // Update usage tracking
          await query(
            `UPDATE usage_tracking 
             SET messages_sent = messages_sent + 1,
                 tokens_consumed = tokens_consumed + $1
             WHERE user_id = $2 AND date = CURRENT_DATE`,
            [tokensUsed, req.user.id]
          );
          
          // Trigger auto-naming if appropriate
          triggerAutoNaming(conversationId, req.user.id);
          
          res.json({
            message: aiResponse,
            action: {
              type: functionName,
              params: functionArgs,
              result: functionResult.data,
            },
          });
          return;
        } catch (error) {
          console.error('Function execution error:', error);
          const errorMessage = `❌ Failed to ${functionName}: ${error.message}`;
          
          const metadata = wasAutoSelected ? JSON.stringify({ autoSelected: true }) : '{}';
          await query(
            `INSERT INTO messages (conversation_id, role, content, model, tokens_used, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [conversationId, 'assistant', errorMessage, selectedModel, tokensUsed, metadata]
          );
          
          res.json({
            message: errorMessage,
            action: {
              type: functionName,
              params: functionArgs,
              error: error.message,
            },
          });
          return;
        }
      }
      
      // Regular text response (no function call)
      const aiResponse = responseMessage.content;

      // Save assistant message
      const metadata = wasAutoSelected ? JSON.stringify({ autoSelected: true }) : '{}';
      const assistantMessage = await query(
        `INSERT INTO messages (conversation_id, role, content, model, tokens_used, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [conversationId, 'assistant', aiResponse, selectedModel, tokensUsed, metadata]
      );

      // Update usage tracking
      await query(
        `UPDATE usage_tracking 
         SET messages_sent = messages_sent + 1,
             tokens_consumed = tokens_consumed + $1
         WHERE user_id = $2 AND date = CURRENT_DATE`,
        [tokensUsed, req.user.id]
      );

      // Trigger auto-naming if appropriate
      triggerAutoNaming(conversationId, req.user.id);

      res.json({
        message: assistantMessage.rows[0],
        tokensUsed,
      });
    }

  } catch (error) {
    console.error('Send message error:', error);
    
    // Check if headers have already been sent (e.g., during streaming)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to send message' });
    } else {
      // If streaming, send error through SSE and close connection
      try {
        res.write(`data: ${JSON.stringify({ error: 'AI service error. Please try again.' })}\n\n`);
        res.end();
      } catch (writeError) {
        // Connection may already be closed
        console.error('Failed to send stream error:', writeError.message);
      }
    }
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
