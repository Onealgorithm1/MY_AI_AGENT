import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { 
  runWeeklyImprovementCycle, 
  checkForShippedFeatures,
  getSelfImprovementSummary,
  trackPromiseFulfillment
} from '../services/selfImprovementOrchestrator.js';
import {
  getPendingRequests,
  updateRequestStatus
} from '../services/featureAdvocacy.js';
import {
  analyzeFeatureFeedback,
  getFeatureFeedback
} from '../services/feedbackAnalyzer.js';
import {
  generateImprovementRequest,
  getPendingImprovements,
  updateImprovementStatus,
  getImprovementsByFeature
} from '../services/improvementWriter.js';
import {
  getLatestResearchFindings,
  getResearchSummary
} from '../services/competitiveResearch.js';

const router = express.Router();

router.post('/research/run', authenticateToken, isAdmin, async (req, res) => {
  try {
    const results = await runWeeklyImprovementCycle();
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Failed to run research cycle:', error);
    res.status(500).json({ error: 'Failed to run research cycle' });
  }
});

router.get('/research/findings', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const findings = await getLatestResearchFindings(limit);
    const summary = await getResearchSummary();
    
    res.json({
      findings,
      summary
    });
  } catch (error) {
    console.error('Failed to get research findings:', error);
    res.status(500).json({ error: 'Failed to get research findings' });
  }
});

router.get('/feature-requests', authenticateToken, async (req, res) => {
  try {
    const requests = await getPendingRequests();
    res.json({ requests });
  } catch (error) {
    console.error('Failed to get feature requests:', error);
    res.status(500).json({ error: 'Failed to get feature requests' });
  }
});

router.put('/feature-requests/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const celebration = await updateRequestStatus(parseInt(id), status, notes);
    
    res.json({
      success: true,
      celebration
    });
  } catch (error) {
    console.error('Failed to update request status:', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
});

router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { featureRequestId, feedbackText, satisfactionRating, screenshot } = req.body;
    
    const analysis = await analyzeFeatureFeedback(
      featureRequestId,
      req.user.id,
      { feedbackText, satisfactionRating, screenshot }
    );

    const improvementRequest = await generateImprovementRequest(analysis.feedbackId);

    res.json({
      success: true,
      analysis,
      improvements: improvementRequest
    });
  } catch (error) {
    console.error('Failed to analyze feedback:', error);
    res.status(500).json({ error: 'Failed to analyze feedback' });
  }
});

router.get('/feedback/:featureRequestId', authenticateToken, async (req, res) => {
  try {
    const { featureRequestId } = req.params;
    const feedback = await getFeatureFeedback(parseInt(featureRequestId));
    
    res.json({ feedback });
  } catch (error) {
    console.error('Failed to get feedback:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

router.get('/improvements', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const improvements = await getPendingImprovements(limit);
    
    res.json({ improvements });
  } catch (error) {
    console.error('Failed to get improvements:', error);
    res.status(500).json({ error: 'Failed to get improvements' });
  }
});

router.get('/improvements/feature/:featureRequestId', authenticateToken, async (req, res) => {
  try {
    const { featureRequestId } = req.params;
    const improvements = await getImprovementsByFeature(parseInt(featureRequestId));
    
    res.json({ improvements });
  } catch (error) {
    console.error('Failed to get improvements by feature:', error);
    res.status(500).json({ error: 'Failed to get improvements by feature' });
  }
});

router.put('/improvements/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const celebration = await updateImprovementStatus(parseInt(id), status, notes);
    
    res.json({
      success: true,
      celebration
    });
  } catch (error) {
    console.error('Failed to update improvement status:', error);
    res.status(500).json({ error: 'Failed to update improvement status' });
  }
});

router.get('/celebrations', authenticateToken, async (req, res) => {
  try {
    const celebrations = await checkForShippedFeatures();
    res.json({ celebrations });
  } catch (error) {
    console.error('Failed to get celebrations:', error);
    res.status(500).json({ error: 'Failed to get celebrations' });
  }
});

router.post('/promises/:promiseId/fulfill', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { promiseId } = req.params;
    const { featureRequestId, evidence } = req.body;

    const result = await trackPromiseFulfillment(featureRequestId, parseInt(promiseId), evidence);
    
    res.json({
      success: true,
      fulfillment: result
    });
  } catch (error) {
    console.error('Failed to track promise fulfillment:', error);
    res.status(500).json({ error: 'Failed to track promise fulfillment' });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await getSelfImprovementSummary();
    res.json(summary);
  } catch (error) {
    console.error('Failed to get self-improvement summary:', error);
    res.status(500).json({ error: 'Failed to get self-improvement summary' });
  }
});

export default router;
