import { query, default as pool } from './src/utils/database.js';

async function checkOpportunityOwnership() {
    try {
        console.log('Checking ownership of opportunities with NAICS 541511...');

        const res = await query(`
      SELECT id, title, organization_id, created_by 
      FROM samgov_opportunities_cache 
      WHERE naics_code = '541511' 
      LIMIT 10
    `);

        console.log(`Found ${res.rows.length} opportunities.`);
        res.rows.forEach(r => {
            console.log(`- Opp ID: ${r.id}, Org ID: ${r.organization_id}, Created By: ${r.created_by}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkOpportunityOwnership();
