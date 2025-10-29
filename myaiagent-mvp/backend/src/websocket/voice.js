import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '../utils/auth.js';
import { query } from '../utils/database.js';
import { decryptSecret } from '../services/secrets.js';
import { incrementVoiceMinutes } from '../middleware/rateLimit.js';

const VOICE_SESSION_MAX_MINUTES = parseInt(process.env.VOICE_SESSION_MAX_MINUTES) || 10;
const VOICE_SESSION_WARNING_MINUTES = parseInt(process.env.VOICE_SESSION_WARNING_MINUTES) || 1;

// Active voice sessions
const activeSessions = new Map();

// Get OpenAI API key from secrets
async function getOpenAIKey() {
  try {
    const result = await query(
      `SELECT key_value FROM api_secrets 
       WHERE key_name = 'OPENAI_API_KEY' AND is_active = true`
    );
    
    if (result.rows.length === 0) {
      // Fallback to environment variable
      return process.env.OPENAI_API_KEY;
    }
    
    return decryptSecret(result.rows[0].key_value);
  } catch (error) {
    console.error('Get OpenAI key error:', error);
    return process.env.OPENAI_API_KEY;
  }
}

export function createVoiceWebSocketServer(server) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/voice',
  });

  wss.on('connection', async (ws, req) => {
    console.log('🎤 Voice WebSocket connection attempt');

    // Extract token from query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'No token provided');
      return;
    }

    try {
      // Verify user
      const decoded = verifyToken(token);
      const userResult = await query(
        'SELECT id, email, full_name FROM users WHERE id = $1 AND is_active = true',
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        ws.close(4002, 'Invalid user');
        return;
      }

      const user = userResult.rows[0];

      // Check voice limit
      const usageResult = await query(
        `SELECT voice_minutes_used FROM usage_tracking 
         WHERE user_id = $1 AND date = CURRENT_DATE`,
        [user.id]
      );

      const voiceMinutesUsed = usageResult.rows[0]?.voice_minutes_used || 0;
      const limit = parseInt(process.env.RATE_LIMIT_VOICE_MINUTES) || 30;

      if (voiceMinutesUsed >= limit) {
        ws.close(4003, 'Voice limit reached');
        return;
      }

      console.log(`✅ Voice session authenticated: ${user.email}`);

      // Get conversation ID from params
      const conversationId = url.searchParams.get('conversationId');

      // Create voice session in database
      const sessionResult = await query(
        `INSERT INTO voice_sessions (user_id, conversation_id, status, model)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, conversationId, 'active', 'gpt-4o-realtime-preview']
      );

      const voiceSessionId = sessionResult.rows[0].id;

      // Session data
      const session = {
        id: voiceSessionId,
        userId: user.id,
        conversationId,
        ws,
        openaiWs: null,
        startTime: Date.now(),
        lastActivity: Date.now(),
        warningsSent: false,
      };

      activeSessions.set(ws, session);

      // Connect to OpenAI Realtime API
      const openaiKey = await getOpenAIKey();
      
      if (!openaiKey) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'OpenAI API key not configured',
        }));
        ws.close();
        return;
      }

      const openaiWs = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
        {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'OpenAI-Beta': 'realtime=v1',
          },
        }
      );

      session.openaiWs = openaiWs;

      // OpenAI connection opened
      openaiWs.on('open', () => {
        console.log('🔗 Connected to OpenAI Realtime API');
        
        // Send session configuration
        openaiWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a helpful AI assistant. Respond naturally and conversationally.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        }));

        // Notify client
        ws.send(JSON.stringify({
          type: 'session.started',
          sessionId: voiceSessionId,
          maxMinutes: VOICE_SESSION_MAX_MINUTES,
        }));
      });

      // Forward messages from OpenAI to client
      openaiWs.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Update last activity
          session.lastActivity = Date.now();

          // Handle different message types
          if (message.type === 'response.audio.delta') {
            // Audio chunk from AI
            ws.send(JSON.stringify({
              type: 'audio.delta',
              delta: message.delta,
            }));
          } else if (message.type === 'response.audio_transcript.delta') {
            // Text transcript
            ws.send(JSON.stringify({
              type: 'transcript.delta',
              delta: message.delta,
            }));
          } else if (message.type === 'response.done') {
            // Response complete
            ws.send(JSON.stringify({
              type: 'response.complete',
            }));
          } else if (message.type === 'input_audio_buffer.speech_started') {
            // User started speaking
            ws.send(JSON.stringify({
              type: 'user.speech_started',
            }));
          } else if (message.type === 'input_audio_buffer.speech_stopped') {
            // User stopped speaking
            ws.send(JSON.stringify({
              type: 'user.speech_stopped',
            }));
          } else {
            // Forward other messages
            ws.send(data);
          }
        } catch (error) {
          console.error('Error processing OpenAI message:', error);
        }
      });

      openaiWs.on('error', (error) => {
        console.error('OpenAI WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'OpenAI connection error',
        }));
      });

      openaiWs.on('close', () => {
        console.log('🔌 OpenAI connection closed');
        ws.close();
      });

      // Handle messages from client
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());

          // Update last activity
          session.lastActivity = Date.now();

          if (message.type === 'audio.append') {
            // Forward audio data to OpenAI
            if (openaiWs.readyState === WebSocket.OPEN) {
              openaiWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: message.audio,
              }));
            }
          } else if (message.type === 'audio.commit') {
            // Commit audio buffer
            if (openaiWs.readyState === WebSocket.OPEN) {
              openaiWs.send(JSON.stringify({
                type: 'input_audio_buffer.commit',
              }));
            }
          } else if (message.type === 'response.create') {
            // Request AI response
            if (openaiWs.readyState === WebSocket.OPEN) {
              openaiWs.send(JSON.stringify({
                type: 'response.create',
              }));
            }
          } else if (message.type === 'response.cancel') {
            // Cancel ongoing response (interruption)
            if (openaiWs.readyState === WebSocket.OPEN) {
              openaiWs.send(JSON.stringify({
                type: 'response.cancel',
              }));
            }
          }
        } catch (error) {
          console.error('Error processing client message:', error);
        }
      });

      // Session timeout check
      const timeoutInterval = setInterval(() => {
        const elapsed = (Date.now() - session.startTime) / 1000 / 60; // minutes

        // Warning at X minutes remaining
        if (elapsed >= VOICE_SESSION_MAX_MINUTES - VOICE_SESSION_WARNING_MINUTES && !session.warningsSent) {
          ws.send(JSON.stringify({
            type: 'session.warning',
            message: `${VOICE_SESSION_WARNING_MINUTES} minute(s) remaining`,
            remainingMinutes: VOICE_SESSION_MAX_MINUTES - elapsed,
          }));
          session.warningsSent = true;
        }

        // Hard limit
        if (elapsed >= VOICE_SESSION_MAX_MINUTES) {
          ws.send(JSON.stringify({
            type: 'session.timeout',
            message: 'Maximum session duration reached',
          }));
          ws.close(1000, 'Session timeout');
          clearInterval(timeoutInterval);
        }
      }, 10000); // Check every 10 seconds

      // Handle disconnect
      ws.on('close', async () => {
        clearInterval(timeoutInterval);

        const elapsed = (Date.now() - session.startTime) / 1000 / 60; // minutes

        // Close OpenAI connection
        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.close();
        }

        // Update voice session in database
        await query(
          `UPDATE voice_sessions 
           SET status = 'completed', 
               ended_at = CURRENT_TIMESTAMP,
               duration_seconds = $1
           WHERE id = $2`,
          [Math.round(elapsed * 60), voiceSessionId]
        );

        // Update usage tracking
        await incrementVoiceMinutes(user.id, elapsed);

        activeSessions.delete(ws);

        console.log(`🔴 Voice session ended: ${user.email} (${elapsed.toFixed(2)} minutes)`);
      });

    } catch (error) {
      console.error('Voice WebSocket error:', error);
      ws.close(4000, 'Authentication failed');
    }
  });

  // Cleanup inactive sessions
  setInterval(() => {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes of inactivity

    for (const [ws, session] of activeSessions.entries()) {
      if (now - session.lastActivity > timeout) {
        console.log(`⏱️ Closing inactive session: ${session.userId}`);
        ws.close(1000, 'Inactive session');
      }
    }
  }, 60000); // Check every minute

  console.log('✅ Voice WebSocket server initialized on /voice');

  return wss;
}

// Get active sessions count
export function getActiveVoiceSessionsCount() {
  return activeSessions.size;
}

// Close all sessions (for shutdown)
export function closeAllVoiceSessions() {
  for (const [ws] of activeSessions.entries()) {
    ws.close(1001, 'Server shutting down');
  }
  activeSessions.clear();
}
