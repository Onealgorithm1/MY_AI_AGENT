import pool from './src/utils/database.js';

async function checkColumns() {
    try {
        const res = await pool.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'samgov_opportunities_cache'"
        );
        console.table(res.rows);

        const hasRawData = res.rows.some(r => r.column_name === 'raw_data');
        console.log('Has raw_data column?', hasRawData);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkColumns();
