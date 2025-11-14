import express from 'express';
import { fetchUrl, fetchMultipleUrls, isValidUrl } from '../services/urlFetcher.js';
import {
  summarizeUrl,
  extractFromUrl,
  compareUrls,
  analyzeContentType,
} from '../services/contentExtractor.js';
import { verifyToken } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

/**
 * POST /api/url-content/fetch
 * Fetch and extract content from a URL
 */
router.post('/fetch', verifyToken, async (req, res) => {
  try {
    const { url, includeImages = true, includeLinks = false } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    // Fetch the URL
    const result = await fetchUrl(url, {
      includeImages,
      includeLinks,
    });

    // Optionally save to database for caching
    if (result.success && req.user?.userId) {
      try {
        await pool.query(
          `INSERT INTO url_cache (user_id, url, content, metadata, fetched_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (url) DO UPDATE
           SET content = $3, metadata = $4, fetched_at = NOW(), fetch_count = url_cache.fetch_count + 1`,
          [
            req.user.userId,
            result.url,
            JSON.stringify(result.content),
            JSON.stringify(result.metadata),
          ]
        );
      } catch (dbError) {
        console.error('Database cache error:', dbError);
        // Continue even if caching fails
      }
    }

    res.json(result);

  } catch (error) {
    console.error('URL fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/url-content/summarize
 * Fetch and summarize a URL using Gemini
 */
router.post('/summarize', verifyToken, async (req, res) => {
  try {
    const {
      url,
      summaryLength = 'medium',
      includeKeyPoints = true,
      includeEntities = true,
      includeTopics = true,
      customPrompt = null,
    } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    // Validate summary length
    if (!['short', 'medium', 'long'].includes(summaryLength)) {
      return res.status(400).json({
        success: false,
        error: 'summaryLength must be one of: short, medium, long',
      });
    }

    // Summarize the URL
    const result = await summarizeUrl(url, {
      summaryLength,
      includeKeyPoints,
      includeEntities,
      includeTopics,
      customPrompt,
    });

    // Save to database if successful
    if (result.success && req.user?.userId) {
      try {
        await pool.query(
          `INSERT INTO url_summaries (user_id, url, summary, analysis, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            req.user.userId,
            result.url,
            result.analysis?.summary || '',
            JSON.stringify(result.analysis),
          ]
        );
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Continue even if saving fails
      }
    }

    res.json(result);

  } catch (error) {
    console.error('URL summarize error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/url-content/extract
 * Extract specific information from a URL based on a query
 */
router.post('/extract', verifyToken, async (req, res) => {
  try {
    const { url, query, responseFormat = 'text' } = req.body;

    // Validate inputs
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    if (!['text', 'json', 'structured'].includes(responseFormat)) {
      return res.status(400).json({
        success: false,
        error: 'responseFormat must be one of: text, json, structured',
      });
    }

    // Extract from URL
    const result = await extractFromUrl(url, query, {
      responseFormat,
    });

    res.json(result);

  } catch (error) {
    console.error('URL extract error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/url-content/compare
 * Compare content from multiple URLs
 */
router.post('/compare', verifyToken, async (req, res) => {
  try {
    const { urls, comparisonCriteria = 'general comparison' } = req.body;

    // Validate inputs
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({
        success: false,
        error: 'urls must be an array',
      });
    }

    if (urls.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 URLs are required',
      });
    }

    if (urls.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 5 URLs can be compared',
      });
    }

    // Validate each URL
    for (const url of urls) {
      if (!isValidUrl(url)) {
        return res.status(400).json({
          success: false,
          error: `Invalid URL format: ${url}`,
        });
      }
    }

    // Compare URLs
    const result = await compareUrls(urls, comparisonCriteria);

    res.json(result);

  } catch (error) {
    console.error('URL compare error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/url-content/analyze
 * Analyze URL for content type and extract structured data
 */
router.post('/analyze', verifyToken, async (req, res) => {
  try {
    const { url } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    // Analyze content type
    const result = await analyzeContentType(url);

    res.json(result);

  } catch (error) {
    console.error('URL analyze error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/url-content/batch
 * Fetch multiple URLs at once
 */
router.post('/batch', verifyToken, async (req, res) => {
  try {
    const { urls, includeImages = false, includeLinks = false, concurrent = 3 } = req.body;

    // Validate inputs
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({
        success: false,
        error: 'urls must be an array',
      });
    }

    if (urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least 1 URL is required',
      });
    }

    if (urls.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 URLs can be fetched at once',
      });
    }

    // Validate each URL
    for (const url of urls) {
      if (!isValidUrl(url)) {
        return res.status(400).json({
          success: false,
          error: `Invalid URL format: ${url}`,
        });
      }
    }

    // Fetch multiple URLs
    const results = await fetchMultipleUrls(urls, {
      concurrent: Math.min(concurrent, 5), // Max 5 concurrent
      includeImages,
      includeLinks,
    });

    res.json({
      success: true,
      results,
      totalUrls: urls.length,
      successfulFetches: results.filter(r => r.success).length,
      failedFetches: results.filter(r => !r.success).length,
    });

  } catch (error) {
    console.error('Batch fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/url-content/history
 * Get user's URL fetch history
 */
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT url, metadata, fetched_at, fetch_count
       FROM url_cache
       WHERE user_id = $1
       ORDER BY fetched_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, Math.min(limit, 100), offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM url_cache WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      history: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (error) {
    console.error('History fetch error:', error);
    // If table doesn't exist yet, return empty history
    res.json({
      success: true,
      history: [],
      total: 0,
    });
  }
});

/**
 * GET /api/url-content/summaries
 * Get user's URL summaries history
 */
router.get('/summaries', verifyToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, url, summary, analysis, created_at
       FROM url_summaries
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, Math.min(limit, 100), offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM url_summaries WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      summaries: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (error) {
    console.error('Summaries fetch error:', error);
    // If table doesn't exist yet, return empty summaries
    res.json({
      success: true,
      summaries: [],
      total: 0,
    });
  }
});

export default router;
