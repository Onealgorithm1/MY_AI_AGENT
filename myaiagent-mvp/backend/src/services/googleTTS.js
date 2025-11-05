import axios from 'axios';
import monitoringService from './monitoringService.js';

const GOOGLE_TTS_API_BASE = 'https://texttospeech.googleapis.com/v1';

// Get available Google voices using REST API
export async function getVoices() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google API key not configured. Please add GEMINI_API_KEY or GOOGLE_API_KEY to your secrets.');
    }
    
    const response = await axios.get(`${GOOGLE_TTS_API_BASE}/voices`, {
      params: { key: apiKey }
    });
    
    const voices = response.data.voices || [];
    
    // Filter and return popular voices
    const popularVoices = voices.filter(voice => {
      const name = voice.name || '';
      // Include English voices and some popular multilingual ones
      return name.includes('en-US') || name.includes('en-GB') || 
             name.includes('Wavenet') || name.includes('Neural2');
    });
    
    return popularVoices.map(voice => ({
      voice_id: voice.name,
      name: voice.name,
      language: voice.languageCodes[0],
      gender: voice.ssmlGender,
      category: voice.name.includes('Wavenet') ? 'Premium' : 
                voice.name.includes('Neural2') ? 'Latest' : 'Standard'
    }));
  } catch (error) {
    console.error('Get Google TTS voices error:', error.response?.data || error.message);
    throw new Error('Failed to get voices: ' + (error.response?.data?.error?.message || error.message));
  }
}

// Generate speech with Google TTS using REST API
export async function generateSpeechGoogle(
  text,
  voiceId = 'en-US-Neural2-F',
  languageCode = 'en-US'
) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google API key not configured. Please add GEMINI_API_KEY or GOOGLE_API_KEY to your secrets.');
    }
    
    console.log('🔊 Google TTS Request:', {
      textLength: text.length,
      voiceId,
      languageCode
    });

    const requestBody = {
      input: { text },
      voice: {
        languageCode,
        name: voiceId
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0
      }
    };

    // Track TTS synthesis latency
    const synthesisStartTime = Date.now();
    
    const response = await axios.post(
      `${GOOGLE_TTS_API_BASE}/text:synthesize`,
      requestBody,
      {
        params: { key: apiKey },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const synthesisLatency = Date.now() - synthesisStartTime;
    
    // Record TTS synthesis latency metric
    await monitoringService.recordMetric(
      'tts_synthesis_latency',
      synthesisLatency,
      'ms',
      { voiceId, languageCode },
      { textLength: text.length, success: true }
    );
    
    console.log(`⏱️  TTS Synthesis took ${synthesisLatency}ms`);
    
    // The response contains base64-encoded audio in audioContent field
    const audioBase64 = response.data.audioContent;
    
    // Convert base64 to buffer
    return Buffer.from(audioBase64, 'base64');
  } catch (error) {
    // Record failed TTS synthesis attempt
    await monitoringService.recordMetric(
      'tts_synthesis_latency',
      0,
      'ms',
      { voiceId, languageCode },
      { textLength: text.length, success: false, error: error.message }
    );
    
    console.error('Google TTS error:', error.response?.data || error.message);
    throw new Error('Failed to generate speech: ' + (error.response?.data?.error?.message || error.message));
  }
}

// Check if Google TTS is available
export async function isGoogleTTSAvailable() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return false;
    }
    
    // Try to fetch voices as a health check
    const response = await axios.get(`${GOOGLE_TTS_API_BASE}/voices`, {
      params: { key: apiKey },
      timeout: 5000
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('Google TTS not available:', error.message);
    return false;
  }
}

export default {
  getVoices,
  generateSpeechGoogle,
  isGoogleTTSAvailable,
};
