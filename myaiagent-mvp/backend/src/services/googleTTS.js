import textToSpeech from '@google-cloud/text-to-speech';
import { decryptSecret } from './secrets.js';
import { query } from '../utils/database.js';

let ttsClient = null;

async function getGoogleCredentials() {
  try {
    const result = await query(
      `SELECT key_value FROM api_secrets 
       WHERE key_name = 'GOOGLE_TTS_CREDENTIALS' 
       AND is_active = true 
       ORDER BY is_default DESC NULLS LAST, created_at DESC 
       LIMIT 1`
    );

    if (result.rows.length > 0) {
      const credentialsJson = decryptSecret(result.rows[0].key_value);
      return JSON.parse(credentialsJson);
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      return JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    }

    return null;
  } catch (error) {
    console.error('Error fetching Google credentials:', error);
    return null;
  }
}

async function getTTSClient() {
  if (ttsClient) return ttsClient;

  const credentials = await getGoogleCredentials();
  
  if (!credentials) {
    throw new Error('Google Cloud TTS credentials not configured. Please add them in the Admin Dashboard.');
  }

  ttsClient = new textToSpeech.TextToSpeechClient({
    credentials: credentials
  });

  return ttsClient;
}

export async function getVoices() {
  try {
    const client = await getTTSClient();
    const [response] = await client.listVoices({});

    const voices = response.voices.map(voice => ({
      voice_id: voice.name,
      name: voice.name,
      language_code: voice.languageCodes[0],
      language_codes: voice.languageCodes,
      ssml_gender: voice.ssmlGender,
      natural_sample_rate_hertz: voice.naturalSampleRateHertz,
      category: categorizeVoice(voice.name),
      quality: getVoiceQuality(voice.name)
    }));

    return voices.sort((a, b) => {
      if (a.quality !== b.quality) {
        const qualityOrder = { 'Neural2': 0, 'WaveNet': 1, 'Standard': 2 };
        return qualityOrder[a.quality] - qualityOrder[b.quality];
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Get Google TTS voices error:', error.message);
    error.message = 'Failed to get voices: ' + (error.message || 'Unknown error');
    throw error;
  }
}

function getVoiceQuality(voiceName) {
  if (voiceName.includes('Neural2')) return 'Neural2';
  if (voiceName.includes('Wavenet')) return 'WaveNet';
  if (voiceName.includes('Studio')) return 'Studio';
  return 'Standard';
}

function categorizeVoice(voiceName) {
  const langCode = voiceName.split('-')[0];
  const languageMap = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish'
  };
  return languageMap[langCode] || 'Other';
}

export async function generateSpeechGoogle(
  text,
  voiceId = 'en-US-Neural2-C',
  speakingRate = 1.0
) {
  try {
    const client = await getTTSClient();

    const voiceParts = voiceId.split('-');
    const languageCode = `${voiceParts[0]}-${voiceParts[1]}`;
    
    const ssmlGender = voiceId.includes('A') || voiceId.includes('C') || voiceId.includes('E') || voiceId.includes('G')
      ? 'FEMALE'
      : 'MALE';

    console.log('🔊 Google TTS Request:', {
      textLength: text.length,
      voiceId: voiceId,
      languageCode: languageCode
    });

    const [response] = await client.synthesizeSpeech({
      input: { text: text },
      voice: {
        languageCode: languageCode,
        name: voiceId,
        ssmlGender: ssmlGender
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speakingRate,
        pitch: 0,
        volumeGainDb: 0
      }
    });

    return Buffer.from(response.audioContent);
  } catch (error) {
    console.error('Google TTS error:', error.message);
    error.message = 'Failed to generate speech: ' + (error.message || 'Unknown error');
    throw error;
  }
}

export async function isGoogleTTSAvailable() {
  try {
    const credentials = await getGoogleCredentials();
    return !!credentials;
  } catch (error) {
    return false;
  }
}

export default {
  getVoices,
  generateSpeechGoogle,
  isGoogleTTSAvailable
};
