import axios from 'axios';
import { getApiKey } from './src/utils/apiKeys.js';
import { query } from './src/utils/database.js';

// Manually fetching key to ensure we have it
async function getSamKey() {
    try {
        const key = await getApiKey('samgov', 'project', null); // Use the helper
        return key;
    } catch (e) {
        console.log("Helper failed, trying raw SQL fallback...");
        // Fallback: Check schema (likely 'api_keys' table not 'api_secrets'?)
        // Or column name difference. 
        // Let's rely on the imported helper which we know works in the app.
        throw e;
    }
}

async function probe() {
    try {
        const apiKey = await getSamKey();
        console.log("Got API Key. Testing...");

        const baseURL = 'https://api.sam.gov/prod/entity-information/v4/entities';

        // Test 1: Minimal with 'limit' (v3 style)
        console.log("\n--- Test 1: legalBusinessName + limit ---");
        try {
            const res1 = await axios.get(baseURL, {
                params: {
                    api_key: apiKey,
                    legalBusinessName: 'Google',
                    limit: 1
                }
            });
            console.log("Status:", res1.status);
            console.log("Records:", res1.data.totalRecords);
        } catch (e) { console.log("Failed:", e.response?.data || e.message); }

        // Test 2: Minimal with 'size' (v4 concept?)
        console.log("\n--- Test 2: legalBusinessName + size ---");
        try {
            const res2 = await axios.get(baseURL, {
                params: {
                    api_key: apiKey,
                    legalBusinessName: 'Google',
                    size: 1
                }
            });
            console.log("Status:", res2.status);
            console.log("Records:", res2.data.totalRecords);
        } catch (e) { console.log("Failed:", e.response?.data || e.message); }

        // Test 3: ueiSAM (Direct lookup)
        console.log("\n--- Test 3: ueiSAM (known valid UEI if possible, else generic) ---");
        try {
            const res3 = await axios.get(baseURL, {
                params: {
                    api_key: apiKey,
                    legalBusinessName: 'Microsoft', // fallback to name
                    includeSections: 'entityRegistration'
                }
            });
            console.log("Status:", res3.status);
            console.log("Records:", res3.data.totalRecords);
        } catch (e) { console.log("Failed:", e.response?.data || e.message); }

        // Test 4: Check if includeSections is the problem
        console.log("\n--- Test 4: legalBusinessName + includeSections (All) ---");
        try {
            const res4 = await axios.get(baseURL, {
                params: {
                    api_key: apiKey,
                    legalBusinessName: 'Google',
                    includeSections: 'entityRegistration,coreData,assertions,repsAndCerts,pointsOfContact'
                }
            });
            console.log("Status:", res4.status);
            console.log("Records:", res4.data.totalRecords);
        } catch (e) { console.log("Failed:", e.response?.data || e.message); }

    } catch (err) {
        console.error("Probe Setup Failed:", err);
    }
}

probe();
