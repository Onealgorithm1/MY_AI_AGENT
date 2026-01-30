import 'dotenv/config';
import { searchContractAwards } from './src/services/fpds.js';
import { searchOpportunities, getEntityByUEI } from './src/services/samGov.js';

async function runTests() {
    console.log('--- Testing FPDS (Opportunities v2) ---');
    try {
        // Test with a keyword search instead of PIID to ensure general connectivity
        const awards = await searchContractAwards({ keyword: 'technology', limit: 1 });
        console.log('FPDS Search Result:', awards.success ? 'Success' : 'Failed');
        if (awards.isMock) {
            console.log('WARN: Returning Mock/Empty data (likely due to missing API Key)');
        } else {
            console.log(`Found ${awards.totalRecords} records.`);
        }
    } catch (error) {
        console.error('FPDS Test Error:', error.message);
    }

    console.log('\n--- Testing SAM.gov Opportunities v2 ---');
    try {
        const opportunities = await searchOpportunities({ limit: 1 });
        console.log('Opportunities v2 Search Result:', opportunities.success ? 'Success' : 'Failed');
        console.log(`Found ${opportunities.totalRecords} records.`);
    } catch (error) {
        console.error('SAM.gov Opportunities Test Error:', error.message);
    }

    console.log('\n--- Testing SAM.gov Entity Management v4 ---');
    try {
        // Using a known UEI or just checking error handling if key missing
        const entity = await getEntityByUEI('LMC123456UEI'); // Mock UEI
        console.log('Entity v4 Fetch Result:', entity.success ? 'Success (Found)' : 'Failed/Not Found');
        if (!entity.success) console.log('Reason:', entity.message);
    } catch (error) {
        console.error('SAM.gov Entity Test Error:', error.message);
    }
}

runTests();
