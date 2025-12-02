import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as usaspending from '../services/usaspending.js';
import * as calc from '../services/calc.js';
import * as subawards from '../services/subawards.js';
import * as exclusions from '../services/exclusions.js';
import { query } from '../utils/database.js';

const router = express.Router();

// ============================================
// USAspending API Routes - Financial Intelligence
// ============================================

/**
 * GET /api/intelligence/spending/agency/:agencyCode/:naicsCode
 * Get agency spending by NAICS code with caching
 */
router.get('/spending/agency/:agencyCode/:naicsCode', authenticate, async (req, res) => {
  try {
    const { agencyCode, naicsCode } = req.params;
    const { fiscalYear = new Date().getFullYear() } = req.query;

    // Check cache first (7-day cache)
    const cached = await query(
      `SELECT * FROM agency_spending_cache
       WHERE agency_code = $1 AND naics_code = $2 AND fiscal_year = $3
       AND cached_at > NOW() - INTERVAL '7 days'`,
      [agencyCode, naicsCode, fiscalYear]
    );

    if (cached.rows.length > 0) {
      return res.json({
        success: true,
        source: 'cache',
        data: cached.rows[0]
      });
    }

    // Fetch from API
    const spendingData = await usaspending.getAgencySpendingByNAICS(agencyCode, naicsCode, fiscalYear);
    const trends = await usaspending.getSpendingTrends(agencyCode, naicsCode, 3);
    const topContractors = await usaspending.getTopContractors(agencyCode, naicsCode, 10);

    // Cache results
    await query(
      `INSERT INTO agency_spending_cache
       (agency_code, naics_code, fiscal_year, total_spending, award_count, top_contractors, spending_trend)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (agency_code, naics_code, fiscal_year) DO UPDATE SET
         total_spending = EXCLUDED.total_spending,
         award_count = EXCLUDED.award_count,
         top_contractors = EXCLUDED.top_contractors,
         spending_trend = EXCLUDED.spending_trend,
         cached_at = CURRENT_TIMESTAMP`,
      [
        agencyCode,
        naicsCode,
        fiscalYear,
        spendingData.total,
        spendingData.count,
        JSON.stringify(topContractors),
        JSON.stringify(trends)
      ]
    );

    res.json({
      success: true,
      source: 'api',
      data: {
        spending: spendingData,
        trends,
        topContractors
      }
    });
  } catch (error) {
    console.error('Agency spending error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch agency spending data'
    });
  }
});

/**
 * GET /api/intelligence/spending/trends/:agencyCode/:naicsCode
 * Get multi-year spending trends
 */
router.get('/spending/trends/:agencyCode/:naicsCode', authenticate, async (req, res) => {
  try {
    const { agencyCode, naicsCode } = req.params;
    const { years = 3 } = req.query;

    const trends = await usaspending.getSpendingTrends(agencyCode, naicsCode, parseInt(years));

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Spending trends error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch spending trends'
    });
  }
});

/**
 * GET /api/intelligence/spending/budget/:agencyCode
 * Get agency budget information
 */
router.get('/spending/budget/:agencyCode', authenticate, async (req, res) => {
  try {
    const { agencyCode } = req.params;
    const { fiscalYear = new Date().getFullYear() } = req.query;

    const budget = await usaspending.getAgencyBudget(agencyCode, fiscalYear);

    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    console.error('Agency budget error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch agency budget'
    });
  }
});

// ============================================
// CALC API Routes - Labor Rate Benchmarking
// ============================================

/**
 * POST /api/intelligence/rates/search
 * Search labor rates
 */
router.post('/rates/search', authenticate, async (req, res) => {
  try {
    const { laborCategory, education, experience, limit } = req.body;

    const results = await calc.searchRates(laborCategory, education, experience, limit);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Rate search error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search labor rates'
    });
  }
});

/**
 * GET /api/intelligence/rates/statistics/:laborCategory
 * Get rate statistics for a labor category
 */
router.get('/rates/statistics/:laborCategory', authenticate, async (req, res) => {
  try {
    const { laborCategory } = req.params;
    const { education, experience } = req.query;

    const stats = await calc.getRateStatistics(
      decodeURIComponent(laborCategory),
      education,
      experience ? parseInt(experience) : null
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Rate statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get rate statistics'
    });
  }
});

/**
 * POST /api/intelligence/rates/compare
 * Compare user rates against market
 */
router.post('/rates/compare', authenticate, async (req, res) => {
  try {
    const { userRates } = req.body;

    if (!Array.isArray(userRates)) {
      return res.status(400).json({
        success: false,
        error: 'userRates must be an array of {category, rate} objects'
      });
    }

    const comparison = await calc.compareRates(userRates);

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Rate comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compare rates'
    });
  }
});

// ============================================
// Subaward API Routes - Teaming Intelligence
// ============================================

/**
 * GET /api/intelligence/teaming/partners/:naicsCode
 * Find potential teaming partners
 */
router.get('/teaming/partners/:naicsCode', authenticate, async (req, res) => {
  try {
    const { naicsCode } = req.params;
    const { minSubawards = 3, limit = 500 } = req.query;

    const partners = await subawards.findTeamingPartners(
      naicsCode,
      { minSubawards: parseInt(minSubawards), limit: parseInt(limit) },
      req.user.id
    );

    res.json(partners);
  } catch (error) {
    console.error('Teaming partners error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find teaming partners'
    });
  }
});

/**
 * GET /api/intelligence/teaming/prime/:primeName
 * Get subawards for a prime contractor
 */
router.get('/teaming/prime/:primeName', authenticate, async (req, res) => {
  try {
    const { primeName } = req.params;
    const { naicsCode, limit = 100 } = req.query;

    const subawardData = await subawards.getPrimeSubawards(
      decodeURIComponent(primeName),
      { naicsCode, limit: parseInt(limit) },
      req.user.id
    );

    res.json(subawardData);
  } catch (error) {
    console.error('Prime subawards error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch prime subawards'
    });
  }
});

/**
 * GET /api/intelligence/teaming/patterns/:agencyCode/:naicsCode
 * Analyze subcontracting patterns
 */
router.get('/teaming/patterns/:agencyCode/:naicsCode', authenticate, async (req, res) => {
  try {
    const { agencyCode, naicsCode } = req.params;

    const patterns = await subawards.analyzeSubcontractingPatterns(
      agencyCode,
      naicsCode,
      req.user.id
    );

    res.json(patterns);
  } catch (error) {
    console.error('Subcontracting patterns error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze subcontracting patterns'
    });
  }
});

/**
 * GET /api/intelligence/teaming/subcontractor/:name
 * Get subcontractor history
 */
router.get('/teaming/subcontractor/:name', authenticate, async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 100 } = req.query;

    const history = await subawards.getSubcontractorHistory(
      decodeURIComponent(name),
      { limit: parseInt(limit) },
      req.user.id
    );

    res.json(history);
  } catch (error) {
    console.error('Subcontractor history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subcontractor history'
    });
  }
});

// ============================================
// Exclusions API Routes - Compliance Screening
// ============================================

/**
 * POST /api/intelligence/compliance/check
 * Check if an entity is excluded
 */
router.post('/compliance/check', authenticate, async (req, res) => {
  try {
    const { entityName, ueiSAM } = req.body;

    if (!entityName) {
      return res.status(400).json({
        success: false,
        error: 'entityName is required'
      });
    }

    const result = await exclusions.checkExclusion(entityName, ueiSAM, req.user.id);

    res.json(result);
  } catch (error) {
    console.error('Exclusion check error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check exclusion status'
    });
  }
});

/**
 * POST /api/intelligence/compliance/batch-check
 * Batch check multiple entities
 */
router.post('/compliance/batch-check', authenticate, async (req, res) => {
  try {
    const { entities } = req.body;

    if (!Array.isArray(entities)) {
      return res.status(400).json({
        success: false,
        error: 'entities must be an array of {name, ueiSAM} objects'
      });
    }

    const results = await exclusions.batchCheckExclusions(entities, req.user.id);

    res.json(results);
  } catch (error) {
    console.error('Batch exclusion check error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform batch exclusion check'
    });
  }
});

/**
 * GET /api/intelligence/compliance/statistics
 * Get exclusion statistics
 */
router.get('/compliance/statistics', authenticate, async (req, res) => {
  try {
    const { classificationTypes, excludingAgencyCode } = req.query;

    const filters = {};
    if (classificationTypes) filters.classificationTypes = classificationTypes;
    if (excludingAgencyCode) filters.excludingAgencyCode = excludingAgencyCode;

    const stats = await exclusions.getExclusionStatistics(filters, req.user.id);

    res.json(stats);
  } catch (error) {
    console.error('Exclusion statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get exclusion statistics'
    });
  }
});

/**
 * POST /api/intelligence/compliance/search
 * Search exclusions by criteria
 */
router.post('/compliance/search', authenticate, async (req, res) => {
  try {
    const searchCriteria = req.body;

    const results = await exclusions.searchExclusions(searchCriteria, req.user.id);

    res.json(results);
  } catch (error) {
    console.error('Exclusion search error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search exclusions'
    });
  }
});

export default router;
