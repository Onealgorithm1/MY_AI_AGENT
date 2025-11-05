import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import telemetryService from '../services/telemetry';

export function useTelemetry(pageName) {
  const wsRef = useRef(null);
  const { user } = useAuthStore();
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    telemetryService.trackPageView(pageName);

    if (!user) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/telemetry';
    
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('[Telemetry] WebSocket connected');
          wsRef.current.send(JSON.stringify({
            type: 'page_change',
            page: pageName,
            timestamp: new Date().toISOString(),
          }));
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[Telemetry] Message received:', data.type);
          } catch (error) {
            console.error('[Telemetry] Failed to parse message:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('[Telemetry] WebSocket disconnected, reconnecting in 5s...');
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        };

        wsRef.current.onerror = (error) => {
          console.error('[Telemetry] WebSocket error:', error);
        };
      } catch (error) {
        console.error('[Telemetry] Failed to create WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [pageName, user]);

  const sendUIStateUpdate = (state) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ui_state_update',
        state,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  return { sendUIStateUpdate };
}
