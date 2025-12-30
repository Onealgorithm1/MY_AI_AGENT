import { query, default as pool } from './src/utils/database.js';
import { matchOpportunities, getCompanyProfile } from './src/services/companyProfile.js';
import { getCachedOpportunities } from './src/services/samGovCache.js';

async function simulateEndpoint() {
    try {
        console.log('🔍 Finding "org1\'s Organization"...');
        const orgResult = await query("SELECT id, name FROM organizations WHERE name ILIKE '%org1%' OR name ILIKE '%demo%' LIMIT 5");

        if (orgResult.rows.length === 0) {
            console.log("❌ No matching organization found.");
            return;
        }

        // Iterate through found orgs to test them all
        for (const org of orgResult.rows) {
            console.log(`\n-----------------------------------`);
            console.log(`🏢 Testing Organization: ${org.name} (ID: ${org.id})`);

            // 1. Get Profile
            console.log('1️⃣  Fetching Company Profile...');
            const profile = await getCompanyProfile(org.id);
            console.log(`   Name: ${profile.name}`);
            console.log(`   NAICS: ${JSON.stringify(profile.naicsCodes)}`);
            console.log(`   Keywords: ${JSON.stringify(profile.keywords)}`);

            if (!profile.naicsCodes || profile.naicsCodes.length === 0) {
                console.log("   ❌ Profile has NO NAICS codes. This is likely the problem.");
            }

            // 2. Get Opportunities (Mocking getCachedOpportunities logic)
            console.log('2️⃣  Fetching SAM.gov Data...');
            // Note: The route uses getCachedOpportunities({ limit: 1000, offset: 0 })
            // Let's call it directly to be sure
            const cachedOpps = await getCachedOpportunities({ limit: 1000, offset: 0 });
            const opportunities = cachedOpps.opportunities || [];
            console.log(`   Fetched ${opportunities.length} opportunities from cache.`);

            // 3. Match
            console.log('3️⃣  Running Match Logic...');
            const results = matchOpportunities(opportunities, profile);

            console.log(`   ✅ MATCHED: ${results.matched.length}`);
            console.log(`   ⚠️  NEAR MATCH: ${results.nearMatch.length}`);

            if (results.matched.length > 0) {
                console.log('   First Match:', results.matched[0].title);
                console.log('   Score:', results.matched[0].matchScore.total);
                console.log('   Reasons:', results.matched[0].matchScore.reasons);
            } else {
                // Debug why first opp didn't match
                if (opportunities.length > 0) {
                    const sample = opportunities.find(o => ['541511', '541512'].includes(o.naics_code));
                    if (sample) {
                        console.log("   🔎 Sample Candidate (should match):", sample.title);
                        console.log("      NAICS:", sample.naics_code);
                        // Calculate score manually?
                        // No need, just trust the output 0 means logic failed
                    } else {
                        console.log("   ❌ No candidates with NAICS 541511/541512 found in the 1000 fetched opps.");
                    }
                }
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

simulateEndpoint();
