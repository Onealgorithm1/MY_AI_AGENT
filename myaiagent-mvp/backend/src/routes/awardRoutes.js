import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../utils/database.js';
import { awardService } from '../services/awardService.js';

const router = express.Router();

// Middleware to ensure user belongs to an organization and fetch org details
async function attachOrganization(req, res, next) {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check header first, fallback to user's primary/active org
    const orgId = req.headers['x-organization-id'];

    if (orgId) {
        // Verify user serves in this org
        const check = await query(
            `SELECT o.*, ou.role 
             FROM organizations o
             JOIN organization_users ou ON o.id = ou.organization_id
             WHERE o.id = $1 AND ou.user_id = $2`,
            [orgId, req.user.id]
        );
        if (check.rows.length > 0) {
            req.organization = check.rows[0];
            return next();
        }
    }

    // If no header or invalid, find user's active/first org
    const defaults = await query(
        `SELECT o.*, ou.role 
         FROM organizations o
         JOIN organization_users ou ON o.id = ou.organization_id
         WHERE ou.user_id = $1
         ORDER BY ou.last_activity_at DESC, ou.joined_at DESC
         LIMIT 1`,
        [req.user.id]
    );

    if (defaults.rows.length > 0) {
        req.organization = defaults.rows[0];
        next();
    } else {
        // User has no organization, can't access vendor specific data but might search
        // We'll allow them to proceed but req.organization will be undefined
        next();
    }
}

// Search awards (Public/Shared)
router.get('/search', authenticate, async (req, res) => {
    try {
        const result = await awardService.searchAwards(req.query);
        res.json(result);
    } catch (error) {
        console.error('Award search error:', error);
        res.status(500).json({ error: 'Failed to search awards' });
    }
});

// Export awards to CSV
router.get('/export', authenticate, async (req, res) => {
    try {
        const csvData = await awardService.exportAwardsCSV(req.query);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=awards_export.csv');
        res.send(csvData);
    } catch (error) {
        console.error('Award export error:', error);
        res.status(500).json({ error: 'Failed to export awards' });
    }
});

// Get logged-in vendor's performance summary
router.get('/vendor/performance', authenticate, attachOrganization, async (req, res) => {
    try {
        if (!req.organization || !req.organization.uei) {
            return res.status(400).json({
                error: 'Organization configuration missing UEI',
                details: 'Please update your organization profile with a valid UEI to view performance metrics.'
            });
        }

        const result = await awardService.getVendorPerformance(req.organization.uei);
        res.json(result);
    } catch (error) {
        console.error('Vendor performance error:', error);
        res.status(500).json({ error: 'Failed to get vendor performance' });
    }
});

// Get logged-in vendor's award history
router.get('/vendor/history', authenticate, attachOrganization, async (req, res) => {
    try {
        if (!req.organization || !req.organization.uei) {
            return res.status(400).json({
                error: 'Organization configuration missing UEI',
                details: 'Please update your organization profile with a valid UEI to view award history.'
            });
        }

        const result = await awardService.getVendorAwards(req.organization.uei, req.query);
        res.json(result);
    } catch (error) {
        console.error('Vendor history error:', error);
        res.status(500).json({ error: 'Failed to get vendor history' });
    }
});

// Get single award details
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Basic validation to ensure it's not one of our reserved words if we had any, 
        // but numeric ID or UUID is expected. 
        if (isNaN(id) && !id.match(/^[0-9a-fA-F-]{36}$/)) {
            // Fallback for PIID-based lookup if we wanted to support it, 
            // but for now let's assume specific ID access.
            // or specific reserved routes like 'search' don't get matched here due to order.
            // 'search', 'export' are defined above, so this catches everything else.
        }

        const award = await awardService.getAward(id);

        if (!award) {
            return res.status(404).json({ error: 'Award not found' });
        }

        res.json({ award });
    } catch (error) {
        console.error('Get award error:', error);
        res.status(500).json({ error: 'Failed to fetch award details' });
    }
});

export default router;
