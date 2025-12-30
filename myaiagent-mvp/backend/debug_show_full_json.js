import pool from './src/utils/database.js';

async function showFullJson() {
    try {
        const res = await pool.query('SELECT raw_data FROM samgov_opportunities_cache ORDER BY created_at DESC LIMIT 1');
        if (res.rows.length > 0) {
            console.log(JSON.stringify(res.rows[0].raw_data, null, 2));
        } else {
            console.log('No records found in cache.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

showFullJson();
