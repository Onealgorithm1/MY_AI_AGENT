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
/**
 * Process saved searches and notify users of new matches
 */
async function processSavedSearches() {
    console.log('⏰ [Cron] Processing saved searches...');

    // Get active daily searches
    const searches = await query(
        `SELECT * FROM saved_searches WHERE is_active = TRUE AND frequency = 'daily'`
    );

    for (const search of searches.rows) {
        try {
            const filters = search.filters;
            const lastRun = search.last_run_at || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to yesterday if null

            // Construct WHERE clause dynamically based on filters
            // We are looking for opportunities posted AFTER the last run
            let whereClause = `posted_date > $1`;
            const params = [lastRun];
            let pIdx = 2;

            // 1. Keyword (Title or Description)
            if (filters.keyword) {
                whereClause += ` AND (title ILIKE $${pIdx} OR description ILIKE $${pIdx})`;
                params.push(`%${filters.keyword}%`);
                pIdx++;
            }

            // 2. Notice Type
            if (filters.noticeType && filters.noticeType !== 'ALL') {
                whereClause += ` AND type = $${pIdx}`;
                params.push(filters.noticeType);
                pIdx++;
            }

            // 3. NAICS Code
            if (filters.naicsCode) {
                // Support partial match if needed, but exact is safer for codes
                whereClause += ` AND naics_code LIKE $${pIdx}`;
                params.push(`${filters.naicsCode}%`);
                pIdx++;
            }

            // 4. Set Aside
            if (filters.setAsideType && filters.setAsideType !== 'ALL') {
                whereClause += ` AND set_aside_type = $${pIdx}`;
                params.push(filters.setAsideType);
                pIdx++;
            }

            // 5. Agency
            if (filters.agency) {
                whereClause += ` AND contracting_office ILIKE $${pIdx}`;
                params.push(`%${filters.agency}%`);
                pIdx++;
            }

            // 6. Place of Performance (State)
            if (filters.placeOfPerformance) {
                // Check if place_of_performance JSON contains the state
                // This assumes `place_of_performance` is stored as JSONB or text that can be queried
                // For MVP text search on the column is simplest if structure varies
                whereClause += ` AND place_of_performance::text ILIKE $${pIdx}`;
                params.push(`%${filters.placeOfPerformance}%`);
                pIdx++;
            }

            const matchQuery = `SELECT COUNT(*) as count FROM opportunities WHERE ${whereClause}`;
            const matchResult = await query(matchQuery, params);
            const count = parseInt(matchResult.rows[0].count);

            if (count > 0) {
                const title = `New matches for "${search.name}"`;
                const message = `Found ${count} new opportunities since your last check.`;

                await notificationService.createNotification(
                    search.user_id,
                    'new_match',
                    title,
                    message,
                    {
                        savedSearchId: search.id,
                        filters: filters,
                        count: count
                    }
                );

                // Update last run time
                await query(
                    `UPDATE saved_searches SET last_run_at = NOW() WHERE id = $1`,
                    [search.id]
                );
                console.log(`✅ Notify user ${search.user_id} of ${count} matches for search "${search.name}"`);
            }

        } catch (err) {
            console.error(`❌ Failed to process saved search ${search.id}:`, err);
        }
    }
}

export default {
    initCronJobs
};
