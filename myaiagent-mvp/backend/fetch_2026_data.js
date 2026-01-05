import 'dotenv/config';
import { searchAndCache } from './src/services/samGovCache.js';
import { searchOpportunities } from './src/services/samGov.js';
import pool from './src/utils/database.js';

async function run() {
    try {
        console.log("🚀 Starting fetch for 2026 opportunities...");

        const params = {
            postedFrom: '01/01/2026',
            postedTo: '12/31/2026',
            limit: 50
        };

        const orgId = 3; // The "New org" with the valid key

        const result = await searchAndCache(
            params,
            searchOpportunities,
            7, // userId (valid integer)
            orgId
        );

        console.log(`✅ Fetch Complete!`);
        console.log(`Total Found: ${result.summary.breakdown.total}`);
        console.log(`New Added: ${result.summary.breakdown.new}`);
        console.log(`Existing Updated: ${result.summary.breakdown.existing}`);

    } catch (e) {
        console.error("❌ Error fetching data:", e);
    } finally {
        await pool.end();
    }
}

run();
