import textToSpeech from '@google-cloud/text-to-speech';

// Initialize Google TTS client
let ttsClient = null;

async function getGoogleTTSClient() {
  if (!ttsClient) {
    // Use application default credentials or service account from env
    ttsClient = new textToSpeech.TextToSpeechClient();
  }
  return ttsClient;
}

// Get available Google voices
export async function getVoices() {
  try {
    const client = await getGoogleTTSClient();
    const [result] = await client.listVoices({});
    
    // Filter and return popular voices
    const popularVoices = result.voices.filter(voice => {
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
    console.error('Get Google TTS voices error:', error.message);
    throw new Error('Failed to get voices: ' + error.message);
  }
}

// Generate speech with Google TTS
export async function generateSpeechGoogle(
  text,
  voiceId = 'en-US-Neural2-F',
  languageCode = 'en-US'
) {
  try {
    const client = await getGoogleTTSClient();
    
    console.log('🔊 Google TTS Request:', {
      textLength: text.length,
      voiceId,
      languageCode
    });

    const request = {
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

    const [response] = await client.synthesizeSpeech(request);
    
    return response.audioContent;
  } catch (error) {
    console.error('Google TTS error:', error.message);
    throw new Error('Failed to generate speech: ' + error.message);
  }
}

// Check if Google TTS is available
export async function isGoogleTTSAvailable() {
  try {
    await getGoogleTTSClient();
    return true;
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
