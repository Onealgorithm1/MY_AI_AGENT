import pool from './src/utils/database.js';

async function debugApiKeys() {
    try {
        console.log('--- Debugging API Secrets ---');
        const res = await pool.query('SELECT id, organization_id, service_name, key_type, is_active, created_at FROM api_secrets');
        console.table(res.rows);

        // Check for "samgov" specifically
        const samRes = await pool.query("SELECT * FROM api_secrets WHERE service_name = 'samgov'");
        console.log('SAM.gov keys found:', samRes.rows.length);
        if (samRes.rows.length > 0) {
            console.log('First SAM.gov key details:', {
                ...samRes.rows[0],
                api_key: 'REDACTED'
            });
        }

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        pool.end();
    }
}

debugApiKeys();
