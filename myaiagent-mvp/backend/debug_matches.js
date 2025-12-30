import { query, default as pool } from './src/utils/database.js';

async function checkMatches() {
    try {
        const result = await query(`
      SELECT count(*) 
      FROM samgov_opportunities_cache 
      WHERE naics_code IN ('541511', '541512', '518210') 
         OR description ILIKE '%software%' 
         OR title ILIKE '%software%'
    `);
        console.log('Potential Matches Found:', result.rows[0].count);

        // Also check total count again just to be sure
        const total = await query('SELECT count(*) FROM samgov_opportunities_cache');
        console.log('Total Opportunities:', total.rows[0].count);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkMatches();
