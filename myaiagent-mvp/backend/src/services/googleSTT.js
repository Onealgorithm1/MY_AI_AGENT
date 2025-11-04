import axios from 'axios';

const GOOGLE_STT_API_BASE = 'https://speech.googleapis.com/v1';

export async function transcribeAudioGoogle(audioBuffer, languageCode = 'en-US') {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google API key not configured. Please add GEMINI_API_KEY or GOOGLE_API_KEY to your secrets.');
    }
    
    console.log('🎤 Google STT Request:', {
      audioSize: audioBuffer.length,
      languageCode
    });

    const audioBase64 = audioBuffer.toString('base64');

    const requestBody = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: languageCode,
        enableAutomaticPunctuation: true,
        model: 'default',
      },
      audio: {
        content: audioBase64
      }
    };

    const response = await axios.post(
      `${GOOGLE_STT_API_BASE}/speech:recognize`,
      requestBody,
      {
        params: { key: apiKey },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const results = response.data.results || [];
    
    if (results.length === 0) {
      return '';
    }

    const transcript = results
      .map(result => result.alternatives[0]?.transcript || '')
      .join(' ');
    
    return transcript;
  } catch (error) {
    console.error('Google STT error:', error.response?.data || error.message);
    throw new Error('Failed to transcribe audio: ' + (error.response?.data?.error?.message || error.message));
  }
}

export async function isGoogleSTTAvailable() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Google STT not available:', error.message);
    return false;
  }
}

export default {
  transcribeAudioGoogle,
  isGoogleSTTAvailable
};
