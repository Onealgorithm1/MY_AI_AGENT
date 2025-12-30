import { query, default as pool } from './src/utils/database.js';
import { matchOpportunities, getCompanyProfile } from './src/services/companyProfile.js';
import { getCachedOpportunities } from './src/services/samGovCache.js';

async function simulateFixedEndpoint() {
    try {
        console.log('🔍 Finding "org1\'s Organization" or first available...');
        const orgResult = await query("SELECT id, name FROM organizations WHERE name ILIKE '%org1%' OR name ILIKE '%demo%' LIMIT 1");

        if (orgResult.rows.length === 0) {
            console.log("❌ No matching organization found.");
            return;
        }
        const org = orgResult.rows[0];
        console.log(`🏢 Testing Organization: ${org.name} (ID: ${org.id})`);

        // 1. Get company profile first
        console.log('1️⃣  Fetching Profile...');
        const profile = await getCompanyProfile(org.id);

        // 2. Extract all NAICS codes for pre-filtering
        const profileNaics = profile.naicsCodes || [];
        const capabilityNaics = Object.values(profile.capabilities).flatMap(cap => cap.naicsCodes || []);
        const allNaics = [...new Set([...profileNaics, ...capabilityNaics])];

        console.log('   All NAICS for filter:', allNaics);

        // 3. Fetch pre-filtered from SAM.gov cache
        const filterOptions = { limit: 1000, offset: 0 };
        if (allNaics.length > 0) {
            filterOptions.naicsCodes = allNaics;
        }

        console.log('2️⃣  Fetching Filtered Opportunities from DB...');
        const cachedOpps = await getCachedOpportunities(filterOptions);
        const opportunities = cachedOpps.opportunities || [];
        console.log(`   Fetched ${opportunities.length} relevant opportunities.`);

        // 4. Match
        console.log('3️⃣  Running Match Logic...');
        const results = matchOpportunities(opportunities, profile);

        console.log(`   ✅ MATCHED: ${results.matched.length}`);
        console.log(`   ⚠️  NEAR MATCH: ${results.nearMatch.length}`);

        if (results.matched.length > 0) {
            console.log('   Success! First Match:', results.matched[0].title);
        } else {
            console.log('   ❌ NEW LOGIC STILL FAILED TO FIND MATCHES');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

simulateFixedEndpoint();
