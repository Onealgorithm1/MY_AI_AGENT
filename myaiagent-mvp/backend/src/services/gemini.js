import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventEmitter } from 'events';
import { getApiKey } from '../utils/apiKeys.js';
import { monitorExternalApi } from '../middleware/performanceMonitoring.js';
import { determineFallbackStrategy, logFallbackAttempt, isRateLimitError } from './apiFallback.js';

// Initialize Gemini client (will be set when API key is available)
let geminiClient = null;
let lastApiKey = null;

async function getGeminiClient() {
  // Always check for a fresh API key to support runtime updates
  const fromEnvGemini = process.env.GEMINI_API_KEY;
  const fromEnvGoogle = process.env.GOOGLE_API_KEY;
  let fromDb = null;

  try {
    fromDb = await getApiKey('gemini');
  } catch (error) {
    // Database lookup failed, but we can still proceed with env vars
    console.warn('⚠️  Could not fetch API key from database:', error.message);
  }

  const apiKey = fromEnvGemini || fromEnvGoogle || fromDb;

  if (!apiKey) {
    const errorMsg = 'Gemini API key not configured. Please set GOOGLE_API_KEY or GEMINI_API_KEY environment variable. See API_CONFIGURATION.md for setup instructions.';
    console.error('❌', errorMsg);
    console.error('📋 Current configuration:', {
      hasGEMINI_API_KEY: !!fromEnvGemini,
      hasGOOGLE_API_KEY: !!fromEnvGoogle,
      hasDbKey: !!fromDb,
      NODE_ENV: process.env.NODE_ENV
    });
    throw new Error(errorMsg);
  }

  // Reinitialize if key changed or client not yet initialized
  if (!geminiClient || lastApiKey !== apiKey) {
    try {
      geminiClient = new GoogleGenerativeAI(apiKey);
    } catch (error) {
      console.error('❌ Failed to initialize Gemini client:', error.message);
      throw new Error('Failed to initialize Gemini client. Check your API key validity.');
    }
  }

  return geminiClient;
}

/**
 * Transform OpenAI function format to Gemini tools format
 * OpenAI: { name, description, parameters: { type, properties, required } }
 * Gemini: { functionDeclarations: [{ name, description, parameters: { type, properties, required } }] }
 */
function transformFunctionsToTools(functions) {
  if (!functions || functions.length === 0) return null;
  
  return [{
    functionDeclarations: functions.map(func => ({
      name: func.name,
      description: func.description,
      parameters: func.parameters
    }))
  }];
}

/**
 * Chat completion with streaming and function calling (Gemini)
 * Compatible with OpenAI interface for easy migration
 */
export async function createChatCompletion(messages, model = 'gemini-2.5-flash', stream = false, functions = null) {
  try {
    const client = await getGeminiClient();
    
    // Transform OpenAI function format to Gemini tools format
    const tools = transformFunctionsToTools(functions);
    
    // Transform messages to Gemini format
    const geminiMessages = transformMessagesToGemini(messages);
    
    console.log('🔵 Gemini API Request:', {
      model,
      messageCount: messages.length,
      functionsCount: functions?.length || 0,
      functionNames: functions?.map(f => f.name) || [],
      hasStream: stream
    });
    
    // Get the generative model with configuration
    const modelInstance = client.getGenerativeModel({
      model,
      systemInstruction: geminiMessages.systemInstruction,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE'
        }
      ],
      tools: tools || undefined
    });
    
    // Build request with contents
    const request = {
      contents: geminiMessages.contents
    };
    
    if (stream) {
      // Streaming response with performance monitoring
      const result = await monitorExternalApi('gemini', model, async () => {
        return await modelInstance.generateContentStream(request);
      });
      
      // Return stream-like object compatible with OpenAI
      return createStreamAdapter(result, model);
    } else {
      // Non-streaming response with performance monitoring
      const result = await monitorExternalApi('gemini', model, async () => {
        return await modelInstance.generateContent(request);
      });
      
      // Transform Gemini response to OpenAI format
      return transformGeminiResponse(result, model);
    }
    
  } catch (error) {
    console.error('🔴 Gemini API Error:', {
      message: error.message,
      status: error.status,
      details: error.details || error.errorDetails
    });

    console.error('📤 Request Info:', {
      model,
      messageCount: messages.length,
      functionsCount: functions?.length || 0,
      functionNames: functions?.map(f => f.name) || []
    });

    // Determine fallback strategy for ANY error
    const fallbackStrategy = await determineFallbackStrategy(error, 'gemini');

    // If fallback is available, throw FALLBACK_REQUIRED error
    if (fallbackStrategy.shouldRetry && fallbackStrategy.provider) {
      logFallbackAttempt('gemini', fallbackStrategy.provider, fallbackStrategy.reason, error);

      // Create a fallback error with provider info so caller can handle it
      const fallbackError = new Error(fallbackStrategy.reason);
      fallbackError.code = 'FALLBACK_REQUIRED';
      fallbackError.provider = fallbackStrategy.provider;
      fallbackError.model = fallbackStrategy.model;
      fallbackError.retryAfter = fallbackStrategy.retryAfter;
      fallbackError.originalError = error;
      throw fallbackError;
    }

    // For rate limit errors with no fallback available, return detailed error
    if (isRateLimitError(error) && fallbackStrategy.retryAfter) {
      const rateLimitError = new Error(`Gemini API quota exceeded. ${fallbackStrategy.reason}. Retry in ${fallbackStrategy.retryAfter}s`);
      rateLimitError.code = 'RATE_LIMIT';
      rateLimitError.retryAfter = fallbackStrategy.retryAfter;
      rateLimitError.originalError = error;
      throw rateLimitError;
    }

    // For auth errors, return specific error
    if (isAuthError(error)) {
      const authError = new Error(`Gemini API authentication failed. Please check your API key configuration.`);
      authError.code = 'AUTH_ERROR';
      authError.originalError = error;
      throw authError;
    }

    throw new Error(error.message || 'Failed to get Gemini response');
  }
}

/**
 * Transform OpenAI message format to Gemini format
 */
function transformMessagesToGemini(messages) {
  let systemInstruction = null;
  const contents = [];
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      // Gemini systemInstruction must be a Content object
      systemInstruction = {
        role: 'user',
        parts: [{ text: msg.content }]
      };
    } else {
      // Transform user/assistant messages
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }
  
  return { contents, systemInstruction };
}

/**
 * Transform Gemini response to OpenAI-compatible format
 */
function transformGeminiResponse(geminiResult, model) {
  const response = geminiResult.response || geminiResult;
  const candidate = response.candidates?.[0];
  
  if (!candidate) {
    console.error('🔴 No candidate in Gemini response:', {
      promptFeedback: response.promptFeedback,
      blockReason: response.promptFeedback?.blockReason
    });
    throw new Error('No response from Gemini - possibly blocked by safety filters');
  }
  
  // Check if response was blocked
  if (candidate.finishReason === 'SAFETY') {
    console.error('🔴 Response blocked by safety filters:', {
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings
    });
    throw new Error('Response blocked by Gemini safety filters');
  }
  
  const part = candidate.content?.parts?.[0];
  let message = {
    role: 'assistant',
    content: ''
  };
  
  // Check for function call
  if (part?.functionCall) {
    message.function_call = {
      name: part.functionCall.name,
      arguments: JSON.stringify(part.functionCall.args)
    };
  } else if (part?.text) {
    message.content = part.text;
  } else {
    console.warn('⚠️ Empty response from Gemini:', {
      finishReason: candidate.finishReason,
      hasContent: !!candidate.content,
      hasParts: !!candidate.content?.parts,
      partCount: candidate.content?.parts?.length || 0
    });
  }
  
  // Return OpenAI-compatible format
  return {
    id: `chatcmpl-${Date.now()}`,
    model,
    choices: [{
      message,
      finish_reason: candidate.finishReason?.toLowerCase() || 'stop',
      index: 0
    }],
    usage: {
      prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
      completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: response.usageMetadata?.totalTokenCount || 0
    }
  };
}

/**
 * Create stream adapter for Gemini streaming response
 */
function createStreamAdapter(geminiStream, model) {
  const adapter = new EventEmitter();
  
  // Process stream asynchronously
  (async () => {
    try {
      for await (const chunk of geminiStream.stream) {
        const part = chunk.candidates?.[0]?.content?.parts?.[0];
        
        if (part?.text) {
          // Emit text chunk in OpenAI format
          const sseData = {
            choices: [{
              delta: {
                content: part.text
              }
            }]
          };
          adapter.emit('data', Buffer.from(`data: ${JSON.stringify(sseData)}\n\n`));
        } else if (part?.functionCall) {
          // Emit function call chunk
          const sseData = {
            choices: [{
              delta: {
                function_call: {
                  name: part.functionCall.name,
                  arguments: JSON.stringify(part.functionCall.args)
                }
              }
            }]
          };
          adapter.emit('data', Buffer.from(`data: ${JSON.stringify(sseData)}\n\n`));
        }
      }
      
      // Signal end of stream
      adapter.emit('data', Buffer.from('data: [DONE]\n\n'));
      adapter.emit('end');
    } catch (error) {
      adapter.emit('error', error);
    }
  })();
  
  return adapter;
}

/**
 * Analyze images with Gemini Vision
 */
export async function analyzeImage(imageUrl, prompt = 'What do you see in this image?') {
  try {
    const client = await getGeminiClient();
    
    // Fetch image data
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Image,
              mimeType: response.headers.get('content-type') || 'image/jpeg'
            }
          }
        ]
      }]
    });
    
    return result.candidates[0]?.content?.parts[0]?.text || 'Unable to analyze image';
  } catch (error) {
    console.error('Gemini vision error:', error.message);
    throw new Error('Failed to analyze image');
  }
}

/**
 * Extract memory facts from conversation using Gemini
 */
export async function extractMemoryFacts(conversationHistory) {
  try {
    const client = await getGeminiClient();
    
    const systemPrompt = `You are a memory extraction system. Analyze the conversation and extract important facts about the user. 
    
Return ONLY a JSON object with a "facts" array in this format:
{
  "facts": [
    {"fact": "User is a developer", "category": "profession"},
    {"fact": "User prefers concise answers", "category": "preference"}
  ]
}

Rules:
- Only extract clear, factual statements about the user
- Categorize facts (profession, preference, personal, goal, etc)
- Keep facts concise
- Return empty array if no facts found`;

    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: JSON.stringify(conversationHistory) }]
      }],
      systemInstruction: systemPrompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    });
    
    const content = result.candidates[0]?.content?.parts[0]?.text;
    const parsed = JSON.parse(content);
    return parsed.facts || [];
  } catch (error) {
    console.error('Memory extraction error:', error.message);
    return [];
  }
}

/**
 * Count tokens (approximate)
 */
export function estimateTokens(text) {
  // Rough estimation: ~4 characters per token (same as OpenAI)
  return Math.ceil(text.length / 4);
}

/**
 * Build messages with memory context and optional UI awareness
 * Per VUI requirements: Hybrid approach with last 2-3 turns verbatim + summary
 */
export function buildMessagesWithMemory(messages, memoryFacts, modelName = 'gemini-2.5-flash', uiAwarePrompt = null) {
  const memoryContext = memoryFacts && memoryFacts.length > 0
    ? memoryFacts.map(f => f.fact).join('\n- ')
    : null;

  let systemContent = uiAwarePrompt || `You are a helpful AI assistant powered by Google's ${modelName} model.`;

  if (memoryContext) {
    systemContent += `\n\n## WHAT YOU REMEMBER ABOUT THIS USER:\n\n- ${memoryContext}\n\n**IMPORTANT**: You have ${memoryFacts.length} fact${memoryFacts.length !== 1 ? 's' : ''} about this user stored in your memory system. Proactively reference relevant facts when appropriate to personalize responses and demonstrate continuity. For example:
- Mention their preferences when making recommendations
- Recall their previous interests or work
- Reference past conversations naturally
- Build on what you know about them

Your memory makes conversations feel more natural and personalized. Use it to create a better user experience!`;
  }

  // VUI Optimization: Hybrid conversational memory approach
  // Keep last 2-3 turns (4-6 messages) verbatim for immediate context
  // Summarize older messages to maintain coherence while reducing tokens
  const RECENT_TURNS_TO_KEEP = 3; // 3 turns = 6 messages (user + assistant)
  const recentMessageCount = RECENT_TURNS_TO_KEEP * 2;

  let contextMessages = [];
  let conversationSummary = null;

  if (messages.length > recentMessageCount) {
    // Split messages into old (to summarize) and recent (keep verbatim)
    const olderMessages = messages.slice(0, -recentMessageCount);
    const recentMessages = messages.slice(-recentMessageCount);

    // Create summary of older conversation
    if (olderMessages.length > 0) {
      const summaryPoints = [];
      for (let i = 0; i < olderMessages.length; i += 2) {
        const userMsg = olderMessages[i];
        const assistantMsg = olderMessages[i + 1];
        if (userMsg && assistantMsg) {
          // Extract key topics from exchange
          const userTopic = userMsg.content.substring(0, 100);
          summaryPoints.push(`- User asked about: ${userTopic}${userMsg.content.length > 100 ? '...' : ''}`);
        }
      }

      if (summaryPoints.length > 0) {
        conversationSummary = `\n\n## EARLIER IN THIS CONVERSATION:\n${summaryPoints.join('\n')}`;
      }
    }

    contextMessages = recentMessages;
  } else {
    // Conversation is short, keep all messages verbatim
    contextMessages = messages;
  }

  // Add conversation summary to system prompt if exists
  if (conversationSummary) {
    systemContent += conversationSummary;
  }

  const systemMessage = {
    role: 'system',
    content: systemContent,
  };

  // Insert system message at the beginning with recent turns
  return [systemMessage, ...contextMessages];
}

export async function generateContent(prompt, options = {}) {
  const messages = [{ role: 'user', content: prompt }];
  const model = options.model || 'gemini-2.5-flash';
  const temperature = options.temperature ?? 0.7;
  const responseMimeType = options.responseMimeType || null;
  
  const response = await createChatCompletion(messages, model, false, null);
  return response.content;
}

export async function generateVisionContent(prompt, imageDataOrUrl, options = {}) {
  const response = await analyzeImage(imageDataOrUrl, prompt);
  return response.content;
}

export default {
  createChatCompletion,
  analyzeImage,
  extractMemoryFacts,
  estimateTokens,
  buildMessagesWithMemory,
  generateContent,
  generateVisionContent,
};
