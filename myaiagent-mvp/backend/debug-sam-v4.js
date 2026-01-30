// Debug SAM.gov API v4 parameters
import { searchEntities } from './src/services/samGov.js';

async function testSearch(params) {
    console.log('\n----------------------------------------');
    console.log('Testing Search with params:', JSON.stringify(params, null, 2));
    try {
        const result = await searchEntities(params);
        console.log('✅ Success!');
        console.log(`Found ${result.totalRecords} records.`);
        if (result.entities.length > 0) {
            console.log('First Entity:', result.entities[0].entityRegistration.legalBusinessName);
        } else {
            console.warn('⚠️ No entities returned.');
        }
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

async function run() {
    // Test 1: Active status only (Default UI state)
    await testSearch({
        legalBusinessName: 'Technology',
        registrationStatus: 'Active',
        limit: 5
    });

    // Test 2: Sort by Name
    await testSearch({
        legalBusinessName: 'Technology',
        sort: 'name',
        limit: 5
    });

    // Test 3: No filters (Baseline)
    await testSearch({
        legalBusinessName: 'Technology',
        limit: 5
    });
}

run();
