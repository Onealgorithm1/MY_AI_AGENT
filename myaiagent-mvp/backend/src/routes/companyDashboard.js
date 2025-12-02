import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as companyProfile from '../services/companyProfile.js';
import { getCachedOpportunities } from '../services/samGovCache.js';
import { query } from '../utils/database.js';

const router = express.Router();

/**
 * GET /api/company/profile
 * Get OneAlgorithm company profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const profile = companyProfile.getCompanyProfile();

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Company profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get company profile'
    });
  }
});

/**
 * GET /api/company/readiness
 * Analyze company readiness for federal contracting
 */
router.get('/readiness', authenticate, async (req, res) => {
  try {
    const readiness = companyProfile.analyzeCompanyReadiness();

    res.json({
      success: true,
      readiness
    });
  } catch (error) {
    console.error('Readiness analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze readiness'
    });
  }
});

/**
 * POST /api/company/match-opportunities
 * Match company capabilities with opportunities
 */
router.post('/match-opportunities', authenticate, async (req, res) => {
  try {
    // Get opportunities from cache or body
    let opportunities = req.body.opportunities;

    if (!opportunities || opportunities.length === 0) {
      // Fetch from SAM.gov cache
      const cachedOpps = await getCachedOpportunities({ limit: 1000, offset: 0 });
      opportunities = cachedOpps.opportunities || [];
    }

    if (opportunities.length === 0) {
      return res.json({
        success: true,
        matched: [],
        nearMatch: [],
        stretch: [],
        totalAnalyzed: 0,
        message: 'No opportunities available to analyze'
      });
    }

    // Match opportunities
    const results = companyProfile.matchOpportunities(opportunities);

    // Cache results
    await query(
      `INSERT INTO company_opportunity_matches (user_id, total_analyzed, matched_count, near_match_count, stretch_count, analysis_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        results.totalAnalyzed,
        results.matched.length,
        results.nearMatch.length,
        results.stretch.length,
        JSON.stringify(results)
      ]
    );

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('Match opportunities error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to match opportunities'
    });
  }
});

/**
 * POST /api/company/recommendations
 * Generate recommendations for improving match rate
 */
router.post('/recommendations', authenticate, async (req, res) => {
  try {
    let opportunities = req.body.opportunities;

    if (!opportunities || opportunities.length === 0) {
      const cachedOpps = await getCachedOpportunities({ limit: 1000, offset: 0 });
      opportunities = cachedOpps.opportunities || [];
    }

    if (opportunities.length === 0) {
      return res.json({
        success: true,
        recommendations: {
          certifications: [],
          naicsCodes: [],
          capabilities: [],
          pastPerformance: [],
          strategic: []
        },
        message: 'No opportunities available to analyze'
      });
    }

    const recommendations = companyProfile.generateRecommendations(opportunities);

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate recommendations'
    });
  }
});

/**
 * GET /api/company/match-history
 * Get historical match analysis
 */
router.get('/match-history', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT id, total_analyzed, matched_count, near_match_count, stretch_count, created_at
       FROM company_opportunity_matches
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );

    res.json({
      success: true,
      history: result.rows
    });
  } catch (error) {
    console.error('Match history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get match history'
    });
  }
});

/**
 * GET /api/company/dashboard-summary
 * Get complete dashboard summary in one call
 */
router.get('/dashboard-summary', authenticate, async (req, res) => {
  try {
    // Get company profile
    const profile = companyProfile.getCompanyProfile();

    // Get readiness analysis
    const readiness = companyProfile.analyzeCompanyReadiness();

    // Get opportunities
    const cachedOpps = await getCachedOpportunities({ limit: 1000, offset: 0 });
    const opportunities = cachedOpps.opportunities || [];

    // Match opportunities
    const matchResults = companyProfile.matchOpportunities(opportunities);

    // Generate recommendations
    const recommendations = companyProfile.generateRecommendations(opportunities);

    // Get latest match history
    const historyResult = await query(
      `SELECT id, total_analyzed, matched_count, near_match_count, stretch_count, created_at
       FROM company_opportunity_matches
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [req.user.id]
    );

    res.json({
      success: true,
      profile,
      readiness,
      matchResults: {
        matched: matchResults.matched.slice(0, 20), // Top 20
        nearMatch: matchResults.nearMatch.slice(0, 10), // Top 10
        stretch: matchResults.stretch.slice(0, 10), // Top 10
        totalAnalyzed: matchResults.totalAnalyzed,
        summary: {
          matchedCount: matchResults.matched.length,
          nearMatchCount: matchResults.nearMatch.length,
          stretchCount: matchResults.stretch.length,
          matchRate: (matchResults.matched.length / matchResults.totalAnalyzed * 100).toFixed(1)
        }
      },
      recommendations,
      history: historyResult.rows
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get dashboard summary'
    });
  }
});

export default router;
