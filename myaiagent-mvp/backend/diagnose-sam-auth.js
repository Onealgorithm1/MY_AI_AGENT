import 'dotenv/config';
import axios from 'axios';
import { getApiKey } from './src/utils/apiKeys.js';

const SAM_API_BASE_URL = 'https://api.sam.gov';

async function diagnoseAuth() {
    console.log('🕵️‍♀️ Starting SAM.gov Auth Diagnosis (Strategy 7 Only)...');

    let apiKey;
    try {
        console.log('🔑 Fetching API Key for Org 3...');
        apiKey = await getApiKey('samgov', 'project', 3);
        console.log(`✅  Got Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'null'}`);
    } catch (e) {
        console.log('⚠️ Could not get Org 3 key, trying system key...');
        try {
            apiKey = await getApiKey('samgov', 'project', null);
            console.log(`✅ Got System Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'null'}`);
        } catch (err) {
            console.error('❌ Could not get any API key:', err.message);
            process.exit(1);
        }
    }

    if (!apiKey) {
        console.error('❌ No API Key found to test with.');
        process.exit(1);
    }

    const today = new Date();
    const limit = 1;
    const offset = 0;
    const postedFrom = '01/01/2026';
    const postedTo = '02/01/2026';

    const tests = [
        {
            name: 'Strategy 7: Documented URL + Params (limit/offset)',
            urlOverride: '/opportunities/v2/search',
            config: {
                params: {
                    postedFrom,
                    postedTo,
                    limit,
                    offset,
                    api_key: apiKey
                }
            }
        }
    ];

    console.log('\n🧪 Running Tests against SAM.gov ...\n');

    for (const test of tests) {
        console.log(`👉 Testing: ${test.name}`);
        const url = test.urlOverride ? `${SAM_API_BASE_URL}${test.urlOverride}` : `${SAM_API_BASE_URL}/prod/opportunity/v2/search`;
        console.log(`   URL: ${url}`);

        try {
            const response = await axios.get(url, {
                ...test.config,
                timeout: 10000
            });
            console.log(`   ✅ SUCCESS! Status: ${response.status}`);
            console.log(`   📝 Data Preview: ${JSON.stringify(response.data).substring(0, 100)}...`);
            console.log(`   🎉 WINNER FOUND: Use ${test.name}`);
        } catch (error) {
            const status = error.response ? error.response.status : 'Unknown';
            const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
            console.log(`   ❌ Failed (Status: ${status}): ${msg}`);
        }
        console.log('---------------------------------------------------');
    }

    process.exit(0);
}

diagnoseAuth();
