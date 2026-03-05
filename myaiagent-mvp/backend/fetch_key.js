import { query } from './src/utils/database.js';
import { decrypt } from './src/utils/apiKeys.js';
import fs from 'fs';

async function test() {
    const result = await query('SELECT * FROM api_secrets WHERE service_name = $1 ORDER BY created_at DESC LIMIT 5', ['gemini']);
    const output = result.rows.map(r => ({
        id: r.id,
        service_name: r.service_name,
        key_label: r.key_label,
        is_active: r.is_active,
        organization_id: r.organization_id,
        decrypted: decrypt(r.key_value)
    }));
    fs.writeFileSync('output.json', JSON.stringify(output, null, 2));
    process.exit(0);
}

test().catch(console.error);
