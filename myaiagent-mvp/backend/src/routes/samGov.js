import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as samGovService from '../services/samGov.js';
import * as samGovCache from '../services/samGovCache.js';
import * as documentFetcher from '../services/samGovDocumentFetcher.js';
import * as documentAnalyzer from '../services/samGovDocumentAnalyzer.js';
import { query } from '../utils/database.js';

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

/**
 * GET /api/sam-gov/cached-opportunities
 * Get all cached opportunities with optional filters
 * Note: Shows ALL cached opportunities regardless of who created them
 */
router.get('/cached-opportunities', async (req, res) => {
  try {
    const { limit = 1000, offset = 0, keyword, type, status } = req.query;
    const result = await samGovCache.getCachedOpportunities({
      limit: parseInt(limit),
      offset: parseInt(offset),
      keyword,
      type,
      status,
      // Don't filter by userId - show all opportunities to all authenticated users
    });

    res.json(result);
  } catch (error) {
    console.error('Get cached opportunities error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sam-gov/batch-fetch-all
 * Fetch all opportunities from SAM.gov in batches and cache them
 * Automatically handles pagination with 1000-record limit per request
 */
router.post('/batch-fetch-all', async (req, res) => {
  try {
    const { keyword = '', postedFrom = '', postedTo = '' } = req.body;

    console.log('🔄 Starting batch fetch of all SAM.gov opportunities...');

    let allOpportunities = [];
    let currentOffset = 0;
    const pageSize = 1000;
    let totalRecords = 0;
    let continueLoop = true;
    const maxIterations = 5; // Limit to 5000 records (5 * 1000) to avoid timeout
    let iterations = 0;

    while (continueLoop && iterations < maxIterations) {
      iterations++;
      console.log(`📝 Batch ${iterations}: Fetching records ${currentOffset} to ${currentOffset + pageSize}...`);

      try {
        const batchResult = await samGovService.searchOpportunities(
          {
            keyword,
            postedFrom,
            postedTo,
            limit: pageSize,
            offset: currentOffset,
          },
          req.user?.id || null
        );

        if (!batchResult.opportunities || batchResult.opportunities.length === 0) {
          console.log('✅ No more opportunities to fetch');
          continueLoop = false;
          break;
        }

        allOpportunities = allOpportunities.concat(batchResult.opportunities);
        totalRecords = batchResult.totalRecords || 0;

        console.log(`✅ Batch ${iterations}: Fetched ${batchResult.opportunities.length} opportunities`);

        // Check if we've fetched all available records
        if (currentOffset + pageSize >= totalRecords) {
          console.log('✅ All opportunities fetched');
          continueLoop = false;
          break;
        }

        currentOffset += pageSize;
      } catch (batchError) {
        console.error(`❌ Error in batch ${iterations}:`, batchError.message);
        // Continue with what we have
        continueLoop = false;
      }
    }

    // Cache all fetched opportunities
    console.log(`💾 Caching ${allOpportunities.length} opportunities...`);
    const cacheResult = await samGovCache.cacheOpportunities(allOpportunities, req.user?.id || null);

    res.json({
      success: true,
      message: `Batch fetch completed: ${allOpportunities.length} opportunities fetched and cached`,
      stats: {
        totalFetched: allOpportunities.length,
        totalAvailable: totalRecords,
        batches: iterations,
        new: cacheResult.new,
        existing: cacheResult.existing,
        summary: cacheResult.summary,
      }
    });

  } catch (error) {
    console.error('Batch fetch error:', error);
    res.status(500).json({
      error: error.message,
      details: 'Failed to batch fetch opportunities'
    });
  }
});

/**
 * GET /api/sam-gov/departments
 * Get list of unique departments from cached opportunities
 */
router.get('/departments', async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT contracting_office as department
       FROM samgov_opportunities_cache
       WHERE contracting_office IS NOT NULL AND contracting_office != ''
       ORDER BY contracting_office ASC`
    );

    const departments = result.rows.map(row => row.department).filter(Boolean);

    res.json({
      success: true,
      departments,
      total: departments.length
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sam-gov/documents/fetch
 * Fetch and store documents for an opportunity
 * Body: { opportunityCacheId, noticeId, documentUrls: [] }
 */
router.post('/documents/fetch', async (req, res) => {
  try {
    const { opportunityCacheId, noticeId, documentUrls } = req.body;

    if (!opportunityCacheId || !noticeId || !Array.isArray(documentUrls)) {
      return res.status(400).json({
        error: 'Missing required fields: opportunityCacheId, noticeId, documentUrls'
      });
    }

    const results = await documentFetcher.fetchOpportunityDocuments(
      opportunityCacheId,
      noticeId,
      documentUrls
    );

    res.json({
      success: true,
      message: `Fetched ${results.length} documents`,
      documents: results
    });
  } catch (error) {
    console.error('Document fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sam-gov/documents/opportunity/:opportunityCacheId
 * Get all documents for an opportunity
 */
router.get('/documents/opportunity/:opportunityCacheId', async (req, res) => {
  try {
    const { opportunityCacheId } = req.params;
    const documents = await documentFetcher.getOpportunityDocuments(parseInt(opportunityCacheId));

    res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sam-gov/documents/:documentId
 * Get a specific document
 */
router.get('/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await documentFetcher.getDocumentById(parseInt(documentId));

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sam-gov/documents/analyze/:documentId
 * Analyze a document with AI
 */
router.post('/documents/analyze/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { priority = 5 } = req.body;

    // Queue for analysis
    await documentAnalyzer.queueDocumentForAnalysis(parseInt(documentId), priority);

    res.json({
      success: true,
      message: 'Document queued for analysis',
      documentId: parseInt(documentId)
    });
  } catch (error) {
    console.error('Queue analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sam-gov/documents/analysis/:documentId
 * Get analysis results for a document
 */
router.get('/documents/analysis/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const analysis = await documentAnalyzer.getDocumentAnalysis(parseInt(documentId));

    if (!analysis) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sam-gov/opportunity-analysis/:opportunityCacheId
 * Get all analyzed documents for an opportunity
 */
router.get('/opportunity-analysis/:opportunityCacheId', async (req, res) => {
  try {
    const { opportunityCacheId } = req.params;
    const analyses = await documentAnalyzer.getOpportunityAnalysis(parseInt(opportunityCacheId));

    res.json({
      success: true,
      count: analyses.length,
      analyses
    });
  } catch (error) {
    console.error('Get opportunity analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sam-gov/process-analysis-queue
 * Process pending analysis jobs (admin only)
 */
router.post('/process-analysis-queue', async (req, res) => {
  try {
    const { batchSize = 5 } = req.body;

    const results = await documentAnalyzer.processAnalysisQueue(batchSize);

    res.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Process queue error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
