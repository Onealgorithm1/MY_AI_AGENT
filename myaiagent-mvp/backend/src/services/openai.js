import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

// Chat completion with streaming
export async function createChatCompletion(messages, model = 'gpt-4o', stream = false) {
  try {
    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        model,
        messages,
        stream,
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: stream ? 'stream' : 'json',
      }
    );

    return response.data;
  } catch (error) {
    console.error('OpenAI chat error:', error.response?.data || error.message);
    throw new Error('Failed to get AI response');
  }
}

// Speech-to-text (Whisper)
export async function transcribeAudio(audioFilePath) {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFilePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await axios.post(
      `${OPENAI_BASE_URL}/audio/transcriptions`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
    const response = await axios.post(
      `${OPENAI_BASE_URL}/audio/speech`,
      {
        model: 'tts-1',
        input: text,
        voice,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
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

// Build messages with memory context
export function buildMessagesWithMemory(messages, memoryFacts) {
  if (!memoryFacts || memoryFacts.length === 0) {
    return messages;
  }

  const memoryContext = memoryFacts
    .map(f => f.fact)
    .join('\n- ');

  const systemMessage = {
    role: 'system',
    content: `You are a helpful AI assistant. Here's what you know about the user:\n\n- ${memoryContext}\n\nUse this context naturally in your responses when relevant.`,
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
