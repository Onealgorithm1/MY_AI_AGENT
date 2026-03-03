import dotenv from 'dotenv';
import { getCachedOpportunities } from './src/services/samGovCache.js';

dotenv.config();

async function runTest() {
    console.log('Testing fast local cache query...');

    const startTime = Date.now();

    try {
        const result = await getCachedOpportunities({
            keyword: 'software',
            limit: 5
        });

        const duration = Date.now() - startTime;

        console.log(`✅ Query successful in ${duration}ms!`);
        console.log(`Found ${result.total} total matching records in local DB.`);
        console.log(`Showing top ${result.opportunities.length} results:`);

        result.opportunities.forEach((opp, i) => {
            console.log(`${i + 1}. [${opp.solicitation_number}] ${opp.title.substring(0, 50)}...`);
        });

    } catch (error) {
        console.error('❌ Query failed:');
        console.error(error);
    }

    process.exit(0);
}

runTest();
