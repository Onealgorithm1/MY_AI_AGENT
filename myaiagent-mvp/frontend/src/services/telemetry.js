import { getCsrfToken } from './api.js';

const SAMPLE_RATE = 0.1;
const MAX_EVENTS_PER_MINUTE = 100;

class TelemetryService {
  constructor() {
    this.eventQueue = [];
    this.eventCount = 0;
    this.lastResetTime = Date.now();
    this.apiUrl = import.meta.env.VITE_API_URL || '/api';
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.telemetryEnabled = true;
    this.sendingTelemetry = false; // Prevent recursive error tracking
  }

  setTelemetryEnabled(enabled) {
    this.telemetryEnabled = enabled;
  }

  shouldSendEvent(eventType, priority = 'normal') {
    if (!this.telemetryEnabled) return false;

    const now = Date.now();
    if (now - this.lastResetTime > 60000) {
      this.eventCount = 0;
      this.lastResetTime = now;
    }

    if (this.eventCount >= MAX_EVENTS_PER_MINUTE) {
      return false;
    }

    if (priority === 'high') {
      return true;
    }

    if (priority === 'low' && Math.random() > SAMPLE_RATE) {
      return false;
    }

    return true;
  }

  redactPII(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const redacted = Array.isArray(data) ? [...data] : { ...data };
    const piiFields = ['email', 'password', 'phone', 'phoneNumber', 'fullName', 'name', 'address'];

    for (const key in redacted) {
      if (piiFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this.redactPII(redacted[key]);
      }
    }

    return redacted;
  }

  async sendEvent(eventType, eventData, priority = 'normal') {
    if (!this.shouldSendEvent(eventType, priority)) {
      return;
    }

    // Prevent recursive error tracking from telemetry failures
    if (this.sendingTelemetry && eventType === 'console_error') {
      return;
    }

    try {
      this.sendingTelemetry = true;
      this.eventCount++;

      const telemetryPayload = {
        type: eventType,
        timestamp: new Date().toISOString(),
        data: this.redactPII(eventData),
        context: {
          url: window.location.pathname,
          userAgent: navigator.userAgent.substring(0, 200),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          performance: {
            memoryUsage: performance.memory?.usedJSHeapSize,
            timing: performance.timing?.loadEventEnd - performance.timing?.navigationStart,
          },
        },
      };

      const csrfToken = getCsrfToken();
      const headers = {
        'Content-Type': 'application/json',
        'X-Session-ID': this.sessionId,
      };

      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        await fetch(`${this.apiUrl}/telemetry/event`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(telemetryPayload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Silently fail telemetry - don't log errors to avoid infinite loops
      // In development only log if telemetry is misconfigured
      if (import.meta.env.DEV && error?.name !== 'AbortError') {
        // Use console.warn instead of console.error to avoid triggering error handler
        console.warn('Telemetry temporarily unavailable:', error?.message?.substring(0, 50));
      }
    } finally {
      this.sendingTelemetry = false;
    }
  }

  trackPageView(pageName) {
    this.sendEvent('page_view', { page: pageName }, 'low');
  }

  trackUIAction(action, details) {
    this.sendEvent('ui_action', { action, ...details }, 'normal');
  }

  trackError(error, context) {
    this.sendEvent('client_error', {
      message: error?.message || 'Unknown error',
      stack: error?.stack?.substring(0, 1000),
      context,
    }, 'high');
  }

  trackPerformance(metric, value) {
    this.sendEvent('performance', { metric, value }, 'low');
  }

  trackFeatureUsage(feature, metadata) {
    this.sendEvent('feature_usage', { feature, metadata }, 'normal');
  }

  trackConsoleError(message, source, lineno, colno, error) {
    this.sendEvent('console_error', {
      message: String(message).substring(0, 500),
      source,
      lineno,
      colno,
      stack: error?.stack?.substring(0, 1000),
    }, 'high');
  }
}

const telemetryService = new TelemetryService();

window.addEventListener('error', (event) => {
  telemetryService.trackConsoleError(
    event.message,
    event.filename,
    event.lineno,
    event.colno,
    event.error
  );
});

window.addEventListener('unhandledrejection', (event) => {
  telemetryService.trackError(
    event.reason,
    { type: 'unhandled_promise_rejection' }
  );
});

export default telemetryService;
