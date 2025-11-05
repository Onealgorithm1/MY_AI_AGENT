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

      // Calculate recent average
      const recentAvg = recentMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / recentMetrics.length;
      const recentMax = Math.max(...recentMetrics.map(m => parseFloat(m.value)));

      // Detect anomalies
      const anomalies = [];

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
          type: 'threshold_breach',
          severity: 'medium',
          description: `${metricName} sustained increase: ${recentAvg.toFixed(2)} (baseline avg: ${baseline.avg_value.toFixed(2)})`,
          baseline_value: baseline.avg_value,
          anomaly_value: recentAvg,
          deviation_percentage: ((recentAvg - baseline.avg_value) / baseline.avg_value * 100).toFixed(2)
        });
      }

      return {
        hasAnomaly: anomalies.length > 0,
        anomalies,
        recentStats: { avg: recentAvg, max: recentMax },
        baseline
      };
    } catch (error) {
      console.error('Anomaly detection error:', error);
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
   * Get active anomalies
   */
  async getActiveAnomalies(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM performance_anomalies 
         WHERE status = 'active'
         ORDER BY severity DESC, detected_at DESC 
         LIMIT $1`,
        [limit]
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
