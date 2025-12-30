import cron from 'node-cron';
import samGovSync from './samGovSync.js';
import samGovCache from './samGovCache.js';

// Track backfill status to prevent multiple overlapping runs
let isBackfilling = false;

/**
 * Initialize all cron jobs
 */
export async function initCronJobs() {
    console.log('⏰ Initializing Cron Jobs...');

    // 1. Weekly Opportunity Sync (Every day at midnight: 0 0 * * *)
    // Runs daily to ensure we don't miss anything, even though we fetch "last 7 days"
    // This provides redundancy.
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ [Cron] Running daily SAM.gov sync...');
        try {
            await samGovSync.syncRecentOpportunities(7);
            console.log('✅ [Cron] Daily sync completed.');
        } catch (error) {
            console.error('❌ [Cron] Daily sync failed:', error);
        }
    });

    // 2. Startup Checks
    // Run a quick sync immediately on startup
    setTimeout(async () => {
        try {
            console.log('⏰ [Startup] Running immediate recent sync...');
            await samGovSync.syncRecentOpportunities(7);

            // Check if we need to backfill (if cache is empty/low)
            await checkAndTriggerBackfill();
        } catch (error) {
            console.error('❌ [Startup] Startup sync failed:', error);
        }
    }, 5000); // Wait 5s for server to settle
}

/**
 * Check if database needs backfilling and start if necessary
 */
async function checkAndTriggerBackfill() {
    if (isBackfilling) return;

    try {
        // Check total records
        const result = await samGovCache.getAllCachedOpportunities(1, 0);
        const totalRecords = result.total || 0;

        console.log(`⏰ [Backfill Check] Current cached opportunities: ${totalRecords}`);

        // If we have very few records (e.g., < 100), assume new instance and start backfill
        if (totalRecords < 100) {
            console.log('⏰ [Backfill Check] Cache appears empty. Starting 2-year historical backfill...');
            isBackfilling = true;

            // Run in background (don't await)
            samGovSync.backfillHistoricalData(24)
                .then(() => {
                    console.log('✅ [Backfill] Historical backfill finished successfully.');
                    isBackfilling = false;
                })
                .catch((err) => {
                    console.error('❌ [Backfill] Historical backfill crashed:', err);
                    isBackfilling = false;
                });

        } else {
            console.log('⏰ [Backfill Check] Cache already populated. Skipping automatic backfill.');
        }
    } catch (error) {
        console.error('❌ [Backfill Check] Error checking cache status:', error);
    }
}

export default {
    initCronJobs
};
