import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function checkDatabaseSize() {
    console.log('📊 Calculating database storage size...\n');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        // Query for total database size
        const totalSizeRes = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as total_size;
    `);

        // Query for table-wise size distribution
        const tableSizeRes = await pool.query(`
      SELECT 
        relname as table_name,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_size_pretty(pg_relation_size(relid)) as data_size,
        pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC;
    `);

        console.log('==================================================');
        console.log(`TOTAL DATABASE SIZE: ${totalSizeRes.rows[0].total_size}`);
        console.log('==================================================\n');

        console.log('TABLE-WISE DISTRIBUTION:');
        console.table(tableSizeRes.rows.map(row => ({
            'Table Name': row.table_name,
            'Total Size': row.total_size,
            'Data Size': row.data_size,
            'Index Size': row.index_size,
            'Row Count': row.row_count
        })));

    } catch (error) {
        console.error('❌ Error calculating database size:', error);
    } finally {
        await pool.end();
    }
}

checkDatabaseSize();
