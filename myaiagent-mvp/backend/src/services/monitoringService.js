import pool from '../utils/database.js';

/**
 * Real-time Performance Monitoring Service
 * 
 * This service enables the AI companion to:
 * 1. Monitor its own operational performance
 * 2. Detect anomalies and performance issues
 * 3. Self-diagnose inefficiencies
 * 4. Provide data-backed insights about service health
 * 
 * CRITICAL: All operations are non-blocking to ensure zero performance impact
 */

class MonitoringService {
  constructor() {
    this.metricsBuffer = [];
    this.bufferSize = 100; // Batch writes for efficiency
    this.flushInterval = 5000; // Flush every 5 seconds
    this.startPeriodicFlush();
  }

  /**
   * Record a performance metric
   * Non-blocking - adds to buffer and returns immediately
   * 
   * @param {string} metricName - Name of the metric (e.g., 'api_latency', 'external_api_error_rate')
   * @param {number} value - The metric value
   * @param {string} unit - Unit of measurement (e.g., 'ms', '%', 'count')
   * @param {object} tags - Dimensional tags for filtering (e.g., {route: '/api/messages', status: '200'})
   * @param {object} metadata - Optional additional context
   */
  async recordMetric(metricName, value, unit, tags = {}, metadata = {}) {
    try {
      const metric = {
        metric_name: metricName,
        value,
        unit,
        tags: JSON.stringify(tags),
        metadata: JSON.stringify(metadata),
        timestamp: new Date()
      };

      this.metricsBuffer.push(metric);

      // Auto-flush if buffer is full
      if (this.metricsBuffer.length >= this.bufferSize) {
        setImmediate(() => this.flushMetrics());
      }
    } catch (error) {
      // Silent fail - monitoring should never break the app
      console.error('Monitoring error (non-critical):', error.message);
    }
  }

  /**
   * Record API route performance
   * Convenience method for HTTP request metrics
   */
  async recordApiLatency(route, method, statusCode, latencyMs, metadata = {}) {
    await this.recordMetric(
      'api_latency',
      latencyMs,
      'ms',
      { route, method, status: statusCode.toString() },
      metadata
    );

    // Also record error rate
    if (statusCode >= 400) {
      await this.recordMetric(
        'api_error',
        1,
        'count',
        { route, method, status: statusCode.toString() },
        metadata
      );
    }
  }

  /**
   * Record external API call performance
   */
  async recordExternalApiCall(apiName, endpoint, success, latencyMs, metadata = {}) {
    await this.recordMetric(
      'external_api_latency',
      latencyMs,
      'ms',
      { api: apiName, endpoint, success: success.toString() },
      metadata
    );

    if (!success) {
      await this.recordMetric(
        'external_api_error',
        1,
        'count',
        { api: apiName, endpoint },
        metadata
      );
    }
  }

  /**
   * Record database query performance
   */
  async recordDbQueryTime(operation, table, durationMs, metadata = {}) {
    await this.recordMetric(
      'db_query_time',
      durationMs,
      'ms',
      { operation, table },
      metadata
    );
  }

  /**
   * Record system resource usage
   */
  async recordResourceUsage() {
    try {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      await this.recordMetric('memory_usage', usage.heapUsed / 1024 / 1024, 'MB', {});
      await this.recordMetric('memory_total', usage.heapTotal / 1024 / 1024, 'MB', {});
      await this.recordMetric('cpu_user', cpuUsage.user / 1000, 'ms', {});
      await this.recordMetric('cpu_system', cpuUsage.system / 1000, 'ms', {});
    } catch (error) {
      console.error('Resource monitoring error (non-critical):', error.message);
    }
  }

  /**
   * Record WebSocket connection attempt
   * Tracks both successful and failed connection attempts
   * 
   * @param {string} endpoint - WebSocket endpoint (e.g., '/stt-stream', '/voice', '/ws/telemetry')
   * @param {boolean} success - Whether connection succeeded
   * @param {string} errorReason - Error reason if connection failed
   * @param {object} metadata - Optional additional context (e.g., userId, clientInfo)
   */
  async recordWebSocketConnection(endpoint, success, errorReason = null, metadata = {}) {
    await this.recordMetric(
      'websocket_connection',
      1,
      'count',
      { 
        endpoint, 
        success: success.toString(),
        error_reason: errorReason || 'none'
      },
      metadata
    );

    // Track connection failures separately for anomaly detection
    if (!success) {
      await this.recordMetric(
        'websocket_connection_error',
        1,
        'count',
        { endpoint, error_reason: errorReason || 'unknown' },
        metadata
      );
    }
  }

  /**
   * Record WebSocket stream/session error
   * Tracks errors during active WebSocket sessions
   * 
   * @param {string} endpoint - WebSocket endpoint
   * @param {string} errorType - Type of error (e.g., 'stream_error', 'api_error', 'timeout')
   * @param {string} errorMessage - Error message
   * @param {object} metadata - Optional additional context
   */
  async recordWebSocketError(endpoint, errorType, errorMessage, metadata = {}) {
    await this.recordMetric(
      'websocket_error',
      1,
      'count',
      { 
        endpoint, 
        error_type: errorType,
        error_message: errorMessage.substring(0, 100) // Truncate long messages
      },
      metadata
    );
  }

  /**
   * Record WebSocket session metrics
   * Track session duration and data transfer
   * 
   * @param {string} endpoint - WebSocket endpoint
   * @param {number} durationMs - Session duration in milliseconds
   * @param {number} messagesExchanged - Number of messages exchanged
   * @param {object} metadata - Optional additional context
   */
  async recordWebSocketSession(endpoint, durationMs, messagesExchanged, metadata = {}) {
    await this.recordMetric(
      'websocket_session_duration',
      durationMs,
      'ms',
      { endpoint },
      { ...metadata, messages: messagesExchanged }
    );
  }

  /**
   * Flush metrics buffer to database
   * Non-blocking - runs asynchronously
   */
  async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Build bulk insert query
      const values = metricsToFlush.map((m, i) => {
        const offset = i * 6;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
      }).join(', ');

      const params = metricsToFlush.flatMap(m => [
        m.timestamp,
        m.metric_name,
        m.value,
        m.unit,
        m.tags,
        m.metadata
      ]);

      const query = `
        INSERT INTO system_performance_metrics 
        (timestamp, metric_name, value, unit, tags, metadata)
        VALUES ${values}
      `;

      await pool.query(query, params);
    } catch (error) {
      console.error('Metrics flush error (non-critical):', error.message);
      // Don't re-add to buffer - lose these metrics to prevent memory leak
    }
  }

  /**
   * Start periodic flushing of metrics buffer
   */
  startPeriodicFlush() {
    setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetrics();
      }
    }, this.flushInterval);
  }

  /**
   * Query metrics for a specific time range
   * Used by AI to analyze its own performance
   * 
   * @param {string} metricName - Name of metric to query
   * @param {object} options - Query options (timeRange, tags, aggregation)
   * @returns {Promise<Array>} Metric data points
   */
  async queryMetrics(metricName, options = {}) {
    const {
      timeRange = '1 hour',
      tags = {},
      limit = 1000,
      aggregation = null // 'avg', 'sum', 'max', 'min', 'count'
    } = options;

    try {
      let query = `
        SELECT 
          timestamp,
          metric_name,
          value,
          unit,
          tags
        FROM system_performance_metrics
        WHERE metric_name = $1
          AND timestamp >= NOW() - INTERVAL '${timeRange}'
      `;

      const params = [metricName];

      // Add tag filters
      let paramIndex = 2;
      for (const [key, value] of Object.entries(tags)) {
        query += ` AND tags->>'${key}' = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Query metrics error:', error);
      return [];
    }
  }

  /**
   * Get recent performance summary
   * Provides aggregated statistics for the AI companion
   */
  async getPerformanceSummary(timeRange = '1 hour') {
    try {
      const query = `
        SELECT 
          metric_name,
          COUNT(*) as sample_count,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as p50_value,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99_value
        FROM system_performance_metrics
        WHERE timestamp >= NOW() - INTERVAL '${timeRange}'
        GROUP BY metric_name
        ORDER BY metric_name
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Performance summary error:', error);
      return [];
    }
  }

  /**
   * Detect anomalies in recent metrics
   * Basic anomaly detection using statistical thresholds
   */
  async detectAnomalies(metricName, timeRange = '1 hour') {
    try {
      // Get baseline statistics
      const baseline = await this.getBaseline(metricName);
      if (!baseline) {
        return { hasAnomaly: false, reason: 'No baseline available' };
      }

      // Get recent metrics
      const recentMetrics = await this.queryMetrics(metricName, { 
        timeRange, 
        limit: 100 
      });

      if (recentMetrics.length === 0) {
        return { hasAnomaly: false, reason: 'No recent data' };
      }

      // Calculate recent statistics
      const recentValues = recentMetrics.map(m => parseFloat(m.value));
      const recentAvg = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
      const recentMax = Math.max(...recentValues);
      const recentMin = Math.min(...recentValues);
      
      // Calculate standard deviation of recent data
      const recentVariance = recentValues.reduce((sum, v) => sum + Math.pow(v - recentAvg, 2), 0) / recentValues.length;
      const recentStdDev = Math.sqrt(recentVariance);

      // Detect anomalies
      const anomalies = [];
      
      // Z-score analysis: Detect outliers using standard deviation
      const zScore = baseline.std_deviation > 0 
        ? (recentMax - baseline.avg_value) / baseline.std_deviation 
        : 0;
      
      if (zScore > 3) {
        anomalies.push({
          type: 'statistical_outlier',
          severity: 'critical',
          description: `${metricName} statistical outlier: ${recentMax.toFixed(2)} (z-score: ${zScore.toFixed(2)})`,
          baseline_value: baseline.avg_value,
          anomaly_value: recentMax,
          z_score: zScore.toFixed(2),
          deviation_percentage: ((recentMax - baseline.avg_value) / baseline.avg_value * 100).toFixed(2)
        });
      } else if (zScore > 2) {
        anomalies.push({
          type: 'statistical_outlier',
          severity: 'high',
          description: `${metricName} anomaly detected: ${recentMax.toFixed(2)} (z-score: ${zScore.toFixed(2)})`,
          baseline_value: baseline.avg_value,
          anomaly_value: recentMax,
          z_score: zScore.toFixed(2),
          deviation_percentage: ((recentMax - baseline.avg_value) / baseline.avg_value * 100).toFixed(2)
        });
      }

      // Spike detection: Recent max > baseline p99 by 50%
      if (recentMax > baseline.p99_value * 1.5) {
        anomalies.push({
          type: 'spike',
          severity: 'high',
          description: `${metricName} spike detected: ${recentMax.toFixed(2)} (baseline p99: ${baseline.p99_value.toFixed(2)})`,
          baseline_value: baseline.p99_value,
          anomaly_value: recentMax,
          deviation_percentage: ((recentMax - baseline.p99_value) / baseline.p99_value * 100).toFixed(2)
        });
      }

      // Average increase: Recent avg > baseline avg by 30%
      if (recentAvg > baseline.avg_value * 1.3) {
        anomalies.push({
          type: 'sustained_increase',
          severity: 'medium',
          description: `${metricName} sustained increase: ${recentAvg.toFixed(2)} (baseline avg: ${baseline.avg_value.toFixed(2)})`,
          baseline_value: baseline.avg_value,
          anomaly_value: recentAvg,
          deviation_percentage: ((recentAvg - baseline.avg_value) / baseline.avg_value * 100).toFixed(2)
        });
      }
      
      // Trend detection: Check if values are consistently increasing
      if (recentValues.length >= 10) {
        const halfPoint = Math.floor(recentValues.length / 2);
        const firstHalf = recentValues.slice(0, halfPoint);
        const secondHalf = recentValues.slice(halfPoint);
        const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
        
        if (secondAvg > firstAvg * 1.2) {
          anomalies.push({
            type: 'upward_trend',
            severity: 'low',
            description: `${metricName} showing upward trend: ${((secondAvg - firstAvg) / firstAvg * 100).toFixed(2)}% increase`,
            baseline_value: firstAvg,
            anomaly_value: secondAvg,
            deviation_percentage: ((secondAvg - firstAvg) / firstAvg * 100).toFixed(2)
          });
        }
      }
      
      // Variance increase: Recent variability > baseline variability
      if (baseline.std_deviation > 0 && recentStdDev > baseline.std_deviation * 1.5) {
        anomalies.push({
          type: 'increased_variance',
          severity: 'low',
          description: `${metricName} increased variability detected: stddev ${recentStdDev.toFixed(2)} vs baseline ${baseline.std_deviation.toFixed(2)}`,
          baseline_value: baseline.std_deviation,
          anomaly_value: recentStdDev,
          deviation_percentage: ((recentStdDev - baseline.std_deviation) / baseline.std_deviation * 100).toFixed(2)
        });
      }

      return {
        hasAnomaly: anomalies.length > 0,
        anomalies,
        recentStats: { 
          avg: recentAvg, 
          max: recentMax, 
          min: recentMin,
          stdDev: recentStdDev,
          sampleSize: recentValues.length
        },
        baseline,
        analysis: {
          zScore: zScore.toFixed(2),
          deviationFromBaseline: ((recentAvg - baseline.avg_value) / baseline.avg_value * 100).toFixed(2) + '%',
          varianceChange: baseline.std_deviation > 0 
            ? ((recentStdDev - baseline.std_deviation) / baseline.std_deviation * 100).toFixed(2) + '%'
            : 'N/A'
        }
      };
    } catch (error) {
      console.error('Anomaly detection error:', error);
      return { hasAnomaly: false, error: error.message };
    }
  }

  /**
   * Detect WebSocket connection failures and error rates
   * WebSocket-specific anomaly detection with custom thresholds
   * 
   * @param {string} endpoint - WebSocket endpoint (e.g., '/stt-stream', '/voice', '/ws/telemetry')
   * @param {string} timeRange - Time range to analyze (default: '15 minutes')
   * @returns {object} Anomaly detection results with error rates
   */
  async detectWebSocketAnomalies(endpoint = null, timeRange = '15 minutes') {
    try {
      const anomalies = [];
      
      // Query WebSocket connection metrics
      const endpoints = endpoint ? [endpoint] : ['/stt-stream', '/voice', '/ws/telemetry'];
      
      for (const wsEndpoint of endpoints) {
        // Get connection attempts (both success and failure)
        const connectionsQuery = await pool.query(
          `SELECT 
            COUNT(*) as total_attempts,
            SUM(CASE WHEN tags->>'success' = 'true' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN tags->>'success' = 'false' THEN 1 ELSE 0 END) as failed
           FROM system_performance_metrics
           WHERE metric_name = 'websocket_connection'
             AND tags->>'endpoint' = $1
             AND timestamp >= NOW() - INTERVAL '${timeRange}'`,
          [wsEndpoint]
        );
        
        const connectionStats = connectionsQuery.rows[0];
        const totalAttempts = parseInt(connectionStats.total_attempts) || 0;
        const successful = parseInt(connectionStats.successful) || 0;
        const failed = parseInt(connectionStats.failed) || 0;
        
        if (totalAttempts === 0) continue; // Skip if no data
        
        const errorRate = (failed / totalAttempts) * 100;
        
        // Critical: >20% connection failure rate
        if (errorRate > 20) {
          anomalies.push({
            metricName: `websocket_connection_${wsEndpoint}`,
            type: 'high_error_rate',
            severity: 'critical',
            description: `${wsEndpoint} has ${errorRate.toFixed(1)}% connection failure rate (${failed}/${totalAttempts} failed)`,
            baseline_value: 5, // Expected error rate
            anomaly_value: errorRate,
            deviation_percentage: ((errorRate - 5) / 5 * 100).toFixed(2),
            tags: { endpoint: wsEndpoint, failed, successful, totalAttempts }
          });
        }
        // High: >10% connection failure rate
        else if (errorRate > 10) {
          anomalies.push({
            metricName: `websocket_connection_${wsEndpoint}`,
            type: 'elevated_error_rate',
            severity: 'high',
            description: `${wsEndpoint} has ${errorRate.toFixed(1)}% connection failure rate (${failed}/${totalAttempts} failed)`,
            baseline_value: 5,
            anomaly_value: errorRate,
            deviation_percentage: ((errorRate - 5) / 5 * 100).toFixed(2),
            tags: { endpoint: wsEndpoint, failed, successful, totalAttempts }
          });
        }
        // Medium: >5% connection failure rate
        else if (errorRate > 5) {
          anomalies.push({
            metricName: `websocket_connection_${wsEndpoint}`,
            type: 'moderate_error_rate',
            severity: 'medium',
            description: `${wsEndpoint} has ${errorRate.toFixed(1)}% connection failure rate (${failed}/${totalAttempts} failed)`,
            baseline_value: 5,
            anomaly_value: errorRate,
            deviation_percentage: ((errorRate - 5) / 5 * 100).toFixed(2),
            tags: { endpoint: wsEndpoint, failed, successful, totalAttempts }
          });
        }
        
        // Get stream/session errors
        const errorsQuery = await pool.query(
          `SELECT 
            COUNT(*) as error_count,
            tags->>'error_type' as error_type,
            tags->>'error_message' as sample_message
           FROM system_performance_metrics
           WHERE metric_name = 'websocket_error'
             AND tags->>'endpoint' = $1
             AND timestamp >= NOW() - INTERVAL '${timeRange}'
           GROUP BY tags->>'error_type', tags->>'error_message'
           ORDER BY error_count DESC
           LIMIT 5`,
          [wsEndpoint]
        );
        
        // Track stream errors separately
        const streamErrors = errorsQuery.rows;
        if (streamErrors.length > 0) {
          const totalErrors = streamErrors.reduce((sum, row) => sum + parseInt(row.error_count), 0);
          
          if (totalErrors > 10) {
            anomalies.push({
              metricName: `websocket_stream_${wsEndpoint}`,
              type: 'high_stream_errors',
              severity: totalErrors > 50 ? 'critical' : 'high',
              description: `${wsEndpoint} has ${totalErrors} stream/session errors in last ${timeRange}`,
              baseline_value: 10,
              anomaly_value: totalErrors,
              deviation_percentage: ((totalErrors - 10) / 10 * 100).toFixed(2),
              tags: { 
                endpoint: wsEndpoint, 
                topError: streamErrors[0].error_type,
                sampleMessage: streamErrors[0].sample_message?.substring(0, 100)
              }
            });
          }
        }
      }
      
      // Record anomalies in database
      for (const anomaly of anomalies) {
        await this.recordAnomaly(anomaly);
      }
      
      return {
        hasAnomaly: anomalies.length > 0,
        anomalies,
        endpointsAnalyzed: endpoints.length
      };
    } catch (error) {
      console.error('WebSocket anomaly detection error:', error);
      return { hasAnomaly: false, error: error.message };
    }
  }

  /**
   * Get or calculate baseline for a metric
   */
  async getBaseline(metricName) {
    try {
      // Check if we have a recent baseline
      const result = await pool.query(
        `SELECT * FROM performance_baselines 
         WHERE metric_name = $1 
         AND (valid_until IS NULL OR valid_until > NOW())
         ORDER BY calculated_at DESC 
         LIMIT 1`,
        [metricName]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Calculate new baseline from historical data
      return await this.calculateBaseline(metricName);
    } catch (error) {
      console.error('Get baseline error:', error);
      return null;
    }
  }

  /**
   * Calculate baseline statistics for a metric
   */
  async calculateBaseline(metricName, timeRange = '7 days') {
    try {
      const query = `
        SELECT 
          COUNT(*) as sample_size,
          AVG(value) as avg_value,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as p50_value,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          STDDEV(value) as std_deviation
        FROM system_performance_metrics
        WHERE metric_name = $1
          AND timestamp >= NOW() - INTERVAL '${timeRange}'
      `;

      const result = await pool.query(query, [metricName]);
      const stats = result.rows[0];

      if (!stats || stats.sample_size < 100) {
        return null; // Not enough data
      }

      // Store baseline
      const insertQuery = `
        INSERT INTO performance_baselines 
        (metric_name, avg_value, p50_value, p95_value, p99_value, min_value, max_value, std_deviation, sample_size, valid_until)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '1 day')
        ON CONFLICT (metric_name) 
        DO UPDATE SET
          avg_value = EXCLUDED.avg_value,
          p50_value = EXCLUDED.p50_value,
          p95_value = EXCLUDED.p95_value,
          p99_value = EXCLUDED.p99_value,
          min_value = EXCLUDED.min_value,
          max_value = EXCLUDED.max_value,
          std_deviation = EXCLUDED.std_deviation,
          sample_size = EXCLUDED.sample_size,
          calculated_at = CURRENT_TIMESTAMP,
          valid_until = NOW() + INTERVAL '1 day'
        RETURNING *
      `;

      const insertResult = await pool.query(insertQuery, [
        metricName,
        stats.avg_value,
        stats.p50_value,
        stats.p95_value,
        stats.p99_value,
        stats.min_value,
        stats.max_value,
        stats.std_deviation || 0,
        stats.sample_size
      ]);

      return insertResult.rows[0];
    } catch (error) {
      console.error('Calculate baseline error:', error);
      return null;
    }
  }

  /**
   * Record detected anomaly in database
   */
  async recordAnomaly(anomaly) {
    try {
      await pool.query(
        `INSERT INTO performance_anomalies 
         (metric_name, anomaly_type, severity, baseline_value, anomaly_value, deviation_percentage, description, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          anomaly.metricName,
          anomaly.type,
          anomaly.severity,
          anomaly.baseline_value,
          anomaly.anomaly_value,
          anomaly.deviation_percentage,
          anomaly.description,
          JSON.stringify(anomaly.tags || {})
        ]
      );
    } catch (error) {
      console.error('Record anomaly error:', error);
    }
  }

  /**
   * Get active anomalies with filtering
   * @param {string} timeRange - Time range to query (e.g., '1 hour', '24 hours')
   * @param {string} minSeverity - Minimum severity to include ('low', 'medium', 'high', 'critical')
   * @param {number} limit - Maximum number of anomalies to return
   */
  async getActiveAnomalies(timeRange = '24 hours', minSeverity = 'low', limit = 50) {
    try {
      // Severity hierarchy for filtering
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
      const minSeverityLevel = severityLevels[minSeverity] || 1;
      
      const result = await pool.query(
        `SELECT 
          id,
          metric_name,
          anomaly_type,
          severity,
          baseline_value,
          anomaly_value,
          deviation_percentage,
          description,
          tags,
          detected_at,
          status
         FROM performance_anomalies 
         WHERE status = 'active'
           AND detected_at >= NOW() - INTERVAL '${timeRange}'
           AND (
             CASE severity
               WHEN 'critical' THEN 4
               WHEN 'high' THEN 3
               WHEN 'medium' THEN 2
               WHEN 'low' THEN 1
               ELSE 0
             END
           ) >= $1
         ORDER BY 
           CASE severity
             WHEN 'critical' THEN 4
             WHEN 'high' THEN 3
             WHEN 'medium' THEN 2
             WHEN 'low' THEN 1
             ELSE 0
           END DESC,
           detected_at DESC 
         LIMIT $2`,
        [minSeverityLevel, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Get anomalies error:', error);
      return [];
    }
  }
}

// Export singleton instance
const monitoringService = new MonitoringService();
export default monitoringService;
