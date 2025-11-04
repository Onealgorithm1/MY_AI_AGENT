import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth.js';
import { transcribeAudio } from '../services/openai.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/transcribe', authenticate, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioBuffer = req.file.buffer;
    const languageCode = req.body.languageCode || 'en-US';

    console.log('🎤 Transcribing audio:', {
      size: audioBuffer.length,
      languageCode,
      mimeType: req.file.mimetype
    });

    const transcript = await transcribeAudioGoogle(audioBuffer, languageCode);

    res.json({ 
      transcript,
      success: true 
    });
  } catch (error) {
    console.error('Error transcribing audio:', error.message);
    res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
});

export default router;
