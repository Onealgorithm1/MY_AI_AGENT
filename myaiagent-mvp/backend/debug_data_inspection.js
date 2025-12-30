import { query, default as pool } from './src/utils/database.js';

async function inspectData() {
    try {
        // 1. Check Org1 Profile
        const orgResult = await query("SELECT id, name FROM organizations WHERE name ILIKE '%org1%' LIMIT 1");
        if (orgResult.rows.length === 0) { console.log('Org not found'); return; }
        const orgId = orgResult.rows[0].id;

        console.log(`Checking profile for Org: ${orgResult.rows[0].name}`);
        const profileRes = await query("SELECT naics_codes FROM company_profile_cache WHERE organization_id = $1", [orgId]);
        console.log('Profile NAICS:', profileRes.rows[0]?.naics_codes);

        if (!profileRes.rows[0]?.naics_codes) {
            console.log('❌ PROFILE NAICS IS EMPTY/NULL');
        }

        // 2. Test NAICS Filter Query
        const testNaics = ['541511', '541512'];
        console.log(`Testing query for NAICS: ${testNaics}`);

        // Check raw count for these NAICS
        const rawCount = await query("SELECT count(*) FROM samgov_opportunities_cache WHERE naics_code IN ('541511', '541512')");
        console.log(`Raw DB Count (IN clause): ${rawCount.rows[0].count}`);

        // Check ANT/Array logic
        const anyCount = await query("SELECT count(*) FROM samgov_opportunities_cache WHERE naics_code = ANY($1)", [testNaics]);
        console.log(`DB Count (ANY clause): ${anyCount.rows[0].count}`);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

inspectData();
