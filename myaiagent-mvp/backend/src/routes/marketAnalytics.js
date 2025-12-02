import express from 'express';
import pool from '../config/database.js';
import * as marketAnalytics from '../services/marketAnalytics.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/market-analytics/dashboard
 * @desc    Get market analytics dashboard data
 * @access  Private
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { fiscalYear } = req.query;

    const dashboardData = await marketAnalytics.getMarketDashboardData({
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
    });

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Market dashboard error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get market dashboard data',
    });
  }
});

/**
 * @route   GET /api/market-analytics/agency-spending
 * @desc    Fetch agency spending trends
 * @access  Private
 */
router.get('/agency-spending', authenticate, async (req, res) => {
  try {
    const { agencyCode, fiscalYear, fiscalQuarter } = req.query;

    const result = await marketAnalytics.fetchAgencySpendingTrends({
      agencyCode,
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      fiscalQuarter: fiscalQuarter ? parseInt(fiscalQuarter) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('Agency spending trends error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch agency spending trends',
    });
  }
});

/**
 * @route   POST /api/market-analytics/agency-spending
 * @desc    Store agency spending trend data
 * @access  Private
 */
router.post('/agency-spending', authenticate, async (req, res) => {
  try {
    const trendData = req.body;

    const result = await marketAnalytics.storeAgencySpendingTrend(trendData);

    res.json({
      success: true,
      trend: result,
    });
  } catch (error) {
    console.error('Store agency spending error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to store agency spending trend',
    });
  }
});

/**
 * @route   GET /api/market-analytics/contract-values
 * @desc    Get contract value analytics
 * @access  Private
 */
router.get('/contract-values', authenticate, async (req, res) => {
  try {
    const { aggregationType, aggregationKey, fiscalYear } = req.query;

    if (!aggregationType || !aggregationKey) {
      return res.status(400).json({
        success: false,
        message: 'aggregationType and aggregationKey are required',
      });
    }

    const result = await marketAnalytics.calculateContractValueAnalytics({
      aggregationType,
      aggregationKey,
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : new Date().getFullYear(),
    });

    res.json({
      success: true,
      analytics: result,
    });
  } catch (error) {
    console.error('Contract value analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate contract value analytics',
    });
  }
});

/**
 * @route   GET /api/market-analytics/contract-values/all
 * @desc    Get all contract value analytics
 * @access  Private
 */
router.get('/contract-values/all', authenticate, async (req, res) => {
  try {
    const { fiscalYear, aggregationType, limit = 50 } = req.query;

    let query = `
      SELECT * FROM contract_value_analytics
      WHERE 1=1
    `;

    const params = [];

    if (fiscalYear) {
      params.push(parseInt(fiscalYear));
      query += ` AND fiscal_year = $${params.length}`;
    }

    if (aggregationType) {
      params.push(aggregationType);
      query += ` AND aggregation_type = $${params.length}`;
    }

    query += ` ORDER BY total_value DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      analytics: result.rows,
    });
  } catch (error) {
    console.error('Get contract analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get contract value analytics',
    });
  }
});

/**
 * @route   GET /api/market-analytics/setaside-intelligence
 * @desc    Get set-aside intelligence
 * @access  Private
 */
router.get('/setaside-intelligence', authenticate, async (req, res) => {
  try {
    const { setasideType, naicsCode, fiscalYear } = req.query;

    if (!setasideType) {
      return res.status(400).json({
        success: false,
        message: 'setasideType is required',
      });
    }

    const result = await marketAnalytics.calculateSetAsideIntelligence({
      setasideType,
      naicsCode,
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : new Date().getFullYear(),
    });

    res.json({
      success: true,
      intelligence: result,
    });
  } catch (error) {
    console.error('Set-aside intelligence error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate set-aside intelligence',
    });
  }
});

/**
 * @route   GET /api/market-analytics/setaside-intelligence/all
 * @desc    Get all set-aside intelligence data
 * @access  Private
 */
router.get('/setaside-intelligence/all', authenticate, async (req, res) => {
  try {
    const { fiscalYear, limit = 50 } = req.query;

    let query = `
      SELECT * FROM setaside_intelligence
      WHERE 1=1
    `;

    const params = [];

    if (fiscalYear) {
      params.push(parseInt(fiscalYear));
      query += ` AND fiscal_year = $${params.length}`;
    }

    query += ` ORDER BY total_award_value DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      intelligence: result.rows,
    });
  } catch (error) {
    console.error('Get set-aside intelligence error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get set-aside intelligence',
    });
  }
});

/**
 * @route   GET /api/market-analytics/setaside-comparison
 * @desc    Compare competition intensity across set-aside categories
 * @access  Private
 */
router.get('/setaside-comparison', authenticate, async (req, res) => {
  try {
    const { fiscalYear, naicsCode } = req.query;

    let query = `
      SELECT
        setaside_type,
        COUNT(*) as opportunity_count,
        AVG(average_bidders) as avg_bidders,
        AVG(total_award_value) as avg_award_value,
        SUM(total_awards) as total_awards,
        AVG(small_business_win_rate) as avg_win_rate,
        STRING_AGG(DISTINCT competition_intensity, ', ') as competition_levels
      FROM setaside_intelligence
      WHERE 1=1
    `;

    const params = [];

    if (fiscalYear) {
      params.push(parseInt(fiscalYear));
      query += ` AND fiscal_year = $${params.length}`;
    }

    if (naicsCode) {
      params.push(naicsCode);
      query += ` AND naics_code = $${params.length}`;
    }

    query += `
      GROUP BY setaside_type
      ORDER BY avg_award_value DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      comparison: result.rows,
    });
  } catch (error) {
    console.error('Set-aside comparison error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get set-aside comparison',
    });
  }
});

/**
 * @route   GET /api/market-analytics/competitive-landscape
 * @desc    Get competitive landscape analysis
 * @access  Private
 */
router.get('/competitive-landscape', authenticate, async (req, res) => {
  try {
    const { marketSegment, naicsCode, fiscalYear, limit = 10 } = req.query;

    let query = `
      SELECT * FROM competitive_landscape
      WHERE 1=1
    `;

    const params = [];

    if (marketSegment) {
      params.push(marketSegment);
      query += ` AND market_segment = $${params.length}`;
    }

    if (naicsCode) {
      params.push(naicsCode);
      query += ` AND naics_code = $${params.length}`;
    }

    if (fiscalYear) {
      params.push(parseInt(fiscalYear));
      query += ` AND fiscal_year = $${params.length}`;
    }

    query += ` ORDER BY total_market_value DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      landscapes: result.rows,
    });
  } catch (error) {
    console.error('Competitive landscape error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get competitive landscape',
    });
  }
});

/**
 * @route   GET /api/market-analytics/insights
 * @desc    Get market insights
 * @access  Private
 */
router.get('/insights', authenticate, async (req, res) => {
  try {
    const { insightType, status, impactLevel, limit = 20 } = req.query;

    let query = `
      SELECT * FROM market_insights
      WHERE 1=1
    `;

    const params = [];

    if (insightType) {
      params.push(insightType);
      query += ` AND insight_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (impactLevel) {
      params.push(impactLevel);
      query += ` AND impact_level = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      insights: result.rows,
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get market insights',
    });
  }
});

/**
 * @route   POST /api/market-analytics/insights
 * @desc    Create market insight
 * @access  Private
 */
router.post('/insights', authenticate, async (req, res) => {
  try {
    const {
      insightType,
      title,
      summary,
      detailedAnalysis,
      relevantToNaics,
      relevantToAgencies,
      relevantToSetasides,
      impactLevel,
      urgency,
      opportunityValueRange,
      confidenceScore,
      recommendedActions,
    } = req.body;

    if (!title || !insightType) {
      return res.status(400).json({
        success: false,
        message: 'Title and insight type are required',
      });
    }

    const query = `
      INSERT INTO market_insights (
        insight_type, title, summary, detailed_analysis,
        relevant_to_naics, relevant_to_agencies, relevant_to_setasides,
        impact_level, urgency, opportunity_value_range,
        confidence_score, recommended_actions, created_by, is_ai_generated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const values = [
      insightType,
      title,
      summary,
      detailedAnalysis,
      JSON.stringify(relevantToNaics || []),
      JSON.stringify(relevantToAgencies || []),
      JSON.stringify(relevantToSetasides || []),
      impactLevel || 'Medium',
      urgency || 'Medium',
      opportunityValueRange,
      confidenceScore || 70,
      JSON.stringify(recommendedActions || []),
      req.user.id,
      false,
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      insight: result.rows[0],
    });
  } catch (error) {
    console.error('Create insight error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create market insight',
    });
  }
});

/**
 * @route   GET /api/market-analytics/trending
 * @desc    Get trending market data
 * @access  Private
 */
router.get('/trending', authenticate, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Get top growing agencies
    const agencyGrowthQuery = `
      SELECT
        agency_name,
        agency_code,
        SUM(total_obligated) FILTER (WHERE fiscal_year = $1) as current_year,
        SUM(total_obligated) FILTER (WHERE fiscal_year = $2) as last_year,
        (SUM(total_obligated) FILTER (WHERE fiscal_year = $1) -
         SUM(total_obligated) FILTER (WHERE fiscal_year = $2)) /
         NULLIF(SUM(total_obligated) FILTER (WHERE fiscal_year = $2), 0) * 100 as growth_percent
      FROM agency_spending_trends
      WHERE fiscal_year IN ($1, $2)
      GROUP BY agency_name, agency_code
      HAVING SUM(total_obligated) FILTER (WHERE fiscal_year = $2) > 0
      ORDER BY growth_percent DESC
      LIMIT 10
    `;

    const agencyGrowth = await pool.query(agencyGrowthQuery, [
      currentYear,
      currentYear - 1,
    ]);

    // Get hot NAICS codes (most active)
    const hotNaicsQuery = `
      SELECT
        naics_code,
        naics_description,
        SUM(total_awards) as total_awards,
        SUM(total_award_value) as total_value,
        AVG(average_bidders) as avg_competition
      FROM setaside_intelligence
      WHERE fiscal_year = $1
      GROUP BY naics_code, naics_description
      ORDER BY total_awards DESC
      LIMIT 10
    `;

    const hotNaics = await pool.query(hotNaicsQuery, [currentYear]);

    // Get emerging opportunities (low competition, high value)
    const emergingQuery = `
      SELECT
        setaside_type,
        naics_code,
        naics_description,
        total_awards,
        total_award_value,
        average_bidders,
        competition_intensity
      FROM setaside_intelligence
      WHERE fiscal_year = $1
      AND average_bidders < 3
      AND total_award_value > 1000000
      ORDER BY total_award_value DESC
      LIMIT 10
    `;

    const emerging = await pool.query(emergingQuery, [currentYear]);

    res.json({
      success: true,
      trending: {
        growingAgencies: agencyGrowth.rows,
        hotNaicsCodes: hotNaics.rows,
        emergingOpportunities: emerging.rows,
      },
    });
  } catch (error) {
    console.error('Get trending data error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get trending market data',
    });
  }
});

export default router;
