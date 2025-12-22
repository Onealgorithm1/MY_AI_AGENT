import { query } from './src/utils/database.js';

async function listKeys() {
    try {
        const res = await query('SELECT id, service_name, key_label, is_active, organization_id, created_at FROM api_secrets');
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listKeys();
