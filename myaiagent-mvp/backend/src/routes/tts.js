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
        language_code: v.language_code,
        category: v.category,
        quality: v.quality,
        ssml_gender: v.ssml_gender
      }))
    });
  } catch (error) {
    console.error('Error fetching voices:', error.message);
    
    if (error.message.includes('not configured')) {
      return res.status(400).json({ 
        error: 'Google Cloud TTS credentials not configured. Please add them in the Admin Dashboard.',
        code: 'CREDENTIALS_MISSING'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch voices',
      code: 'FETCH_VOICES_FAILED'
    });
  }
});

router.post('/synthesize', async (req, res) => {
  try {
    const { text, voiceId = 'en-US-Neural2-C', speakingRate = 1.0 } = req.body;

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

    console.log(`🔊 Synthesizing speech: ${text.substring(0, 50)}... (voice: ${voiceId})`);
    const audioBuffer = await generateSpeechGoogle(text, voiceId, speakingRate);
    
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
    
    if (error.message.includes('not configured')) {
      return res.status(400).json({ 
        error: 'Google Cloud TTS credentials not configured',
        code: 'CREDENTIALS_MISSING'
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to synthesize speech',
      code: 'SYNTHESIS_FAILED'
    });
  }
});

export default router;
