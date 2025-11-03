import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { generateSpeechElevenLabs, getVoices } from '../services/elevenlabs.js';
import { query } from '../utils/database.js';
import { decryptSecret } from '../services/secrets.js';

const router = express.Router();

router.use(authenticate);

async function getElevenLabsApiKey() {
  try {
    const result = await query(
      `SELECT key_value FROM api_secrets 
       WHERE key_name = 'ELEVENLABS_API_KEY' 
       AND is_active = true 
       ORDER BY is_default DESC NULLS LAST, created_at DESC 
       LIMIT 1`
    );

    if (result.rows.length > 0) {
      return decryptSecret(result.rows[0].key_value);
    }

    return process.env.ELEVENLABS_API_KEY || null;
  } catch (error) {
    console.error('Error fetching ElevenLabs API key:', error);
    return process.env.ELEVENLABS_API_KEY || null;
  }
}

router.get('/voices', async (req, res) => {
  try {
    const apiKey = await getElevenLabsApiKey();
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'ElevenLabs API key not configured. Please add it in the Admin Dashboard.',
        code: 'API_KEY_MISSING'
      });
    }

    const voices = await getVoices(apiKey);
    
    res.json({ 
      voices: voices.map(v => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        labels: v.labels,
      }))
    });
  } catch (error) {
    console.error('Error fetching voices:', error.message);
    
    // Check for HTTP status codes (support both error.response.status and error.status)
    const statusCode = error.response?.status || error.status || error.statusCode;
    
    if (statusCode === 401) {
      return res.status(401).json({ 
        error: 'Invalid ElevenLabs API key',
        code: 'INVALID_API_KEY'
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
    const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL' } = req.body;

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

    const apiKey = await getElevenLabsApiKey();
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'ElevenLabs API key not configured',
        code: 'API_KEY_MISSING'
      });
    }

    console.log(`🔊 Synthesizing speech: ${text.substring(0, 50)}... (voice: ${voiceId})`);
    const audioBuffer = await generateSpeechElevenLabs(text, voiceId, 'eleven_multilingual_v2', apiKey);
    
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
    
    // Check for HTTP status codes (support both error.response.status and error.status)
    const statusCode = error.response?.status || error.status || error.statusCode;
    
    if (statusCode === 401) {
      return res.status(401).json({ 
        error: 'Invalid ElevenLabs API key',
        code: 'INVALID_API_KEY'
      });
    }
    
    if (statusCode === 429) {
      return res.status(429).json({ 
        error: 'ElevenLabs rate limit reached. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to synthesize speech',
      code: 'SYNTHESIS_FAILED'
    });
  }
});

export default router;
