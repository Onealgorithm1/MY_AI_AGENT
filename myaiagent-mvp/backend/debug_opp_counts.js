import pool from './src/utils/database.js';

async function checkData() {
    try {
        const totalRes = await pool.query('SELECT COUNT(*) FROM samgov_opportunities_cache');
        console.log('Total Opportunities:', totalRes.rows[0].count);

        const byOrgRes = await pool.query(`
      SELECT organization_id, COUNT(*) 
      FROM samgov_opportunities_cache 
      GROUP BY organization_id
    `);
        console.log('Breakdown by Organization:', byOrgRes.rows);

        const userRes = await pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 1');
        console.log('Latest User:', userRes.rows[0]);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkData();
