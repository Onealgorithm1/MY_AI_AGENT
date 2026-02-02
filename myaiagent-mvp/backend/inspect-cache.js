import { query } from './src/utils/database.js';

async function inspect() {
    try {
        console.log('Checking for Award Notices...');

        // Check finding an award object
        const res = await query(`
            SELECT 
                id,
                type,
                raw_data->'award' as award_obj,
                raw_data->'award'->'awardee'->>'name' as awardee_name,
                raw_data->'award'->>'amount' as amount
            FROM samgov_opportunities_cache 
            WHERE raw_data->'award' IS NOT NULL 
            LIMIT 5
        `);

        if (res.rows.length > 0) {
            console.log(`Found ${res.rows.length} records with award data.`);
            res.rows.forEach(r => {
                console.log(`[${r.id}] Type: ${r.type}`);
                console.log(`   Awardee: ${r.awardee_name}`);
                console.log(`   Amount: ${r.amount}`);
            });
        } else {
            console.log('❌ No records with raw_data->award found.');

            // Sample what KEYS exist in raw_data
            const sample = await query('SELECT raw_data FROM samgov_opportunities_cache LIMIT 1');
            if (sample.rows.length > 0) {
                console.log('Sample Keys:', Object.keys(sample.rows[0].raw_data));
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
