import monitoringService from '../services/monitoringService.js';

/**
 * Express middleware for automatic API route performance tracking
 * 
 * Features:
 * - Lightweight (adds <1ms overhead)
 * - Non-blocking (metrics recorded asynchronously)
 * - Tracks all /api/* routes automatically
 * - Records latency, status codes, error rates
 * - Never throws errors (silent fail to prevent breaking routes)
 */

export function performanceMonitoringMiddleware(req, res, next) {
  // Only monitor API routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const startTime = Date.now();
  const route = req.path;
  const method = req.method;

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to capture metrics when response completes
  res.end = function (...args) {
    // Restore original end function
    res.end = originalEnd;

    // Call original end to complete the response
    const result = res.end.apply(res, args);

    // Record metrics asynchronously (non-blocking)
    setImmediate(() => {
      try {
        const latency = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Record API latency metric
        monitoringService.recordApiLatency(
          route,
          method,
          statusCode,
          latency,
          {
            user_agent: req.headers['user-agent'],
            content_length: res.get('content-length') || 0
          }
        );

        // Also record system resource usage periodically
        // Only do this for 1% of requests to avoid overhead
        if (Math.random() < 0.01) {
          monitoringService.recordResourceUsage();
        }
      } catch (error) {
        // Silent fail - monitoring should never break the app
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Performance monitoring error (non-critical):', error.message);
        }
      }
    });

    return result;
  };

  next();
}

/**
 * Middleware for monitoring specific slow routes
 * Use this for routes that are expected to be slow (e.g., AI generation, file processing)
 */
export function slowRouteMonitoring(expectedLatencyMs = 5000) {
  return function (req, res, next) {
    const startTime = Date.now();
    const route = req.path;

    res.on('finish', () => {
      const latency = Date.now() - startTime;
      
      // Only record if it's slower than expected
      if (latency > expectedLatencyMs) {
        setImmediate(() => {
          monitoringService.recordMetric(
            'slow_route_latency',
            latency,
            'ms',
            { route, method: req.method, status: res.statusCode.toString() },
            { expected_latency: expectedLatencyMs }
          );
        });
      }
    });

    next();
  };
}

/**
 * Database query monitoring wrapper
 * Wraps database queries to track their performance
 * 
 * Usage:
 * const result = await monitorDbQuery('users', 'SELECT', () => pool.query('SELECT * FROM users'));
 */
export async function monitorDbQuery(table, operation, queryFunction) {
  const startTime = Date.now();
  
  try {
    const result = await queryFunction();
    const duration = Date.now() - startTime;
    
    // Record query performance
    setImmediate(() => {
      monitoringService.recordDbQueryTime(
        operation,
        table,
        duration,
        { rows: result.rowCount || result.rows?.length || 0 }
      );
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record failed query
    setImmediate(() => {
      monitoringService.recordDbQueryTime(
        operation,
        table,
        duration,
        { error: error.message, failed: true }
      );
    });
    
    throw error;
  }
}

/**
 * External API call monitoring wrapper
 * Wraps external API calls (Gemini, OpenAI, etc.) to track performance
 * 
 * Usage:
 * const result = await monitorExternalApi('gemini', '/generateContent', () => {
 *   return geminiClient.generate(prompt);
 * });
 */
export async function monitorExternalApi(apiName, endpoint, apiFunction) {
  const startTime = Date.now();
  
  try {
    const result = await apiFunction();
    const latency = Date.now() - startTime;
    
    // Record successful API call
    setImmediate(() => {
      // Safely calculate response size, handling circular references
      let responseSize = 0;
      try {
        responseSize = JSON.stringify(result).length;
      } catch (jsonError) {
        // If result has circular references or other issues, estimate size differently
        if (typeof result === 'string') {
          responseSize = result.length;
        } else if (result && typeof result === 'object') {
          // Rough estimate based on object keys
          responseSize = Object.keys(result).length * 100;
        }
      }
      
      monitoringService.recordExternalApiCall(
        apiName,
        endpoint,
        true,
        latency,
        { response_size: responseSize }
      );
    });
    
    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    
    // Record failed API call
    setImmediate(() => {
      monitoringService.recordExternalApiCall(
        apiName,
        endpoint,
        false,
        latency,
        { error: error.message }
      );
    });
    
    throw error;
  }
}

export default performanceMonitoringMiddleware;
