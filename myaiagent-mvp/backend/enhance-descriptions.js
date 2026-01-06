import samGovCache from './src/services/samGovCache.js';
import pool from './src/utils/database.js';

async function main() {
    console.log('Starting description enhancement...');
    try {
        // Process up to 50 descriptions
        const count = await samGovCache.processPendingDescriptions(50);
        console.log(`Processed ${count} descriptions.`);
    } catch (e) {
        console.error('Error during description enhancement:', e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
