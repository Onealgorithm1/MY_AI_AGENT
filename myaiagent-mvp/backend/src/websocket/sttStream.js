import { WebSocketServer } from 'ws';
import { verifyToken } from '../utils/auth.js';
import { query } from '../utils/database.js';
import sttStreamingService from '../services/sttStreamingService.js';

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
      console.log(`✅ STT session authenticated: ${user.email}`);

      // Hand off connection to STT streaming service
      sttStreamingService.handleConnection(ws, user);

    } catch (error) {
      console.error('STT WebSocket authentication error:', error);
      ws.close(4000, 'Authentication failed');
    }
  });

  console.log('✅ STT WebSocket server initialized on /stt-stream');

  return wss;
}
