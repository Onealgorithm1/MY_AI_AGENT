import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as samGovService from '../services/samGov.js';
import * as samGovCache from '../services/samGovCache.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/sam-gov/search/entities
 * Search for entities in SAM.gov
 */
router.post('/search/entities', async (req, res) => {
  try {
    const { ueiSAM, legalBusinessName, dbaName, cageCode, limit, offset } = req.body;

    const result = await samGovService.searchEntities(
      { ueiSAM, legalBusinessName, dbaName, cageCode, limit, offset },
      req.user.id
    );

    res.json(result);
  } catch (error) {
    console.error('Entity search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sam-gov/entity/:uei
 * Get entity details by UEI
 */
router.get('/entity/:uei', async (req, res) => {
  try {
    const { uei } = req.params;

    const result = await samGovService.getEntityByUEI(uei, req.user.id);

    res.json(result);
  } catch (error) {
    console.error('Get entity error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sam-gov/search/opportunities
 * Search for federal contract opportunities with automatic caching
 */
router.post('/search/opportunities', async (req, res) => {
  try {
    const { keyword, postedFrom, postedTo, limit, offset, fetchAll, cache = true } = req.body;

    // If caching is disabled, use direct search
    if (cache === false) {
      const result = await samGovService.searchOpportunities(
        { keyword, postedFrom, postedTo, limit, offset, fetchAll },
        req.user.id
      );
      res.json(result);
      return;
    }

    // Use cached search to automatically save and categorize results
    const result = await samGovCache.searchAndCache(
      { keyword, postedFrom, postedTo, limit, offset, fetchAll },
      samGovService.searchOpportunities,
      req.user.id
    );

    res.json(result);
  } catch (error) {
    console.error('Opportunities search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sam-gov/exclusions
 * Get exclusions (debarred entities)
 */
router.post('/exclusions', async (req, res) => {
  try {
    const { name, ueiSAM, cageCode, limit } = req.body;

    const result = await samGovService.getExclusions(
      { name, ueiSAM, cageCode, limit },
      req.user.id
    );

    res.json(result);
  } catch (error) {
    console.error('Exclusions search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sam-gov/cache/:noticeId
 * Get cached opportunity by notice ID
 */
router.get('/cache/:noticeId', async (req, res) => {
  try {
    const { noticeId } = req.params;
    const result = await samGovCache.getCachedOpportunity(noticeId);

    if (!result) {
      return res.status(404).json({ error: 'Opportunity not found in cache' });
    }

    res.json(result);
  } catch (error) {
    console.error('Get cached opportunity error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sam-gov/search-history
 * Get recent SAM.gov searches
 */
router.get('/search-history', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const result = await samGovCache.getRecentSearches(req.user.id, parseInt(limit));

    res.json({ success: true, searches: result });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
