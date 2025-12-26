
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars explicitly to be sure
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { saveApiKey, getApiKey } from '../utils/apiKeys.js';
import { query } from '../utils/database.js';

async function run() {
    try {
        console.log('--- STARTING DEBUG SCRIPT ---');
        console.log('Checking database connection...');
        await query('SELECT NOW()');
        console.log('Database connected.');

        const provider = 'samgov';
        const apiKey = 'test_key_value_123';
        const userId = 1;
        const organizationId = 3;
        const keyLabel = 'Debug Key ' + Date.now();

        // Cleaning up previous test artifacts
        await query("DELETE FROM api_secrets WHERE service_name = 'SAM.gov' AND organization_id = $1", [organizationId]);

        // Insert a dummy key first to ensure the UPDATE triggers
        console.log('Inserting dummy active key...');
        await query("INSERT INTO api_secrets (service_name, key_name, key_label, key_value, is_active, organization_id) VALUES ($1, 'TEST_PRE_KEY', 'Existing Key', 'encrypted', true, $2)", ['SAM.gov', organizationId]);

        console.log(`Attempting to saveApiKey (Active key exists)...`);
        const result = await saveApiKey(provider, apiKey, userId, organizationId, keyLabel);

        console.log('saveApiKey returned:', result);

        console.log('--- SUCCESS ---');
    } catch (error) {
        console.error('\n!!! CAUGHT ERROR !!!');
        console.error(error);
    } finally {
        process.exit(0);
    }
}

run();
