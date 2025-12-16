import express from 'express';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';
import { checkRateLimit } from '../middleware/rateLimit.js';
import { attachUIContext, generateUIAwarePrompt, buildEnhancedContext } from '../middleware/uiContext.js';
import {
  createChatCompletion,
  buildMessagesWithMemory,
  estimateTokens
} from '../services/gemini.js'; // ✅ MIGRATED TO GEMINI
import { createChatCompletion as createOpenAIChatCompletion } from '../services/openai.js';
import { createVertexChatCompletion, isVertexAIConfigured } from '../services/vertexAI.js';
import { selectBestModel, explainModelSelection } from '../services/modelSelector.js';
import { UI_FUNCTIONS, executeUIFunction } from '../services/uiFunctions.js';
import { autoNameConversation } from './conversations.js';
import { extractMemoryFacts } from '../services/gemini.js';

const router = express.Router();

// In-memory tracker to prevent concurrent memory extraction with timestamps
const memoryExtractionInProgress = new Map(); // conversationId -> timestamp
const EXTRACTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout

// Helper function to call the appropriate API based on provider
async function callAPIByProvider(provider, messages, model, stream = false, functions = null) {
  switch (provider?.toLowerCase()) {
    case 'gemini':
    case 'google':
      return await createChatCompletion(messages, model, stream, functions);
    case 'openai':
      return await createOpenAIChatCompletion(messages, model, stream, functions);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Cleanup stale entries (older than timeout)
function cleanupStaleExtractions() {
  const now = Date.now();
  for (const [conversationId, timestamp] of memoryExtractionInProgress.entries()) {
    if (now - timestamp > EXTRACTION_TIMEOUT_MS) {
      console.warn(`⚠️  Cleaning up stale memory extraction for conversation ${conversationId}`);
      memoryExtractionInProgress.delete(conversationId);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupStaleExtractions, 60 * 1000);

// Helper function to trigger automatic memory extraction with debouncing
async function triggerAutoMemoryExtraction(conversationId, userId) {
  try {
    // Check if extraction is already in progress for this conversation
    if (memoryExtractionInProgress.has(conversationId)) {
      console.log(`⏳ Memory extraction already in progress for conversation ${conversationId}, skipping`);
      return;
    }

    // Count total messages in conversation
    const countResult = await query(
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1',
      [conversationId]
    );

    const totalMessages = parseInt(countResult.rows[0].count);

    // Extract memory every 10 messages (at 10, 20, 30, etc.)
    if (totalMessages % 10 === 0) {
      // Mark as in progress with timestamp
      memoryExtractionInProgress.set(conversationId, Date.now());

      setImmediate(async () => {
        try {
          console.log(`🧠 Auto-extracting memory from conversation ${conversationId} (${totalMessages} messages)...`);

          // Get recent conversation messages for extraction
          const messages = await query(
            `SELECT role, content FROM messages
             WHERE conversation_id = $1
             ORDER BY created_at DESC
             LIMIT 20`,
            [conversationId]
          );

          if (messages.rows.length === 0) {
            return;
          }

          // Extract facts using AI
          const extractedFacts = await extractMemoryFacts(messages.rows.reverse());

          // Save facts in batch (auto-approved since this is automatic extraction)
          if (extractedFacts.length > 0) {
            // Build values array for batch insert
            const values = [];
            const placeholders = [];
            let paramIndex = 1;

            for (let i = 0; i < extractedFacts.length; i++) {
              const factData = extractedFacts[i];
              placeholders.push(
                `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`
              );
              values.push(
                userId,
                factData.fact,
                factData.category || 'general',
                conversationId,
                false,
                true, // Auto-approve automatic extractions
                factData.confidence || 0.7
              );
              paramIndex += 7;
            }

            const result = await query(
              `INSERT INTO memory_facts
               (user_id, fact, category, source_conversation_id, manually_added, approved, confidence)
               VALUES ${placeholders.join(', ')}
               ON CONFLICT DO NOTHING
               RETURNING *`,
              values
            );

            const savedCount = result.rows.length;
            if (savedCount > 0) {
              console.log(`✅ Auto-extracted ${savedCount} new memory facts at message ${totalMessages}`);
            }
          }
        } catch (error) {
          // Silently fail - memory extraction is not critical
          console.error('Auto memory extraction failed (non-critical):', error.message);
        } finally {
          // Always remove from in-progress map
          memoryExtractionInProgress.delete(conversationId);
        }
      });
    }
  } catch (error) {
    // Silently fail - don't disrupt message flow
    console.error('Auto memory extraction trigger error:', error);
    // Ensure cleanup on error in outer try block
    memoryExtractionInProgress.delete(conversationId);
  }
}

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
    const { conversationId, content, model = 'gemini-2.5-flash', stream = false } = req.body;

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
      `INSERT INTO messages (conversation_id, user_id, role, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [conversationId, req.user.id, 'user', content]
    );

    // Get extended conversation history (100 messages for deeper context)
    const historyResult = await query(
      `SELECT role, content FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC
       LIMIT 100`,
      [conversationId]
    );

    const conversationHistory = historyResult.rows.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Get user's memory facts (50 most relevant with scoring)
    const memoryResult = await query(
      `SELECT fact, category, times_referenced, confidence 
       FROM memory_facts 
       WHERE user_id = $1 AND approved = true
       ORDER BY 
         times_referenced DESC,
         confidence DESC,
         last_referenced_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    const memoryFacts = memoryResult.rows;

    // Build UI-aware context with complete user information and infrastructure awareness
    const uiAwareSystemPrompt = await generateUIAwarePrompt(req.uiContext, {
      id: req.user.id,
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

    // === ✅ BUG FIX: CONTEXT-AWARE ACTION DETECTION ===
    const userQuery = content.toLowerCase();
    const hasGoogleAccess = !!req.user.google_id;

    // Keywords that imply Gmail or Google services
    const googleKeywords = [
      'email', 'gmail', 'inbox', 'mail',
      'calendar', 'event', 'meeting',
      'drive', 'document', 'spreadsheet'
    ];

    // Check current message AND recent conversation history for context
    const mentionsGoogleNow = googleKeywords.some(kw => userQuery.includes(kw));
    
    // Also check the last 3 messages for Google service context
    const recentMessages = conversationHistory.slice(-3).map(m => m.content.toLowerCase()).join(' ');
    const mentionsGoogleRecent = googleKeywords.some(kw => recentMessages.includes(kw));
    
    // Trigger functions if current OR recent conversation mentions Google services
    const mentionsGoogle = mentionsGoogleNow || mentionsGoogleRecent;
    
    // Core functions that are ALWAYS available (self-awareness, web search, UI control, SAM.gov)
    const coreFunctions = [
      'websearch', 'searchsamgov', 'getsamgoventitydetails', 'searchsamgovopportunities', 'getsamgovexclusions',
      'createopportunity', 'listopportunities', 'getopportunitydetails', 'updateopportunitystatus',
      'assignopportunity', 'updateopportunityscore', 'addopportunitynotes', 'getopportunitystats',
      'navigate', 'changemodel', 'createnewchat', 'renameconversation', 'deleteconversation',
      'getperformancemetrics', 'queryperformancemetrics', 'detectperformanceanomalies', 'getactiveanomalies',
      'getsamgovopportunitydetails'
    ];
    
    // Start with core functions always available
    let functionsToPass = UI_FUNCTIONS.filter(f => {
      const name = f.name.toLowerCase();
      return coreFunctions.includes(name);
    });
    
    // Add Google service functions only when context indicates need AND user has access
    if (mentionsGoogle && hasGoogleAccess) {
      const googleFunctions = UI_FUNCTIONS.filter(f => {
        const name = f.name.toLowerCase();
        return (
          // Gmail functions
          name.includes('email') ||
          // Calendar functions
          name.includes('calendar') || name.includes('event') ||
          // Drive functions
          name.includes('drive') || name.includes('file') ||
          // Docs functions
          name.includes('doc') ||
          // Sheets functions
          name.includes('sheet')
        );
      });
      
      functionsToPass = [...functionsToPass, ...googleFunctions];
    }
    
    const shouldPassFunctions = functionsToPass && functionsToPass.length > 0;

    // Debug log
    console.log('📋 Action Detection:', {
      query: userQuery.substring(0, 50),
      mentionsGoogle,
      hasGoogleAccess,
      shouldPassFunctions,
      functionsCount: functionsToPass ? functionsToPass.length : 0
    });

    // === ✅ VERTEX AI GROUNDING DETECTION ===
    // Check if query benefits from real-time web search
    const groundingKeywords = [
      'latest', 'current', 'today', 'now', 'recent', 'news',
      'who won', 'what happened', 'search for', 'find', 'look up',
      'price', 'stock', 'weather', 'score', 'update', '2024', '2025'
    ];
    
    const needsGrounding = groundingKeywords.some(kw => userQuery.includes(kw));

    // VERTEX AI IS DISABLED
    // Vertex AI has authentication issues, so it's disabled to prevent warnings and errors
    // To re-enable: uncomment the line below and set useVertexAI to the commented condition
    // const vertexAIAvailable = await isVertexAIConfigured();
    const useVertexAI = false; // To re-enable: needsGrounding && vertexAIAvailable && !functionsToPass;

    // Map Gemini model names to Vertex AI equivalents
    const vertexModelMap = {
      'gemini-2.5-flash': 'gemini-2.0-flash-001',
      'gemini-2.5-pro': 'gemini-2.0-pro',
      'gemini-2.0-flash': 'gemini-2.0-flash-001'
    };

    const vertexModel = vertexModelMap[selectedModel] || 'gemini-2.0-flash-001';

    if (useVertexAI) {
      console.log('🌐 Using Vertex AI with Google Search grounding for:', userQuery.substring(0, 50));
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
      let functionCall = null;
      let functionName = '';
      let functionArgs = '';
      let chunkCount = 0;

      console.log('📡 Starting streaming response to client...');

      // Use Vertex AI with grounding if needed, otherwise use standard model
      let completion;

      if (useVertexAI) {
        completion = await createVertexChatCompletion(messages, vertexModel, true, true);
      } else {
        completion = await callAPIByProvider('gemini', messages, selectedModel, true, functionsToPass);
      }

      completion.on('data', (chunk) => {
        chunkCount++;
        console.log(`📦 Chunk #${chunkCount} received from Gemini`);
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
              const dataToWrite = `data: ${JSON.stringify({ content: delta.content })}\n\n`;
              res.write(dataToWrite);
              console.log(`✍️ Wrote chunk to client: ${delta.content.substring(0, 50)}...`);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      });

      completion.on('end', async () => {
        console.log(`✅ Streaming complete. Total chunks: ${chunkCount}, Response length: ${fullResponse.length}`);
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
            
            // Handle PRESENT_EMAIL protocol - directly output the formatted JSON
            let responseMessage;
            if (functionResult.message === 'PRESENT_EMAIL_PROTOCOL' && functionResult.data) {
              responseMessage = JSON.stringify(functionResult.data);
            } else {
              responseMessage = `✅ ${functionResult.message}`;
            }
            
            // Save assistant message with search results in metadata if webSearch
            const metadataObj = wasAutoSelected ? { autoSelected: true } : {};
            if (functionCall.name === 'webSearch' && functionResult.data) {
              metadataObj.searchResults = functionResult.data;
            }
            const metadata = JSON.stringify(metadataObj);
            
            await query(
              `INSERT INTO messages (conversation_id, user_id, role, content, tokens_used, metadata)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [conversationId, req.user.id, 'assistant', responseMessage, tokensUsed, metadata]
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
              `INSERT INTO messages (conversation_id, user_id, role, content, tokens_used, metadata)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [conversationId, req.user.id, 'assistant', errorMessage, tokensUsed, metadata]
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
          `INSERT INTO messages (conversation_id, user_id, role, content, tokens_used, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [conversationId, req.user.id, 'assistant', fullResponse, tokensUsed, metadata]
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
        
        // Trigger automatic memory extraction
        triggerAutoMemoryExtraction(conversationId, req.user.id);

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
      let completion;

      if (useVertexAI) {
        completion = await createVertexChatCompletion(messages, vertexModel, false, true);
      } else {
        completion = await callAPIByProvider('gemini', messages, selectedModel, false, functionsToPass);
      }

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
          
          // Handle PRESENT_EMAIL protocol - directly output the formatted JSON
          let aiResponse;
          if (functionResult.message === 'PRESENT_EMAIL_PROTOCOL' && functionResult.data) {
            aiResponse = JSON.stringify(functionResult.data);
          } else {
            aiResponse = `✅ ${functionResult.message}`;
          }
          
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
          
          // Trigger automatic memory extraction
          triggerAutoMemoryExtraction(conversationId, req.user.id);
          
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
      
      // Trigger automatic memory extraction
      triggerAutoMemoryExtraction(conversationId, req.user.id);

      res.json({
        message: assistantMessage.rows[0],
        tokensUsed,
      });
    }

  } catch (error) {
    console.error('Send message error:', error);

    // Provide specific error messages based on error type
    let errorMessage = 'Failed to send message';
    const isRateLimitError = error.code === 'RATE_LIMIT' || error.message?.includes('quota') || error.message?.includes('rate limit');

    if (isRateLimitError) {
      errorMessage = `Service temporarily unavailable (rate limit). ${error.message}. Please try again in a moment.`;
    } else if (error.message?.includes('API key')) {
      errorMessage = `API key not configured. Please add your API key in the admin settings.`;
    }

    // Check if headers have already been sent (e.g., during streaming)
    if (!res.headersSent) {
      res.status(error.status || 500).json({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      // If streaming, send error through SSE and close connection
      try {
        res.write(`data: ${JSON.stringify({
          error: errorMessage,
          retryable: isRateLimitError
        })}\n\n`);
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
