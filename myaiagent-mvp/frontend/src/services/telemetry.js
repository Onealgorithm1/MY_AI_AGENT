const SAMPLE_RATE = 0.1;
const MAX_EVENTS_PER_MINUTE = 100;

class TelemetryService {
  constructor() {
    this.eventQueue = [];
    this.eventCount = 0;
    this.lastResetTime = Date.now();
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.telemetryEnabled = true;
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

    try {
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

      await fetch(`${this.apiUrl}/telemetry/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId,
        },
        credentials: 'include',
        body: JSON.stringify(telemetryPayload),
      });
    } catch (error) {
      console.error('Telemetry send failed:', error);
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
