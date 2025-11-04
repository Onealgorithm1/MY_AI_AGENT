import { VertexAI } from '@google-cloud/vertexai';
import { EventEmitter } from 'events';
import { query } from '../utils/database.js';
import { decryptSecret } from './secrets.js';

// Initialize Vertex AI client
let vertexAIClient = null;
let projectId = null;
let location = null;

/**
 * Get Vertex AI credentials from database or environment
 */
async function getVertexAIConfig() {
  try {
    // Try to get from database first
    const credsResult = await query(
      `SELECT key_value FROM api_secrets 
       WHERE key_name = 'GOOGLE_APPLICATION_CREDENTIALS_JSON' 
       AND is_active = true 
       LIMIT 1`
    );

    const projectResult = await query(
      `SELECT key_value FROM api_secrets 
       WHERE key_name = 'VERTEX_AI_PROJECT_ID' 
       AND is_active = true 
       LIMIT 1`
    );

    const locationResult = await query(
      `SELECT key_value FROM api_secrets 
       WHERE key_name = 'VERTEX_AI_LOCATION' 
       AND is_active = true 
       LIMIT 1`
    );

    let credentials = null;
    if (credsResult.rows.length > 0) {
      const decryptedCreds = decryptSecret(credsResult.rows[0].key_value);
      credentials = JSON.parse(decryptedCreds);
    }

    if (projectResult.rows.length > 0) {
      projectId = decryptSecret(projectResult.rows[0].key_value);
    } else {
      projectId = process.env.VERTEX_AI_PROJECT_ID;
    }

    if (locationResult.rows.length > 0) {
      location = decryptSecret(locationResult.rows[0].key_value);
    } else {
      location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    }

    if (!projectId) {
      throw new Error('VERTEX_AI_PROJECT_ID not configured');
    }

    return { credentials, projectId, location };
  } catch (error) {
    console.error('Error getting Vertex AI config:', error.message);
    throw error;
  }
}

/**
 * Initialize Vertex AI client
 */
async function getVertexAIClient() {
  if (!vertexAIClient) {
    const config = await getVertexAIConfig();
    
    const clientOptions = {
      project: config.projectId,
      location: config.location
    };

    // Add credentials if available (for service account auth)
    if (config.credentials) {
      clientOptions.googleAuthOptions = {
        credentials: config.credentials
      };
    }

    vertexAIClient = new VertexAI(clientOptions);
    projectId = config.projectId;
    location = config.location;

    console.log('✅ Vertex AI initialized:', {
      project: projectId,
      location: location,
      hasCredentials: !!config.credentials
    });
  }
  
  return vertexAIClient;
}

/**
 * Create chat completion with Vertex AI and native Google Search grounding
 * Compatible with existing Gemini interface
 */
export async function createVertexChatCompletion(messages, model = 'gemini-2.0-flash-001', stream = false, enableGrounding = true) {
  try {
    const client = await getVertexAIClient();
    
    // Transform messages format
    const { systemInstruction, contents } = transformMessagesToVertexFormat(messages);
    
    console.log('🔵 Vertex AI Request:', {
      model,
      project: projectId,
      location,
      messageCount: messages.length,
      grounding: enableGrounding,
      hasStream: stream
    });

    // Configure tools for grounding
    const tools = enableGrounding ? [{
      googleSearch: {}  // Native Google Search tool for Gemini 2.0
    }] : undefined;

    // Get the generative model
    const modelInstance = client.getGenerativeModel({
      model,
      systemInstruction: systemInstruction ? {
        parts: [{ text: systemInstruction }]
      } : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
      tools: tools
    });

    const request = {
      contents
    };

    if (stream) {
      // Streaming response
      const result = await modelInstance.generateContentStream(request);
      return createVertexStreamAdapter(result, model);
    } else {
      // Non-streaming response
      const result = await modelInstance.generateContent(request);
      return transformVertexResponse(result, model);
    }

  } catch (error) {
    console.error('🔴 Vertex AI Error:', {
      message: error.message,
      status: error.status,
      details: error.details
    });
    throw new Error(error.message || 'Failed to get Vertex AI response');
  }
}

/**
 * Transform messages to Vertex AI format
 */
function transformMessagesToVertexFormat(messages) {
  let systemInstruction = null;
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }

  return { systemInstruction, contents };
}

/**
 * Transform Vertex AI response to OpenAI-compatible format
 */
function transformVertexResponse(vertexResult, model) {
  const response = vertexResult.response || vertexResult;
  const candidate = response.candidates?.[0];

  if (!candidate) {
    throw new Error('No response from Vertex AI');
  }

  const part = candidate.content?.parts?.[0];
  const message = {
    role: 'assistant',
    content: part?.text || ''
  };

  // Extract grounding metadata if available
  const groundingMetadata = candidate.groundingMetadata;
  
  if (groundingMetadata) {
    console.log('🌐 Grounding Metadata:', {
      webSearchQueries: groundingMetadata.webSearchQueries,
      groundingSupportsCount: groundingMetadata.groundingSupports?.length || 0
    });
  }

  return {
    id: `vertexai-${Date.now()}`,
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
    },
    groundingMetadata: groundingMetadata || null
  };
}

/**
 * Create stream adapter for Vertex AI streaming response
 */
function createVertexStreamAdapter(vertexStream, model) {
  const adapter = new EventEmitter();

  (async () => {
    try {
      for await (const chunk of vertexStream.stream) {
        const part = chunk.candidates?.[0]?.content?.parts?.[0];

        if (part?.text) {
          const sseData = {
            choices: [{
              delta: {
                content: part.text
              }
            }]
          };
          adapter.emit('data', Buffer.from(`data: ${JSON.stringify(sseData)}\n\n`));
        }
      }

      adapter.emit('data', Buffer.from('data: [DONE]\n\n'));
      adapter.emit('end');
    } catch (error) {
      adapter.emit('error', error);
    }
  })();

  return adapter;
}

/**
 * Check if Vertex AI is configured
 */
export async function isVertexAIConfigured() {
  try {
    await getVertexAIConfig();
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  createVertexChatCompletion,
  isVertexAIConfigured
};
