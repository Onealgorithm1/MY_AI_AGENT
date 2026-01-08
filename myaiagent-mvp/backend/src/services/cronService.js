import cron from 'node-cron';
import samGovSync from './samGovSync.js';
import samGovCache from './samGovCache.js';
import { query } from '../utils/database.js';
import notificationService from './notificationService.js';
import samGov from './samGov.js'; // Ensure we have the search function

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

    // 2. Reminder Check (Every hour: 0 * * * *)
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ [Cron] Checking opportunity reminders...');
        try {
            await checkReminders();
        } catch (error) {
            console.error('❌ [Cron] Reminder check failed:', error);
        }
    });

    // 3. Saved Searches Check (Daily at 6 AM: 0 6 * * *)
    cron.schedule('0 6 * * *', async () => {
        console.log('⏰ [Cron] Running saved searches...');
        try {
            await processSavedSearches();
        } catch (error) {
            console.error('❌ [Cron] Saved searches processing failed:', error);
        }
    });

    // 4. Startup Checks
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

/**
 * Check pending reminders and send notifications
 */
async function checkReminders() {
    const result = await query(
        `SELECT r.*, o.title, o.solicitation_number 
         FROM opportunity_reminders r
         JOIN opportunities o ON r.opportunity_id = o.id
         WHERE r.is_sent = FALSE AND r.reminder_date <= NOW()`
    );

    for (const reminder of result.rows) {
        try {
            await notificationService.createNotification(
                reminder.user_id,
                'reminder',
                `Reminder: ${reminder.title}`,
                reminder.note || `Reminder for opportunity ${reminder.solicitation_number}`,
                { opportunityId: reminder.opportunity_id }
            );

            await query(
                `UPDATE opportunity_reminders SET is_sent = TRUE, sent_at = NOW() WHERE id = $1`,
                [reminder.id]
            );
            console.log(`✅ Sent reminder notification to user ${reminder.user_id}`);
        } catch (err) {
            console.error(`❌ Failed to process reminder ${reminder.id}:`, err);
        }
    }
}

/**
 * Process saved searches and notify users of new matches
 */
async function processSavedSearches() {
    // This is a simplified implementation. 
    // In a real system, you'd track "last_checked_at" and only query for *new* opportunities since then.
    // For MVP, we'll just run the search and notify if there are >0 results posted in the last 24h.

    // Get active daily searches
    const searches = await query(
        `SELECT * FROM saved_searches WHERE is_active = TRUE AND frequency = 'daily'`
    );

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Format dates as YYYY-MM-DD for SAM.gov API (or internal query)
    // Note: Our internal searchOpportunities uses specific formats. 
    // For now, let's assume we are checking against our INTERNAL database for new matches to save API calls.

    for (const search of searches.rows) {
        try {
            const filters = search.filters;
            // Add date filter for "since last run" or "last 24h"
            // We'll simulate by searching our local DB for posted_date > yesterday using a direct query or reused service

            // Construct WHERE clause from filters (simplified)
            let whereClause = `posted_date >= $1`;
            const params = [yesterday];
            let pIdx = 2;

            if (filters.keyword) {
                whereClause += ` AND (title ILIKE $${pIdx} OR description ILIKE $${pIdx})`;
                params.push(`%${filters.keyword}%`);
                pIdx++;
            }
            if (filters.noticeType) {
                whereClause += ` AND type = $${pIdx}`;
                params.push(filters.noticeType);
                pIdx++;
            }

            const matchQuery = `SELECT COUNT(*) as count FROM opportunities WHERE ${whereClause}`;
            const matchResult = await query(matchQuery, params);
            const count = parseInt(matchResult.rows[0].count);

            if (count > 0) {
                // Determine title based on filters to be more descriptive
                let title = `New matches for "${search.name}"`;

                await notificationService.createNotification(
                    search.user_id,
                    'new_match',
                    title,
                    `Found ${count} new opportunities matching your saved search in the last 24 hours.`,
                    { savedSearchId: search.id, filter: filters }
                );

                await query(
                    `UPDATE saved_searches SET last_run_at = NOW() WHERE id = $1`,
                    [search.id]
                );
                console.log(`✅ Notify user ${search.user_id} of ${count} matches for search ${search.id}`);
            }

        } catch (err) {
            console.error(`❌ Failed to process saved search ${search.id}:`, err);
        }
    }
}

export default {
    initCronJobs
};
