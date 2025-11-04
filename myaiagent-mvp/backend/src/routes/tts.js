import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { generateSpeechGoogle, getVoices } from '../services/googleTTS.js';

const router = express.Router();

router.use(authenticate);

router.get('/voices', async (req, res) => {
  try {
    const voices = await getVoices();
    
    res.json({ 
      voices: voices.map(v => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        language: v.language,
        gender: v.gender
      }))
    });
  } catch (error) {
    console.error('Error fetching voices:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch voices',
      code: 'FETCH_VOICES_FAILED'
    });
  }
});

router.post('/synthesize', async (req, res) => {
  try {
    let { text, voiceId = 'en-US-Neural2-F' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Text is required and must be a string',
        code: 'INVALID_TEXT'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        error: 'Text exceeds maximum length of 5000 characters',
        code: 'TEXT_TOO_LONG'
      });
    }
    
    // Validate and sanitize voice ID - reject old ElevenLabs IDs
    const isGoogleVoice = /^[a-zA-Z]{2}-[a-zA-Z]{2}-[a-zA-Z0-9\-]+$/.test(voiceId);
    const isOldElevenLabsVoice = /^[a-zA-Z0-9]{15,30}$/.test(voiceId);
    
    if (isOldElevenLabsVoice) {
      console.warn(`⚠️  Old ElevenLabs voice ID detected: ${voiceId}, using default Google voice`);
      voiceId = 'en-US-Neural2-F'; // Default Google voice
    } else if (!isGoogleVoice) {
      console.warn(`⚠️  Invalid voice ID: ${voiceId}, using default Google voice`);
      voiceId = 'en-US-Neural2-F';
    }

    console.log(`🔊 Synthesizing speech: ${text.substring(0, 50)}... (voice: ${voiceId})`);
    
    // Extract language code from voice ID (e.g., 'en-US-Neural2-F' -> 'en-US')
    const languageCode = voiceId.split('-').slice(0, 2).join('-') || 'en-US';
    
    const audioBuffer = await generateSpeechGoogle(text, voiceId, languageCode);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400',
      'X-Audio-Duration': Math.ceil(text.length / 15),
    });
    
    res.send(audioBuffer);
    console.log(`✅ Synthesized ${audioBuffer.length} bytes of audio`);
    
  } catch (error) {
    console.error('Error synthesizing speech:', error.message);
    
    res.status(500).json({ 
      error: error.message || 'Failed to synthesize speech',
      code: 'SYNTHESIS_FAILED'
    });
  }
});

export default router;
