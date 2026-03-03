import dotenv from 'dotenv';
dotenv.config();
import { getCachedOpportunities } from './src/services/samGovCache.js';

async function runTest() {
    console.log("Testing fast local cache query payload size limit...");
    console.time('fetchFullLimit');

    try {
        const result = await getCachedOpportunities({ limit: 100000, offset: 0, status: 'active' });
        console.timeEnd('fetchFullLimit');

        if (result && result.opportunities) {
            console.log("Success! Fetched rows:", result.opportunities.length);
            console.log("Estimated Total Available in DB:", result.total);
            if (result.opportunities.length > 0) {
                console.log("Sample First Row format:");
                const row = result.opportunities[0];
                console.log(`- Title: ${row.title}`);
                console.log(`- Type: ${row.type}`);
                console.log(`- raw_data payload size approx: ${JSON.stringify(row.raw_data).length} bytes`);
            }
        } else {
            console.log("No result returned:", result);
        }
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        process.exit(0);
    }
}

runTest();
