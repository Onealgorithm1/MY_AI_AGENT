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
    const profile = await companyProfile.getCompanyProfile(req.user.organization_id);

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
 * PUT /api/company/profile
 * Update company profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, website, capabilities, certifications, naicsCodes, pscCodes, keywords } = req.body;
    const orgId = req.user.organization_id;

    if (!orgId) {
      return res.status(400).json({ error: 'No organization context found' });
    }

    // Upsert into company_profile_cache
    // Note: We use company_profile_cache as the source of truth for the analysis engine
    await query(
      `INSERT INTO company_profile_cache (organization_id, company_name, website_url, capabilities, certifications, naics_codes, psc_codes, keywords, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT (organization_id) DO UPDATE SET
         company_name = EXCLUDED.company_name,
         website_url = EXCLUDED.website_url,
         capabilities = EXCLUDED.capabilities,
         certifications = EXCLUDED.certifications,
         naics_codes = EXCLUDED.naics_codes,
         psc_codes = EXCLUDED.psc_codes,
         keywords = EXCLUDED.keywords,
         last_updated = CURRENT_TIMESTAMP`,
      [
        orgId,
        name,
        website,
        JSON.stringify(capabilities || {}),
        JSON.stringify(certifications || {}),
        naicsCodes || [],
        pscCodes || [],
        keywords || []
      ]
    );

    // Sync basic info to organizations table
    if (name || website) {
      await query(
        'UPDATE organizations SET name = COALESCE($1, name), website_url = COALESCE($2, website_url) WHERE id = $3',
        [name, website, orgId]
      );
    }

    const updatedProfile = await companyProfile.getCompanyProfile(orgId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Update company profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update company profile'
    });
  }
});

/**
 * GET /api/company/readiness
 * Analyze company readiness for federal contracting
 */
router.get('/readiness', authenticate, async (req, res) => {
  try {
    const profile = await companyProfile.getCompanyProfile(req.user.organization_id);
    const readiness = companyProfile.analyzeCompanyReadiness(profile);

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
 * GET /api/company/eligibility-analysis
 * Alias for readiness analysis for CompanyProfilePage compatibility
 */
router.get('/eligibility-analysis', authenticate, async (req, res) => {
  try {
    const profile = await companyProfile.getCompanyProfile(req.user.organization_id);
    const readiness = companyProfile.analyzeCompanyReadiness(profile);

    res.json({
      success: true,
      score: readiness.percentage,
      level: readiness.level,
      recommendation: readiness.recommendation,
      categories: readiness.categories,
      recommendations: [] // Will be populated by AI analysis
    });
  } catch (error) {
    console.error('Eligibility analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze eligibility'
    });
  }
});

/**
 * GET /api/company/matched-opportunities
 * Get matched opportunities (GET version for CompanyProfilePage)
 */
router.get('/matched-opportunities', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // 1. Get company profile first
    const profile = await companyProfile.getCompanyProfile(req.user.organization_id);
    console.log(`[DEBUG] Org ${req.user.organization_id} Profile NAICS:`, profile.naicsCodes);

    // 2. Extract all NAICS codes for pre-filtering
    // We want to fetch opportunities that match ANY of our NAICS codes
    const profileNaics = profile.naicsCodes || [];
    const capabilityNaics = Object.values(profile.capabilities).flatMap(cap => cap.naicsCodes || []);
    const allNaics = [...new Set([...profileNaics, ...capabilityNaics])];
    console.log(`[DEBUG] All Filter NAICS:`, allNaics);

    // 3. Fetch pre-filtered from SAM.gov cache
    // We fetch a larger pool to perform matching on
    const filterOptions = { limit: 1000, offset: 0 };
    if (allNaics.length > 0) {
      filterOptions.naicsCodes = allNaics;
    }

    console.log(`[DEBUG] Calling getCachedOpportunities with:`, JSON.stringify(filterOptions));
    const cachedOpps = await getCachedOpportunities(filterOptions);
    const opportunities = cachedOpps.opportunities || [];
    console.log(`[DEBUG] DB Returned Opportunities: ${opportunities.length}`);

    if (opportunities.length > 0) {
      console.log(`[DEBUG] Sample Opp NAICS: ${opportunities[0].naics_code}`);
    }

    if (opportunities.length === 0) {
      console.log('[DEBUG] No opportunities found in DB for these NAICS.');
      return res.json({
        success: true,
        matches: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limitNum
        },
        totalAnalyzed: 0,
        message: 'No opportunities available to analyze'
      });
    }

    // Match opportunities
    const results = companyProfile.matchOpportunities(opportunities, profile);
    console.log(`[DEBUG] Match Results: Matched=${results.matched.length}, Near=${results.nearMatch.length}, Stretch=${results.stretch.length}`);

    // Pagination Logic
    const allMatches = results.matched;
    const totalItems = allMatches.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const paginatedMatches = allMatches.slice(offset, offset + limitNum);

    res.json({
      success: true,
      matches: paginatedMatches,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalItems: totalItems,
        itemsPerPage: limitNum
      },
      totalAnalyzed: results.totalAnalyzed
    });
  } catch (error) {
    console.error('Get matched opportunities error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get matched opportunities'
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
    const profile = await companyProfile.getCompanyProfile(req.user.organization_id);
    const results = companyProfile.matchOpportunities(opportunities, profile);

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

    const profile = await companyProfile.getCompanyProfile(req.user.organization_id);
    const recommendations = companyProfile.generateRecommendations(opportunities, profile);

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
 * POST /api/company/ai-eligibility-analysis
 * Run AI-powered deep eligibility analysis using Gemini
 */
router.post('/ai-eligibility-analysis', authenticate, async (req, res) => {
  try {
    const { createChatCompletion } = await import('../services/gemini.js');

    console.log('Starting AI eligibility analysis...');

    // Get company profile and readiness
    const profile = await companyProfile.getCompanyProfile(req.user.organization_id);
    const readiness = companyProfile.analyzeCompanyReadiness(profile);

    // Get opportunities for context
    const cachedOpps = await getCachedOpportunities({ limit: 100, offset: 0 });
    const opportunities = cachedOpps.opportunities || [];

    // Match opportunities to understand gaps
    const matchResults = companyProfile.matchOpportunities(opportunities, profile);
    const recommendations = companyProfile.generateRecommendations(opportunities, profile);

    // Prepare AI prompt
    const prompt = `You are a federal contracting expert analyzing OneAlgorithm's eligibility for government contracts.

Company Profile:
- Name: ${profile.name}
- Website: ${profile.website}
- Capabilities: ${Object.keys(profile.capabilities).join(', ')}
- NAICS Codes: ${Object.values(profile.capabilities).flatMap(c => c.naicsCodes).join(', ')}
- Small Business: ${profile.certifications.smallBusiness ? 'Yes' : 'No'}
- Current Certifications: ${Object.entries(profile.certifications).filter(([k, v]) => v).map(([k]) => k).join(', ')}

Current Readiness:
- Overall Score: ${readiness.percentage}%
- Level: ${readiness.level}
- Registration: ${readiness.categories.registration.status}
- Past Performance: ${readiness.categories.pastPerformance.status}
- Technical: ${readiness.categories.technical.status}
- Certifications: ${readiness.categories.certifications.status}
- Financial: ${readiness.categories.financial.status}

Market Analysis:
- Total Opportunities Analyzed: ${matchResults.totalAnalyzed}
- Strong Matches: ${matchResults.matched.length} (${(matchResults.matched.length / matchResults.totalAnalyzed * 100).toFixed(1)}%)
- Near Matches: ${matchResults.nearMatch.length}
- Stretch Opportunities: ${matchResults.stretch.length}

Current Recommendations:
- Certifications: ${recommendations.certifications.length} recommendations
- NAICS Codes: ${recommendations.naicsCodes.length} recommendations
- Capabilities: ${recommendations.capabilities.length} recommendations

Based on this data, provide a comprehensive eligibility analysis with specific, actionable recommendations. Include:

1. **Top 5 Priority Actions** - What should OneAlgorithm do FIRST to increase eligibility?
2. **Certification Roadmap** - Which certifications to pursue and in what order?
3. **Capability Development** - What technical capabilities to add or strengthen?
4. **Market Positioning** - How to position for maximum success?
5. **Quick Wins** - Opportunities they can pursue RIGHT NOW with current capabilities?

Format your response as JSON with this structure:
{
  "summary": "Brief 2-3 sentence overview",
  "priorityActions": [
    {"priority": 1, "title": "...", "description": "...", "impact": "High/Medium/Low", "effort": "Low/Medium/High", "timeframe": "..."}
  ],
  "certifications": [
    {"name": "...", "priority": "High/Medium/Low", "benefit": "...", "requirements": "...", "timeline": "..."}
  ],
  "capabilities": [
    {"capability": "...", "reason": "...", "opportunities": "...", "action": "..."}
  ],
  "marketPositioning": {
    "primaryFocus": "...",
    "secondaryFocus": "...",
    "avoid": "...",
    "rationale": "..."
  },
  "quickWins": [
    {"title": "...", "description": "...", "expectedValue": "...", "competition": "Low/Medium/High"}
  ]
}`;

    // Call Gemini for AI analysis
    console.log('Calling Gemini API for analysis...');
    const aiResponse = await createChatCompletion(
      [{ role: 'user', content: prompt }],
      'gemini-2.5-flash',
      false
    );

    console.log('Gemini response received, processing...');

    // Extract the text content from the OpenAI-compatible response format
    if (!aiResponse || !aiResponse.choices || !aiResponse.choices[0]) {
      console.error('Invalid response format:', aiResponse);
      throw new Error('Invalid response format from Gemini API');
    }

    const aiText = aiResponse.choices[0]?.message?.content || '';

    if (!aiText) {
      console.error('Empty content in Gemini response');
      throw new Error('Gemini API returned empty response');
    }

    console.log('Attempting to parse AI response as JSON...');

    let analysis;
    try {
      // Try to parse as JSON
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
        console.log('Successfully parsed AI response');
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON, using fallback structure:', parseError.message);
      // If parsing fails, structure the response manually
      analysis = {
        summary: aiText.substring(0, 500),
        priorityActions: recommendations.strategic.map((rec, i) => ({
          priority: i + 1,
          title: rec.title,
          description: rec.action,
          impact: 'High',
          effort: 'Medium',
          timeframe: '1-3 months'
        })),
        certifications: recommendations.certifications.slice(0, 3),
        capabilities: recommendations.capabilities.slice(0, 5),
        marketPositioning: {
          primaryFocus: 'IT Services (NAICS 541511, 541512)',
          secondaryFocus: 'Small Business Set-Asides',
          avoid: 'Large construction or manufacturing contracts',
          rationale: 'Focus on core strengths with proven capabilities'
        },
        quickWins: matchResults.matched.slice(0, 5).map(opp => ({
          title: opp.title,
          description: opp.description?.substring(0, 200),
          expectedValue: 'Unknown',
          competition: 'Medium'
        }))
      };
    }

    console.log('Analysis complete, sending response');

    res.json({
      success: true,
      analysis,
      readiness,
      recommendations: analysis.priorityActions || []
    });
  } catch (error) {
    console.error('AI eligibility analysis error:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });

    // Provide specific error messages for common issues
    let errorMessage = error.message || 'Failed to run AI analysis';
    if (errorMessage.includes('API key')) {
      errorMessage = 'Gemini API key is not configured. Please add GOOGLE_API_KEY to your environment variables.';
    } else if (errorMessage.includes('safety')) {
      errorMessage = 'Response was blocked by Gemini safety filters. Please try again with a different prompt.';
    } else if (errorMessage.includes('Empty content') || errorMessage.includes('empty response')) {
      errorMessage = 'Gemini API returned an empty response. Please try again.';
    } else if (errorMessage.includes('Invalid response')) {
      errorMessage = 'Received an invalid response from Gemini API. Please try again.';
    }

    res.status(500).json({
      success: false,
      error: errorMessage
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
    const profile = await companyProfile.getCompanyProfile(req.user.organization_id);

    // Get readiness analysis
    const readiness = companyProfile.analyzeCompanyReadiness(profile);

    // Get opportunities
    const cachedOpps = await getCachedOpportunities({ limit: 1000, offset: 0 });
    const opportunities = cachedOpps.opportunities || [];

    // Match opportunities
    const matchResults = companyProfile.matchOpportunities(opportunities, profile);

    // Generate recommendations
    const recommendations = companyProfile.generateRecommendations(opportunities, profile);

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
