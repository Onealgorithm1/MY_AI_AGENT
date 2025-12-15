import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { generateSpeechGoogle, getVoices } from '../services/googleTTS.js';
import monitoringService from '../services/monitoringService.js';

const router = express.Router();

/**
 * Split text into sentences for streaming TTS
 * Splits on sentence boundaries while preserving natural pauses
 */
function splitIntoSentences(text) {
  // Match sentences ending with . ! ? followed by space or end of string
  // Also handle common abbreviations that shouldn't split (Dr. Mr. Ms. etc.)
  const sentences = text
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1|')  // Split on sentence boundaries
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Combine very short sentences (< 10 chars) with the next one
  const optimizedSentences = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length === 0) {
      currentChunk = sentence;
    } else if (currentChunk.length + sentence.length < 200) {
      // Combine with previous if total is still reasonable
      currentChunk += ' ' + sentence;
    } else {
      optimizedSentences.push(currentChunk);
      currentChunk = sentence;
    }
  }
  
  if (currentChunk.length > 0) {
    optimizedSentences.push(currentChunk);
  }
  
  return optimizedSentences.length > 0 ? optimizedSentences : [text];
}

router.use(authenticate);

router.get('/voices', async (req, res) => {
  try {
    console.log('🎙️ Fetching voices from Google TTS API...');
    const voices = await getVoices();

    console.log(`✅ Successfully retrieved ${voices.length} voices`);
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
    console.error('❌ Error fetching voices:', error.message);
    const statusCode = error.message.includes('Invalid API key') ? 401 :
                       error.message.includes('not enabled') ? 403 :
                       error.message.includes('Rate limit') ? 429 : 500;

    res.status(statusCode).json({
      error: error.message || 'Failed to fetch voices',
      code: 'FETCH_VOICES_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/synthesize', async (req, res) => {
  const backendStartTime = Date.now();

  try {
    let { text, voiceId = 'en-US-Wavenet-F' } = req.body;

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
      console.warn(`⚠️  Old ElevenLabs voice ID detected: ${voiceId}, using default Wavenet voice`);
      voiceId = 'en-US-Wavenet-F'; // Default Wavenet voice
    } else if (!isGoogleVoice) {
      console.warn(`⚠️  Invalid voice ID: ${voiceId}, using default Wavenet voice`);
      voiceId = 'en-US-Wavenet-F';
    }

    console.log(`🔊 Synthesizing speech: ${text.substring(0, 50)}... (voice: ${voiceId})`);
    
    // Extract language code from voice ID (e.g., 'en-US-Neural2-F' -> 'en-US')
    const languageCode = voiceId.split('-').slice(0, 2).join('-') || 'en-US';
    
    const audioBuffer = await generateSpeechGoogle(text, voiceId, languageCode);
    
    const backendResponseTime = Date.now() - backendStartTime;
    
    // Record backend response time metric
    await monitoringService.recordMetric(
      'tts_backend_response_time',
      backendResponseTime,
      'ms',
      { voiceId },
      { textLength: text.length, audioSize: audioBuffer.length, success: true }
    );
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400',
      'X-Audio-Duration': Math.ceil(text.length / 15),
      'X-Backend-Response-Time': backendResponseTime,
    });
    
    res.send(audioBuffer);
    console.log(`✅ Synthesized ${audioBuffer.length} bytes of audio in ${backendResponseTime}ms`);
    
  } catch (error) {
    const backendResponseTime = Date.now() - backendStartTime;
    
    // Record failed backend response
    await monitoringService.recordMetric(
      'tts_backend_response_time',
      backendResponseTime,
      'ms',
      { voiceId: req.body.voiceId || 'unknown' },
      { textLength: req.body.text?.length || 0, success: false, error: error.message }
    );
    
    console.error('Error synthesizing speech:', error.message);
    
    res.status(500).json({ 
      error: error.message || 'Failed to synthesize speech',
      code: 'SYNTHESIS_FAILED'
    });
  }
});

/**
 * Streaming TTS endpoint
 * Splits text into sentences and streams audio chunks progressively
 * Enables earlier playback start and more responsive user experience
 */
router.post('/synthesize-stream', async (req, res) => {
  const requestStartTime = Date.now();

  try {
    let { text, voiceId = 'en-US-Wavenet-F' } = req.body;

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
    
    // Validate voice ID
    const isGoogleVoice = /^[a-zA-Z]{2}-[a-zA-Z]{2}-[a-zA-Z0-9\-]+$/.test(voiceId);
    if (!isGoogleVoice) {
      voiceId = 'en-US-Wavenet-F';
    }

    console.log(`🎙️  Streaming TTS synthesis: ${text.substring(0, 50)}... (voice: ${voiceId})`);
    
    // Split text into sentences for progressive synthesis
    const sentences = splitIntoSentences(text);
    console.log(`📝 Split into ${sentences.length} sentence chunks`);
    
    // Extract language code from voice ID
    const languageCode = voiceId.split('-').slice(0, 2).join('-') || 'en-US';
    
    // Set up SSE (Server-Sent Events) headers for streaming
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Track timing for each chunk
    const chunkTimings = [];
    let firstChunkTime = null;
    
    // Generate and send audio chunks progressively
    const audioChunks = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const chunkStartTime = Date.now();
      
      try {
        console.log(`🔊 Synthesizing chunk ${i + 1}/${sentences.length}: "${sentence.substring(0, 30)}..."`);
        
        const audioBuffer = await generateSpeechGoogle(sentence, voiceId, languageCode);
        const chunkLatency = Date.now() - chunkStartTime;
        
        if (firstChunkTime === null) {
          firstChunkTime = Date.now() - requestStartTime;
        }
        
        chunkTimings.push({
          chunkIndex: i,
          textLength: sentence.length,
          latency: chunkLatency,
          audioSize: audioBuffer.length
        });
        
        // Convert buffer to base64 for JSON transmission
        const audioBase64 = audioBuffer.toString('base64');
        
        // Send chunk immediately
        const chunk = {
          chunkIndex: i,
          totalChunks: sentences.length,
          audioData: audioBase64,
          text: sentence,
          isLast: i === sentences.length - 1,
          chunkLatency
        };
        
        audioChunks.push(audioBuffer);
        
        // Write chunk as newline-delimited JSON
        res.write(JSON.stringify(chunk) + '\n');
        
        console.log(`✅ Sent chunk ${i + 1}/${sentences.length} (${audioBuffer.length} bytes, ${chunkLatency}ms)`);
        
        // Record per-chunk metrics
        await monitoringService.recordMetric(
          'tts_stream_chunk_latency',
          chunkLatency,
          'ms',
          { voiceId, chunkIndex: i, totalChunks: sentences.length },
          { textLength: sentence.length, audioSize: audioBuffer.length }
        );
        
      } catch (error) {
        console.error(`❌ Error synthesizing chunk ${i + 1}:`, error.message);
        
        // Send error chunk
        res.write(JSON.stringify({
          chunkIndex: i,
          error: error.message,
          isLast: i === sentences.length - 1
        }) + '\n');
      }
    }
    
    const totalTime = Date.now() - requestStartTime;
    
    // Record overall streaming session metrics
    await monitoringService.recordMetric(
      'tts_stream_session_time',
      totalTime,
      'ms',
      { voiceId, chunksCount: sentences.length },
      { 
        textLength: text.length,
        firstChunkTime,
        totalAudioSize: audioChunks.reduce((sum, buf) => sum + buf.length, 0),
        chunkTimings
      }
    );
    
    console.log(`🎬 Streaming TTS complete: ${sentences.length} chunks in ${totalTime}ms (first chunk: ${firstChunkTime}ms)`);
    
    res.end();
    
  } catch (error) {
    console.error('Error in streaming TTS:', error.message);
    
    res.status(500).json({ 
      error: error.message || 'Failed to synthesize speech',
      code: 'STREAMING_SYNTHESIS_FAILED'
    });
  }
});

export default router;
