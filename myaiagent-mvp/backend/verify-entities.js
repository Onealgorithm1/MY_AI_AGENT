import samGovService from './src/services/samGov.js';
import { getApiKey } from './src/utils/apiKeys.js';
import pool from './src/utils/database.js';

async function verifyEntities() {
    console.log('--- Starting SAM.gov Entity Service Verification ---');

    try {
        // 1. Get API Key
        let apiKey = await getApiKey('samgov', 'project', 3);
        if (!apiKey) apiKey = await getApiKey('samgov', 'project', null);

        if (!apiKey) {
            console.error('❌ No API Key found.');
            return;
        }
        console.log('✅ Found API Key');

        // 2. Test Search Entities (Service call)
        console.log('\n2. Testing samGovService.searchEntities (v4)...');
        try {
            const searchResult = await samGovService.searchEntities(
                {
                    legalBusinessName: 'Technology',
                    limit: 5, // Service should map this to size
                    offset: 0 // Service should map this to page
                },
                null,
                3
            );

            if (searchResult.success) {
                console.log(`✅ Search Success! Found ${searchResult.totalRecords} records.`);
                console.log('   First 2 entities:');
                searchResult.entities.slice(0, 2).forEach(ent => {
                    const reg = ent.entityRegistration || {};
                    console.log(`   - [${reg.ueiSAM}] ${reg.legalBusinessName} (${reg.registrationStatus})`);
                });
            } else {
                console.error('❌ Search Service Failed:', searchResult.message);
            }
        } catch (err) {
            console.error('❌ Search Exception:', err.message);
            if (err.response) {
                console.log('   Data:', JSON.stringify(err.response.data).substring(0, 300));
            }
        }

    } catch (error) {
        console.error('❌ Verification Error:', error.message);
    } finally {
        await pool.end();
    }
}

verifyEntities();
