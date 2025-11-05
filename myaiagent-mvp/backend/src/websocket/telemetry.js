import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url';
import monitoringService from '../services/monitoringService.js';

const telemetryClients = new Map();

export function createTelemetryWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    path: '/ws/telemetry',
  });

  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/ws/telemetry') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, request) => {
    console.log('[TELEMETRY WS] New connection attempt');

    const cookies = request.headers.cookie;
    let userId = null;

    if (cookies) {
      const tokenMatch = cookies.match(/token=([^;]+)/);
      if (tokenMatch) {
        try {
          const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
          userId = decoded.userId;
          console.log('[TELEMETRY WS] Authenticated user:', userId);
        } catch (error) {
          console.log('[TELEMETRY WS] Invalid token');
        }
      }
    }

    if (!userId) {
      userId = `anonymous_${Date.now()}`;
      console.log('[TELEMETRY WS] Anonymous connection:', userId);
    }

    telemetryClients.set(userId, ws);
    
    // Track successful connection (including anonymous)
    const isAuthenticated = !userId.startsWith('anonymous_');
    monitoringService.recordWebSocketConnection(
      '/ws/telemetry', 
      true, 
      null, 
      { userId, authenticated: isAuthenticated }
    ).catch(err => {
      console.error('Monitoring error (non-critical):', err.message);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleTelemetryMessage(userId, message);
      } catch (error) {
        console.error('[TELEMETRY WS] Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('[TELEMETRY WS] Client disconnected:', userId);
      telemetryClients.delete(userId);
    });

    ws.on('error', (error) => {
      console.error('[TELEMETRY WS] WebSocket error:', error);
      
      // Track WebSocket error
      monitoringService.recordWebSocketError(
        '/ws/telemetry',
        'connection_error',
        error.message,
        { userId }
      ).catch(err => {
        console.error('Monitoring error (non-critical):', err.message);
      });
    });

    ws.send(JSON.stringify({
      type: 'connection_established',
      userId,
      timestamp: new Date().toISOString(),
    }));
  });

  console.log('✅ Telemetry WebSocket server initialized on /ws/telemetry');
  return wss;
}

function handleTelemetryMessage(userId, message) {
  console.log('[TELEMETRY WS] Message from', userId, ':', message.type);

  switch (message.type) {
    case 'ui_state_update':
      break;
    case 'page_change':
      break;
    case 'feature_interaction':
      break;
    default:
      console.log('[TELEMETRY WS] Unknown message type:', message.type);
  }
}

export function broadcastToUser(userId, data) {
  const client = telemetryClients.get(userId);
  if (client && client.readyState === 1) {
    client.send(JSON.stringify(data));
  }
}

export function getConnectedUsers() {
  return Array.from(telemetryClients.keys());
}
