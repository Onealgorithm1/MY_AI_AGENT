import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getCategorizedEmails,
  getEmailStats,
  analyzeEmail,
  queueEmailForAnalysis
} from '../services/emailCategorization.js';
import { getEmailDetails, listEmails } from '../services/gmail.js';

const router = express.Router();

router.get('/categorized', authenticate, async (req, res) => {
  try {
    const { urgency, sentiment, tags, limit, offset } = req.query;

    const filters = {
      urgency,
      sentiment,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };

    const emails = await getCategorizedEmails(req.user.id, filters);

    res.json({
      success: true,
      count: emails.length,
      emails
    });
  } catch (error) {
    console.error('Get categorized emails error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await getEmailStats(req.user.id);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get email stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { messageId, immediate = false } = req.body;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'messageId is required'
      });
    }

    const emailDetails = await getEmailDetails(req.user.id, messageId);

    if (!emailDetails) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    if (immediate) {
      const analysis = await analyzeEmail(req.user.id, emailDetails);

      res.json({
        success: true,
        message: 'Email analyzed successfully',
        analysis
      });
    } else {
      await queueEmailForAnalysis(req.user.id, emailDetails);

      res.json({
        success: true,
        message: 'Email queued for analysis'
      });
    }
  } catch (error) {
    console.error('Analyze email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/analyze-batch', authenticate, async (req, res) => {
  try {
    const { maxResults = 20, query = '' } = req.body;

    const emails = await listEmails(req.user.id, {
      maxResults,
      query
    });

    if (!emails || emails.length === 0) {
      return res.json({
        success: true,
        message: 'No emails found to analyze',
        queued: 0
      });
    }

    let queued = 0;
    for (const email of emails) {
      try {
        await queueEmailForAnalysis(req.user.id, email, 5);
        queued++;
      } catch (error) {
        console.error(`Failed to queue email ${email.id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `${queued} emails queued for analysis`,
      queued
    });
  } catch (error) {
    console.error('Batch analyze error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/tags', authenticate, async (req, res) => {
  try {
    const { query } = await import('../utils/database.js');
    
    const result = await query(
      `SELECT tag_name, category, usage_count, last_used_at
       FROM email_tag_dictionary
       ORDER BY usage_count DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      tags: result.rows
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
