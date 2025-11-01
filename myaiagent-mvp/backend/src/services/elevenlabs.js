import axios from 'axios';
import { query } from '../utils/database.js';
import { decryptSecret } from './secrets.js';

// Get active ElevenLabs API key from database
async function getElevenLabsKey() {
  try {
    const result = await query(
      `SELECT key_value FROM api_secrets 
       WHERE key_name = 'ELEVENLABS_API_KEY' AND is_active = true`
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return decryptSecret(result.rows[0].key_value);
  } catch (error) {
    console.error('Get ElevenLabs key error:', error.message);
    return null;
  }
}

// Get available voices
export async function getVoices() {
  try {
    const apiKey = await getElevenLabsKey();
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    return response.data.voices;
  } catch (error) {
    console.error('Get ElevenLabs voices error:', error.response?.data || error.message);
    throw new Error('Failed to get voices');
  }
}

// Generate speech with ElevenLabs
export async function generateSpeechElevenLabs(
  text, 
  voiceId = '21m00Tcm4TlvDq8ikWAM', // Default: Rachel voice
  modelId = 'eleven_monolingual_v1'
) {
  try {
    const apiKey = await getElevenLabsKey();
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error.response?.data || error.message);
    throw new Error('Failed to generate speech');
  }
}

// Stream speech (for real-time)
export async function streamSpeechElevenLabs(
  text,
  voiceId = '21m00Tcm4TlvDq8ikWAM'
) {
  try {
    const apiKey = await getElevenLabsKey();
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        text,
        model_id: 'eleven_turbo_v2', // Faster model for streaming
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        responseType: 'stream',
      }
    );

    return response.data;
  } catch (error) {
    console.error('ElevenLabs stream error:', error.response?.data || error.message);
    throw new Error('Failed to stream speech');
  }
}

// Check if ElevenLabs is available
export async function isElevenLabsAvailable() {
  const apiKey = await getElevenLabsKey();
  return !!apiKey;
}

export default {
  getVoices,
  generateSpeechElevenLabs,
  streamSpeechElevenLabs,
  isElevenLabsAvailable,
};
