import { query } from './src/utils/database.js';

async function checkCache() {
    try {
        console.log('Checking samgov_entities table...');
        const result = await query('SELECT COUNT(*) FROM samgov_entities');
        console.log('Total Cached Entities:', result.rows[0].count);

        if (result.rows[0].count > 0) {
            const sample = await query('SELECT uei, legal_business_name FROM samgov_entities LIMIT 5');
            console.log('Sample Entities:', sample.rows);
        }
    } catch (error) {
        console.error('Error checking cache:', error);
    }
}

checkCache();
