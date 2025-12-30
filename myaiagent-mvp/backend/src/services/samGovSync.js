import samGovService from './samGov.js';
import samGovCache from './samGovCache.js';
import { getApiKey } from '../utils/apiKeys.js';
import pool from '../utils/database.js';

/**
 * Get a valid execution context (System or Fallback Organization)
 * for running background syncs.
 */
async function getSyncContext() {
    try {
        // 1. Try to get System Key
        try {
            const systemKey = await getApiKey('samgov', 'project', null);
            if (systemKey) {
                console.log('[SAM.gov Sync] Using System API Key');
                return { userId: null, organizationId: null };
            }
        } catch (e) {
            // Ignore error, try fallback
        }

        // 2. Fallback: Find ANY active organization with a SAM.gov key
        const result = await pool.query(
            `SELECT organization_id FROM api_secrets 
       WHERE service_name = 'SAM.gov' AND is_active = true 
       LIMIT 1`
        );

        if (result.rows.length > 0) {
            const orgId = result.rows[0].organization_id;
            console.log(`[SAM.gov Sync] Using Fallback Organization Key (OrgID: ${orgId})`);
            return { userId: null, organizationId: orgId };
        }

        console.warn('[SAM.gov Sync] ⚠️ No valid API Key found (System or Organization)');
        return { userId: null, organizationId: null }; // Will likely fail, but let standard error handling catch it
    } catch (error) {
        console.error('[SAM.gov Sync] Error determining sync context:', error);
        return { userId: null, organizationId: null };
    }
}

/**
 * Sync SAM.gov opportunities for a specific date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Sync results
 */
export async function syncDateRange(startDate, endDate) {
    try {
        const formatDate = (date) => {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;
        };

        const params = {
            postedFrom: formatDate(startDate),
            postedTo: formatDate(endDate),
            fetchAll: true, // Auto-paginate
            limit: 1000
        };

        // Get valid context (System ID or Fallback Org ID)
        const context = await getSyncContext();

        console.log(`[SAM.gov Sync] Syncing range: ${params.postedFrom} to ${params.postedTo}`);

        const result = await samGovCache.searchAndCache(
            params,
            samGovService.searchOpportunities,
            context.userId,
            context.organizationId // Use Org ID for API Key lookup, but cache will store as Global
        );

        return result;
    } catch (error) {
        console.error(`[SAM.gov Sync] Failed to sync range ${startDate.toISOString()} to ${endDate.toISOString()}:`, error.message);
        throw error;
    }
}

/**
 * Sync recent opportunities (e.g., last 7 days)
 * Typically run by cron daily/weekly
 */
export async function syncRecentOpportunities(days = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    console.log('[SAM.gov Sync] Starting recent sync...');
    const result = await syncDateRange(startDate, endDate);

    if (result.success) {
        console.log(`[SAM.gov Sync] Recent sync complete. Found ${result.totalRecords} opportunities (${result.categorized?.new?.length || 0} new).`);
    }

    return result;
}

/**
 * Backfill historical data (e.g., last 2 years)
 * Iterates month by month to avoid timeouts and huge payloads
 */
export async function backfillHistoricalData(monthsBack = 24) {
    console.log(`[SAM.gov Backfill] Starting ${monthsBack}-month backfill...`);

    const today = new Date();
    let currentEndDate = new Date(today);

    // Start from last month (since recent sync covers this month)
    // Or just do strictly month chunks going backwards

    for (let i = 0; i < monthsBack; i++) {
        // Calculate chunk: start of month to end of month
        // We go backwards from "Last Month"

        // Example: If today is Dec 30, i=0 means effectively "Nov 30 to Dec 30" (approx) 
        // or strictly "Nov 1 to Nov 30"?
        // SAM.gov API is inclusive. 
        // Safest is to do 30-day sliding windows backwards.

        const endDate = new Date(currentEndDate);
        const startDate = new Date(currentEndDate);
        startDate.setDate(startDate.getDate() - 30);

        console.log(`[SAM.gov Backfill] Processing chunk ${i + 1}/${monthsBack}...`);

        try {
            const result = await syncDateRange(startDate, endDate);
            console.log(`[SAM.gov Backfill] Chunk ${i + 1} complete. Processed ${result.totalRecords} records.`);

            // Update currentEndDate for next iteration
            currentEndDate = new Date(startDate);
            // Small overlap (1 day) is fine, or just exact. 
            // Subtract 1 day to avoid overlap? 
            // SAM.gov filters are inclusive. "PostedTo" includes that day.
            // So if we did Dec 1-30, next should be Nov 1-Nov 30.
            // formatDate helper handles strict dates.
            // Let's just subtract 1 day from startDate to get new end date.
            currentEndDate.setDate(currentEndDate.getDate() - 1);

            // Delay to respect API limits (though searchAndCache might handle some)
            await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (error) {
            console.error(`[SAM.gov Backfill] Error in chunk ${i + 1}. Continuing to next chunk...`, error.message);
            // Continue despite error to try getting other data
        }
    }

    console.log('[SAM.gov Backfill] Backfill process completed.');
}

export default {
    syncDateRange,
    syncRecentOpportunities,
    backfillHistoricalData
};
