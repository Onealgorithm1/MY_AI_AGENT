import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/evm/projects
 * @desc    Get all EVM projects for user
 * @access  Private
 */
router.get('/projects', authenticate, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = `
      SELECT p.*, u.email as project_manager_email
      FROM evm_projects p
      LEFT JOIN users u ON p.project_manager_id = u.id
      WHERE p.created_by = $1
    `;

    const params = [req.user.id];

    if (status) {
      query += ` AND p.project_status = $2`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      projects: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Get EVM projects error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get EVM projects',
    });
  }
});

/**
 * @route   POST /api/evm/projects
 * @desc    Create new EVM project
 * @access  Private
 */
router.post('/projects', authenticate, async (req, res) => {
  try {
    const {
      projectName,
      projectNumber,
      opportunityId,
      contractAwardId,
      contractPiid,
      description,
      projectManagerId,
      totalBudget,
      budgetAtCompletion,
      plannedStartDate,
      plannedEndDate,
      cpiThreshold,
      spiThreshold,
    } = req.body;

    if (!projectName || !totalBudget || !plannedStartDate || !plannedEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Project name, budget, and dates are required',
      });
    }

    const query = `
      INSERT INTO evm_projects (
        project_name, project_number, opportunity_id, contract_award_id,
        contract_piid, description, project_manager_id,
        total_budget, budget_at_completion,
        planned_start_date, planned_end_date,
        cpi_threshold, spi_threshold,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const values = [
      projectName,
      projectNumber,
      opportunityId,
      contractAwardId,
      contractPiid,
      description,
      projectManagerId || req.user.id,
      totalBudget,
      budgetAtCompletion || totalBudget,
      plannedStartDate,
      plannedEndDate,
      cpiThreshold || 0.9,
      spiThreshold || 0.9,
      req.user.id,
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      project: result.rows[0],
    });
  } catch (error) {
    console.error('Create EVM project error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create EVM project',
    });
  }
});

/**
 * @route   GET /api/evm/projects/:id
 * @desc    Get EVM project by ID
 * @access  Private
 */
router.get('/projects/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT p.*, u.email as project_manager_email
      FROM evm_projects p
      LEFT JOIN users u ON p.project_manager_id = u.id
      WHERE p.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    res.json({
      success: true,
      project: result.rows[0],
    });
  } catch (error) {
    console.error('Get EVM project error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get EVM project',
    });
  }
});

/**
 * @route   POST /api/evm/projects/:id/periods
 * @desc    Add EVM reporting period
 * @access  Private
 */
router.post('/projects/:id/periods', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      periodStartDate,
      periodEndDate,
      periodName,
      plannedValue,
      earnedValue,
      actualCost,
      cumulativePv,
      cumulativeEv,
      cumulativeAc,
      performanceSummary,
      issuesIdentified,
      correctiveActions,
    } = req.body;

    if (!periodStartDate || !periodEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Period start and end dates are required',
      });
    }

    const query = `
      INSERT INTO evm_reporting_periods (
        project_id, period_start_date, period_end_date, period_name,
        planned_value, earned_value, actual_cost,
        cumulative_pv, cumulative_ev, cumulative_ac,
        performance_summary, issues_identified, corrective_actions,
        reported_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const values = [
      id,
      periodStartDate,
      periodEndDate,
      periodName,
      plannedValue || 0,
      earnedValue || 0,
      actualCost || 0,
      cumulativePv || 0,
      cumulativeEv || 0,
      cumulativeAc || 0,
      performanceSummary,
      issuesIdentified,
      correctiveActions,
      req.user.id,
    ];

    const result = await pool.query(query, values);

    // Update project current metrics
    await pool.query(
      `
      UPDATE evm_projects
      SET
        current_cpi = $1,
        current_spi = $2,
        current_cv = $3,
        current_sv = $4,
        updated_at = NOW()
      WHERE id = $5
    `,
      [
        result.rows[0].cost_performance_index,
        result.rows[0].schedule_performance_index,
        result.rows[0].cost_variance,
        result.rows[0].schedule_variance,
        id,
      ]
    );

    res.json({
      success: true,
      period: result.rows[0],
    });
  } catch (error) {
    console.error('Add EVM period error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add EVM reporting period',
    });
  }
});

/**
 * @route   GET /api/evm/projects/:id/periods
 * @desc    Get all reporting periods for a project
 * @access  Private
 */
router.get('/projects/:id/periods', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM evm_reporting_periods
      WHERE project_id = $1
      ORDER BY period_end_date ASC
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      periods: result.rows,
    });
  } catch (error) {
    console.error('Get EVM periods error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get EVM reporting periods',
    });
  }
});

/**
 * @route   GET /api/evm/projects/:id/dashboard
 * @desc    Get EVM dashboard data for a project
 * @access  Private
 */
router.get('/projects/:id/dashboard', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get project details
    const projectQuery = 'SELECT * FROM evm_projects WHERE id = $1';
    const projectResult = await pool.query(projectQuery, [id]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const project = projectResult.rows[0];

    // Get all reporting periods
    const periodsQuery = `
      SELECT * FROM evm_reporting_periods
      WHERE project_id = $1
      ORDER BY period_end_date ASC
    `;
    const periodsResult = await pool.query(periodsQuery, [id]);

    // Get active alerts
    const alertsQuery = `
      SELECT * FROM evm_performance_alerts
      WHERE project_id = $1
      AND status = 'Active'
      ORDER BY severity DESC, created_at DESC
      LIMIT 10
    `;
    const alertsResult = await pool.query(alertsQuery, [id]);

    // Get latest forecast
    const forecastQuery = `
      SELECT * FROM evm_forecasts
      WHERE project_id = $1
      ORDER BY forecast_date DESC
      LIMIT 1
    `;
    const forecastResult = await pool.query(forecastQuery, [id]);

    // Get WBS summary
    const wbsQuery = `
      SELECT
        COUNT(*) as total_items,
        SUM(planned_value) as total_pv,
        SUM(earned_value) as total_ev,
        SUM(actual_cost) as total_ac,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed_count
      FROM evm_wbs
      WHERE project_id = $1
    `;
    const wbsResult = await pool.query(wbsQuery, [id]);

    // Calculate trend data for charts
    const chartData = {
      labels: periodsResult.rows.map((p) => p.period_name || p.period_end_date),
      pv: periodsResult.rows.map((p) => parseFloat(p.cumulative_pv || 0)),
      ev: periodsResult.rows.map((p) => parseFloat(p.cumulative_ev || 0)),
      ac: periodsResult.rows.map((p) => parseFloat(p.cumulative_ac || 0)),
      cpi: periodsResult.rows.map((p) => parseFloat(p.cost_performance_index || 0)),
      spi: periodsResult.rows.map((p) => parseFloat(p.schedule_performance_index || 0)),
      cv: periodsResult.rows.map((p) => parseFloat(p.cost_variance || 0)),
      sv: periodsResult.rows.map((p) => parseFloat(p.schedule_variance || 0)),
    };

    res.json({
      success: true,
      dashboard: {
        project,
        periods: periodsResult.rows,
        alerts: alertsResult.rows,
        forecast: forecastResult.rows[0] || null,
        wbsSummary: wbsResult.rows[0],
        chartData,
      },
    });
  } catch (error) {
    console.error('Get EVM dashboard error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get EVM dashboard',
    });
  }
});

/**
 * @route   POST /api/evm/projects/:id/alerts
 * @desc    Create performance alert
 * @access  Private
 */
router.post('/projects/:id/alerts', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reportingPeriodId,
      alertType,
      severity,
      metricName,
      metricValue,
      thresholdValue,
      alertTitle,
      alertMessage,
    } = req.body;

    const query = `
      INSERT INTO evm_performance_alerts (
        project_id, reporting_period_id, alert_type, severity,
        metric_name, metric_value, threshold_value,
        alert_title, alert_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      id,
      reportingPeriodId,
      alertType,
      severity,
      metricName,
      metricValue,
      thresholdValue,
      alertTitle,
      alertMessage,
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      alert: result.rows[0],
    });
  } catch (error) {
    console.error('Create EVM alert error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create performance alert',
    });
  }
});

/**
 * @route   PUT /api/evm/alerts/:id
 * @desc    Update alert status
 * @access  Private
 */
router.put('/alerts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    const query = `
      UPDATE evm_performance_alerts
      SET
        status = $1,
        resolution_notes = $2,
        acknowledged_by = $3,
        acknowledged_at = CASE WHEN $1 = 'Acknowledged' THEN NOW() ELSE acknowledged_at END,
        resolved_at = CASE WHEN $1 = 'Resolved' THEN NOW() ELSE resolved_at END
      WHERE id = $4
      RETURNING *;
    `;

    const result = await pool.query(query, [status, resolutionNotes, req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    res.json({
      success: true,
      alert: result.rows[0],
    });
  } catch (error) {
    console.error('Update EVM alert error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update alert',
    });
  }
});

export default router;
