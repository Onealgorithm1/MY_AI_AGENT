import { query, default as pool } from './src/utils/database.js';
import { matchOpportunities, getCompanyProfile } from './src/services/companyProfile.js';

async function debugScoring() {
    try {
        // 1. Get the profile for the seeded org (assuming we can find it, or pick the first one)
        const orgs = await query('SELECT id FROM organizations LIMIT 1');
        const orgId = orgs.rows[0].id;
        console.log(`Testing with Org ID: ${orgId}`);

        const profile = await getCompanyProfile(orgId);
        console.log('Profile NAICS:', profile.naicsCodes);
        console.log('Profile Capabilities Keys:', Object.keys(profile.capabilities));

        // 2. Get some opportunities
        const cachedOpps = await query(`
      SELECT * FROM samgov_opportunities_cache 
      WHERE naics_code IN ('541511', '541512', '518210') 
      LIMIT 10
    `);
        const opportunities = cachedOpps.rows;

        // 3. Run matching
        console.log('Running match logic...');
        const results = matchOpportunities(opportunities, profile);

        console.log(`Matched: ${results.matched.length}`);
        console.log(`Near Match: ${results.nearMatch.length}`);
        console.log(`Stretch: ${results.stretch.length}`);

        if (results.matched.length === 0 && results.nearMatch.length === 0) {
            console.log("DEBUGGING INDIVIDUAL SCORES:");
            // Manually log score calc for first opp to see why
            const opp = opportunities[0];
            console.log(`Opp NAICS: ${opp.naics_code}, Title: ${opp.title}`);

            // This logic mimics calculateMatchScore
            const allCompanyNaics = Object.values(profile.capabilities).flatMap(cap => cap.naicsCodes || []);
            console.log('Calculated "allCompanyNaics" from capabilities:', allCompanyNaics);

            if (profile.naicsCodes && profile.naicsCodes.includes(opp.naics_code)) {
                console.log("Match found in top-level naicsCodes but ignored by function?");
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

debugScoring();
