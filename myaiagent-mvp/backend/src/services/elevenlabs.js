import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Initialize ElevenLabs client (will be set when API key is available)
let elevenLabsClient = null;

async function getElevenLabsClient(apiKey = null) {
  const key = apiKey || process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error('ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your secrets.');
  }
  return new ElevenLabsClient({ apiKey: key });
}

// Get available voices
export async function getVoices(apiKey = null) {
  try {
    const client = await getElevenLabsClient(apiKey);
    const response = await client.voices.getAll();
    
    return response.voices.map(voice => ({
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      labels: voice.labels,
      description: voice.description,
      preview_url: voice.preview_url
    }));
  } catch (error) {
    console.error('Get ElevenLabs voices error:', error.message);
    // Preserve original error with enriched message for proper error handling in routes
    error.message = 'Failed to get voices: ' + (error.message || 'Unknown error');
    // Ensure response object exists for route error detection
    if (!error.response && (error.status || error.statusCode)) {
      error.response = { status: error.status || error.statusCode };
    }
    throw error;
  }
}

// Validate voice ID format (ElevenLabs voice IDs are alphanumeric, ~20 chars)
function isValidVoiceId(voiceId) {
  return voiceId && /^[a-zA-Z0-9]{15,30}$/.test(voiceId);
}

// Generate speech with ElevenLabs (compatible with OpenAI interface)
export async function generateSpeechElevenLabs(
  text, 
  voiceId = '21m00Tcm4TlvDq8ikWAM', // Default: Rachel voice
  modelId = 'eleven_multilingual_v2',
  apiKey = null
) {
  try {
    const client = await getElevenLabsClient(apiKey);
    
    // Validate voice ID and fall back to default if invalid
    const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel
    const validVoiceId = isValidVoiceId(voiceId) ? voiceId : DEFAULT_VOICE;
    
    if (validVoiceId !== voiceId) {
      console.warn(`⚠️  Invalid voice ID "${voiceId}", using default voice instead`);
    }
    
    console.log('🔊 ElevenLabs TTS Request:', {
      textLength: text.length,
      voiceId: validVoiceId,
      model: modelId
    });

    const audio = await client.textToSpeech.convert(validVoiceId, {
      text: text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true
      }
    });

    // Convert async iterable to Buffer
    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error.message);
    // Preserve original error with enriched message for proper error handling in routes
    error.message = 'Failed to generate speech: ' + (error.message || 'Unknown error');
    // Ensure response object exists for route error detection
    if (!error.response && (error.status || error.statusCode)) {
      error.response = { status: error.status || error.statusCode };
    }
    throw error;
  }
}

// Stream speech (for real-time)
export async function streamSpeechElevenLabs(
  text,
  voiceId = '21m00Tcm4TlvDq8ikWAM'
) {
  try {
    const client = await getElevenLabsClient();
    
    return await client.textToSpeech.convertAsStream(voiceId, {
      text: text,
      model_id: 'eleven_turbo_v2_5', // Latest fast model for streaming
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    });
  } catch (error) {
    console.error('ElevenLabs stream error:', error.message);
    throw new Error('Failed to stream speech');
  }
}

// Check if ElevenLabs is available
export async function isElevenLabsAvailable() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    return !!apiKey;
  } catch (error) {
    return false;
  }
}

// Alias for OpenAI-compatible interface
export async function generateSpeech(text, voice = 'alloy') {
  // Map OpenAI voice names to ElevenLabs voice IDs
  const voiceMap = {
    'alloy': '21m00Tcm4TlvDq8ikWAM', // Rachel
    'echo': 'TxGEqnHWrfWFTfGW9XjX', // Josh
    'fable': 'EXAVITQu4vr4xnSDxMaL', // Bella
    'onyx': 'ErXwobaYiN019PkySvjV', // Antoni
    'nova': 'MF3mGyEYCl7XYWbV9V6O', // Elli
    'shimmer': '21m00Tcm4TlvDq8ikWAM' // Rachel
  };
  
  const voiceId = voiceMap[voice] || '21m00Tcm4TlvDq8ikWAM';
  return generateSpeechElevenLabs(text, voiceId);
}

export default {
  getVoices,
  generateSpeechElevenLabs,
  streamSpeechElevenLabs,
  isElevenLabsAvailable,
};
