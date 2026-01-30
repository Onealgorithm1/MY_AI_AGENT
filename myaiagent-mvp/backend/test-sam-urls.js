import axios from 'axios';
import { getApiKey } from './src/utils/apiKeys.js';
import pool from './src/utils/database.js';

async function testUrls() {
    console.log('--- Testing SAM.gov Entity API URLs ---');

    // 1. Get Key with fallback
    let apiKey = await getApiKey('samgov', 'project', 3);
    if (!apiKey) {
        console.log('⚠️ Key not found for Org 3, trying system-wide...');
        apiKey = await getApiKey('samgov', 'project', null);
    }

    if (!apiKey) {
        console.error('❌ No API Key found via getApiKey helper.');
        // Try fallback DB query
        try {
            const res = await pool.query("SELECT * FROM api_secrets WHERE service_name = 'SAM.gov' LIMIT 1");
            if (res.rows.length > 0) {
                console.log('⚠️  Found key in DB manually but cannot decrypt here without helper.');
            }
        } catch (e) {
            console.error('DB Query failed:', e.message);
        }
        process.exit(1);
    }

    console.log('✅ Got API Key (length: ' + apiKey.length + ')');

    // 2. Test URLs
    const urls = [
        'https://api.sam.gov/entity-information/v3/entities',
        'https://api.sam.gov/prod/entity-information/v3/entities',
        'https://api.sam.gov/entity-information/v4/entities',
        'https://api.sam.gov/prod/entity-information/v4/entities',
    ];

    for (const url of urls) {
        console.log(`\nTesting: ${url}`);
        try {
            const res = await axios.get(url, {
                params: {
                    api_key: apiKey,
                    legalBusinessName: 'Technology',
                    limit: 1,
                    // v4 might need ueiSAM if searching specific, but let's try generic search
                },
                timeout: 10000
            });
            console.log(`✅ SUCCESS! Status: ${res.status}`);
            console.log(`   Data keys: ${Object.keys(res.data).join(', ')}`);
        } catch (err) {
            console.log(`❌ FAILED. Status: ${err.response?.status} - ${err.response?.statusText}`);
            if (err.response?.data) {
                // Print first 200 chars of data
                const dataStr = JSON.stringify(err.response.data);
                console.log(`   Response: ${dataStr.substring(0, 200)}...`);
            }
        }
    }

    await pool.end();
}

testUrls();
