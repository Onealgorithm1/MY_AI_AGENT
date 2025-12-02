import express from 'express';
import pool from '../config/database.js';
import * as fpdsService from '../services/fpds.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/fpds/search/contracts
 * @desc    Search for contract awards
 * @access  Private
 */
router.get('/search/contracts', authenticate, async (req, res) => {
  try {
    const {
      piid,
      vendorUEI,
      vendorName,
      agencyCode,
      naicsCode,
      pscCode,
      awardDateFrom,
      awardDateTo,
      setAsideType,
      limit,
      offset,
    } = req.query;

    const result = await fpdsService.searchContractAwards(
      {
        piid,
        vendorUEI,
        vendorName,
        agencyCode,
        naicsCode,
        pscCode,
        awardDateFrom,
        awardDateTo,
        setAsideType,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0,
      },
      req.user.id
    );

    res.json(result);
  } catch (error) {
    console.error('FPDS search error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search contract awards',
    });
  }
});

/**
 * @route   GET /api/fpds/contract/:piid
 * @desc    Get contract details by PIID
 * @access  Private
 */
router.get('/contract/:piid', authenticate, async (req, res) => {
  try {
    const { piid } = req.params;

    const result = await fpdsService.getContractByPIID(piid, req.user.id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('FPDS get contract error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get contract details',
    });
  }
});

/**
 * @route   GET /api/fpds/vendor/:uei/contracts
 * @desc    Get all contracts for a vendor (for incumbent analysis)
 * @access  Private
 */
router.get('/vendor/:uei/contracts', authenticate, async (req, res) => {
  try {
    const { uei } = req.params;
    const { limit, naicsCode, agencyCode, awardDateFrom } = req.query;

    const result = await fpdsService.getVendorContracts(
      uei,
      {
        limit: parseInt(limit) || 100,
        naicsCode,
        agencyCode,
        awardDateFrom,
      },
      req.user.id
    );

    res.json(result);
  } catch (error) {
    console.error('FPDS vendor contracts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get vendor contracts',
    });
  }
});

/**
 * @route   POST /api/fpds/contract/store
 * @desc    Store contract award data in database
 * @access  Private
 */
router.post('/contract/store', authenticate, async (req, res) => {
  try {
    const contractData = req.body;

    const result = await fpdsService.storeContractAward(contractData);

    res.json({
      success: true,
      contract: result,
    });
  } catch (error) {
    console.error('FPDS store contract error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to store contract award',
    });
  }
});

/**
 * @route   GET /api/fpds/incumbent/:uei/analysis
 * @desc    Get incumbent analysis for a vendor
 * @access  Private
 */
router.get('/incumbent/:uei/analysis', authenticate, async (req, res) => {
  try {
    const { uei } = req.params;

    const analysis = await fpdsService.getIncumbentAnalysis(uei);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('FPDS incumbent analysis error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get incumbent analysis',
    });
  }
});

/**
 * @route   POST /api/fpds/incumbent/:uei/rebuild
 * @desc    Rebuild incumbent analysis for a vendor
 * @access  Private
 */
router.post('/incumbent/:uei/rebuild', authenticate, async (req, res) => {
  try {
    const { uei } = req.params;

    const analysis = await fpdsService.buildIncumbentAnalysis(uei);

    res.json({
      success: true,
      analysis,
      message: 'Incumbent analysis rebuilt successfully',
    });
  } catch (error) {
    console.error('FPDS rebuild incumbent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to rebuild incumbent analysis',
    });
  }
});

/**
 * @route   POST /api/fpds/competitive-intelligence
 * @desc    Link incumbent to opportunity and create competitive intelligence
 * @access  Private
 */
router.post('/competitive-intelligence', authenticate, async (req, res) => {
  try {
    const {
      opportunityId,
      noticeId,
      incumbentUEI,
      contractPIID,
      recompete,
      estimatedBidders,
      marketSaturation,
      winProbability,
      strategicImportance,
      recommendedAction,
      confidenceScore,
    } = req.body;

    if (!opportunityId || !incumbentUEI) {
      return res.status(400).json({
        success: false,
        message: 'opportunityId and incumbentUEI are required',
      });
    }

    const intelligence = await fpdsService.linkIncumbentToOpportunity(
      opportunityId,
      noticeId,
      incumbentUEI,
      {
        contractPIID,
        recompete,
        estimatedBidders,
        marketSaturation,
        winProbability,
        strategicImportance,
        recommendedAction,
        confidenceScore,
      },
      req.user.id
    );

    res.json({
      success: true,
      intelligence,
    });
  } catch (error) {
    console.error('FPDS competitive intelligence error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create competitive intelligence',
    });
  }
});

/**
 * @route   GET /api/fpds/competitive-intelligence/:opportunityId
 * @desc    Get competitive intelligence for an opportunity
 * @access  Private
 */
router.get('/competitive-intelligence/:opportunityId', authenticate, async (req, res) => {
  try {
    const { opportunityId } = req.params;

    const query = `
      SELECT ci.*, ia.*
      FROM competitive_intelligence ci
      LEFT JOIN incumbent_analysis ia ON ci.incumbent_vendor_uei = ia.vendor_uei
      WHERE ci.opportunity_id = $1
    `;

    const result = await pool.query(query, [opportunityId]);

    if (result.rows.length > 0) {
      res.json({
        success: true,
        intelligence: result.rows[0],
      });
    } else {
      res.json({
        success: false,
        message: 'No competitive intelligence found for this opportunity',
      });
    }
  } catch (error) {
    console.error('Get competitive intelligence error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get competitive intelligence',
    });
  }
});

export default router;
