import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { getApiKey } from '../utils/apiKeys.js';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

// Error checking utilities
function isRateLimitError(error) {
  if (!error) return false;
  const message = error.message || '';
  const status = error.status || 0;
  return (
    status === 429 ||
    status === 503 ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('503') ||
    message.includes('Too Many Requests') ||
    message.includes('Service Unavailable')
  );
}

function isAuthError(error) {
  if (!error) return false;
  const message = error.message || '';
  const status = error.status || 0;
  return (
    status === 401 ||
    status === 403 ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid api key') ||
    message.includes('authentication')
  );
}

// Chat completion with streaming and function calling
export async function createChatCompletion(messages, model = 'gpt-4o', stream = false, functions = null) {
  try {
    const apiKey = await getApiKey('openai');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add it in the admin dashboard.');
    }

    const requestBody = {
      model,
      messages,
      stream,
      temperature: 0.7,
      max_tokens: 4000,
    };
    
    // Add function calling support
    if (functions && functions.length > 0) {
      requestBody.functions = functions;
      requestBody.function_call = 'auto'; // Let AI decide when to call functions
    }

    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: stream ? 'stream' : 'json',
      }
    );

    return response.data;
  } catch (error) {
    // Enhanced error logging to capture actual OpenAI error message
    let errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    };

    // If response data exists and is an object, try to extract error message
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorDetails.data = error.response.data;
      } else if (error.response.data.error) {
        errorDetails.data = error.response.data.error;
      } else {
        errorDetails.data = error.response.data;
      }
    }

    console.error('🔴 OpenAI API Error Details:', JSON.stringify(errorDetails, null, 2));

    // Log request details for debugging
    console.error('📤 Request Info:', {
      model,
      messageCount: messages.length,
      functionsCount: functions?.length || 0,
      functionNames: functions?.map(f => f.name) || [],
      hasStream: stream
    });

    // Create error object with status for error handling
    const apiError = new Error(error.response?.data?.error?.message || error.message || 'Failed to get AI response');
    apiError.status = error.response?.status || 0;

    // Handle errors directly without fallback
    if (isRateLimitError(apiError)) {
      const rateLimitError = new Error(`OpenAI API rate limited: ${apiError.message}`);
      rateLimitError.code = 'RATE_LIMIT';
      rateLimitError.originalError = apiError;
      throw rateLimitError;
    }

    // For auth errors, return specific error
    if (isAuthError(apiError)) {
      const authError = new Error(`OpenAI API authentication failed. Please check your API key configuration.`);
      authError.code = 'AUTH_ERROR';
      authError.originalError = apiError;
      throw authError;
    }

    throw apiError;
  }
}

// Speech-to-text (Whisper)
export async function transcribeAudio(audioFilePath) {
  try {
    const apiKey = await getApiKey('openai');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add it in the admin dashboard.');
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFilePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await axios.post(
      `${OPENAI_BASE_URL}/audio/transcriptions`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders(),
        },
      }
    );

    return response.data.text;
  } catch (error) {
    console.error('Whisper transcription error:', error.response?.data || error.message);
    throw new Error('Failed to transcribe audio');
  }
}

// Text-to-speech
export async function generateSpeech(text, voice = 'alloy') {
  try {
    const apiKey = await getApiKey('openai');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add it in the admin dashboard.');
    }

    const response = await axios.post(
      `${OPENAI_BASE_URL}/audio/speech`,
      {
        model: 'tts-1',
        input: text,
        voice,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('TTS error:', error.response?.data || error.message);
    throw new Error('Failed to generate speech');
  }
}

// Vision (analyze images)
export async function analyzeImage(imageUrl, prompt = 'What do you see in this image?') {
  try {
    const apiKey = await getApiKey('openai');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add it in the admin dashboard.');
    }

    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 1000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Vision error:', error.response?.data || error.message);
    throw new Error('Failed to analyze image');
  }
}

// Extract memory facts from conversation
export async function extractMemoryFacts(conversationHistory) {
  try {
    const apiKey = await getApiKey('openai');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add it in the admin dashboard.');
    }

    const systemPrompt = `You are a memory extraction system. Analyze the conversation and extract important facts about the user. 
    
Return ONLY a JSON array of facts in this format:
[
  {"fact": "User is a developer", "category": "profession"},
  {"fact": "User prefers concise answers", "category": "preference"}
]

Rules:
- Only extract clear, factual statements about the user
- Categorize facts (profession, preference, personal, goal, etc)
- Keep facts concise
- Return empty array if no facts found`;

    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(conversationHistory) },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content);
    return parsed.facts || [];
  } catch (error) {
    console.error('Memory extraction error:', error.response?.data || error.message);
    return [];
  }
}

// Count tokens (approximate)
export function estimateTokens(text) {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Build messages with memory context and optional UI awareness
export function buildMessagesWithMemory(messages, memoryFacts, modelName = 'gpt-4o', uiAwarePrompt = null) {
  const memoryContext = memoryFacts && memoryFacts.length > 0
    ? memoryFacts.map(f => f.fact).join('\n- ')
    : null;

  let systemContent = uiAwarePrompt || `You are a helpful AI assistant powered by OpenAI's ${modelName} model.`;
  
  if (memoryContext) {
    systemContent += `\n\n## WHAT YOU REMEMBER ABOUT THIS USER:\n\n- ${memoryContext}\n\n**IMPORTANT**: You have ${memoryFacts.length} fact${memoryFacts.length !== 1 ? 's' : ''} about this user stored in your memory system. Proactively reference relevant facts when appropriate to personalize responses and demonstrate continuity. For example:
- Mention their preferences when making recommendations
- Recall their previous interests or work
- Reference past conversations naturally
- Build on what you know about them

Your memory makes conversations feel more natural and personalized. Use it to create a better user experience!`;
  }

  const systemMessage = {
    role: 'system',
    content: systemContent,
  };

  // Insert system message at the beginning
  return [systemMessage, ...messages];
}

export default {
  createChatCompletion,
  transcribeAudio,
  generateSpeech,
  analyzeImage,
  extractMemoryFacts,
  estimateTokens,
  buildMessagesWithMemory,
};
