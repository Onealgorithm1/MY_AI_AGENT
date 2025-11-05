import { WebSocketServer } from 'ws';
import { verifyToken } from '../utils/auth.js';
import { query } from '../utils/database.js';
import sttStreamingService from '../services/sttStreamingService.js';
import monitoringService from '../services/monitoringService.js';

export function createSTTWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: '/stt-stream',
  });

  wss.on('connection', async (ws, req) => {
    console.log('🎤 STT WebSocket connection attempt');

    // Extract token from query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      // Track connection failure - no token
      monitoringService.recordWebSocketConnection('/stt-stream', false, 'no_token').catch(err => {
        console.error('Monitoring error (non-critical):', err.message);
      });
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
        // Track connection failure - invalid user
        monitoringService.recordWebSocketConnection('/stt-stream', false, 'invalid_user').catch(err => {
          console.error('Monitoring error (non-critical):', err.message);
        });
        ws.close(4002, 'Invalid user');
        return;
      }

      const user = userResult.rows[0];
      console.log(`✅ STT session authenticated: ${user.email}`);

      // Track successful connection
      monitoringService.recordWebSocketConnection('/stt-stream', true, null, { userId: user.id }).catch(err => {
        console.error('Monitoring error (non-critical):', err.message);
      });

      // Hand off connection to STT streaming service
      sttStreamingService.handleConnection(ws, user);

    } catch (error) {
      console.error('STT WebSocket authentication error:', error);
      // Track connection failure - authentication error
      monitoringService.recordWebSocketConnection('/stt-stream', false, 'auth_failed', { 
        error: error.message 
      }).catch(err => {
        console.error('Monitoring error (non-critical):', err.message);
      });
      ws.close(4000, 'Authentication failed');
    }
  });

  console.log('✅ STT WebSocket server initialized on /stt-stream');

  return wss;
}
