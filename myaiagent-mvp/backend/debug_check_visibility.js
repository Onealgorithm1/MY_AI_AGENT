import pool from './src/utils/database.js';
import { getCachedOpportunities } from './src/services/samGovCache.js';

async function checkVisibility() {
    try {
        console.log('🔍 Checking visibility for a simulated NON-ADMIN user...');

        // Simulate query parameters for a standard user (Org ID 3, not Master Admin)
        const options = {
            limit: 5,
            offset: 0,
            userId: 'test-user-id',
            organizationId: 3,
            isMasterAdmin: false
        };

        console.log('Query Options:', options);

        const result = await getCachedOpportunities(options);

        console.log(`✅ Result: Found ${result.total} opportunities.`);
        console.log('Sample IDs:', result.opportunities.map(o => o.id));

        if (result.total === 0) {
            console.log('⚠️  WARNING: No opportunities found. Check filters!');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

checkVisibility();
