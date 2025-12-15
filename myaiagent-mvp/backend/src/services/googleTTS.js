import axios from 'axios';
import monitoringService from './monitoringService.js';

const GOOGLE_TTS_API_BASE = 'https://texttospeech.googleapis.com/v1';

/**
 * Transform plain text into SSML with natural pausing rules
 * Per VUI optimization requirements:
 * - Comma (,): 250ms break
 * - Sentence End (.?!): 500ms break
 * - Paragraph Break (\n\n): 800ms break
 * - Colon/Semicolon (:;): 300ms break
 */
export function transformToSSML(text) {
  // Escape XML special characters
  let ssmlText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Add breaks for paragraph breaks (double newlines) - must come first
  ssmlText = ssmlText.replace(/\n\n+/g, '<break time="800ms"/>');

  // Add breaks for sentence endings followed by space or newline
  ssmlText = ssmlText.replace(/([.!?])(\s+)/g, '$1<break time="500ms"/>$2');

  // Add breaks for colons and semicolons
  ssmlText = ssmlText.replace(/([;:])(\s+)/g, '$1<break time="300ms"/>$2');

  // Add breaks for commas
  ssmlText = ssmlText.replace(/,(\s+)/g, ',<break time="250ms"/>$1');

  // Wrap in SSML speak tag
  return `<speak>${ssmlText}</speak>`;
}

/**
 * Add "thinking" pause for complex processing
 * Uses prosody rate="slow" with long break for natural-sounding delay
 */
export function addThinkingPause(introPhrase = "Let me think about that") {
  return `<speak>${introPhrase}...<prosody rate="slow"><break time="1000ms"/></prosody></speak>`;
}

// Get available Google voices using REST API
export async function getVoices() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error('❌ Google API key not configured');
      throw new Error('Google API key not configured. Please add GEMINI_API_KEY or GOOGLE_API_KEY to your environment.');
    }

    console.log('🔑 Using Google API key:', apiKey.substring(0, 10) + '...');

    const response = await axios.get(`${GOOGLE_TTS_API_BASE}/voices`, {
      params: { key: apiKey },
      timeout: 10000
    });

    const voices = response.data.voices || [];
    console.log(`✅ Retrieved ${voices.length} total voices from Google TTS API`);

    // Filter and return popular voices
    const popularVoices = voices.filter(voice => {
      const name = voice.name || '';
      // Include English voices and some popular multilingual ones
      return name.includes('en-US') || name.includes('en-GB') ||
             name.includes('Wavenet') || name.includes('Neural2');
    });

    console.log(`✅ Filtered to ${popularVoices.length} popular voices`);

    return popularVoices.map(voice => ({
      voice_id: voice.name,
      name: voice.name,
      language: voice.languageCodes[0],
      gender: voice.ssmlGender,
      category: voice.name.includes('Wavenet') ? 'Premium' :
                voice.name.includes('Neural2') ? 'Latest' : 'Standard'
    }));
  } catch (error) {
    console.error('❌ Get Google TTS voices error:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.error?.message || error.message);
    console.error('   Full error:', error.response?.data || error);

    // Provide more helpful error messages
    const errorMsg = error.response?.data?.error?.message || error.message;

    if (error.response?.status === 401 || errorMsg.includes('Invalid API key')) {
      throw new Error('Invalid Google API key. Please check your API key configuration.');
    } else if (error.response?.status === 403 || errorMsg.includes('not enabled')) {
      throw new Error('Text-to-Speech API is not enabled for this project. Please enable it in Google Cloud Console.');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded for Google TTS API. Please try again later.');
    }

    throw new Error('Failed to get voices: ' + errorMsg);
  }
}

// Generate speech with Google TTS using REST API
export async function generateSpeechGoogle(
  text,
  voiceId = 'en-US-Wavenet-F',
  languageCode = 'en-US',
  useSSML = true
) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error('Google API key not configured. Please add GEMINI_API_KEY or GOOGLE_API_KEY to your secrets.');
    }

    // Transform text to SSML with natural pausing if enabled
    const ssmlText = useSSML ? transformToSSML(text) : text;
    const inputType = useSSML ? 'ssml' : 'text';

    console.log('🔊 Google TTS Request:', {
      textLength: text.length,
      voiceId,
      languageCode,
      useSSML,
      ssmlLength: useSSML ? ssmlText.length : 0
    });

    const requestBody = {
      input: useSSML ? { ssml: ssmlText } : { text },
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
  transformToSSML,
  addThinkingPause,
};
