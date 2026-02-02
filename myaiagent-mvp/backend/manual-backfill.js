import 'dotenv/config';
import { backfillHistoricalData } from './src/services/samGovSync.js';

async function runBackfill() {
    console.log('🚀 Starting Manual Backfill for 60 months (5 years)...');
    try {
        await backfillHistoricalData(60);
        console.log('✅ Manual backfill completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Manual backfill failed:', error);
        process.exit(1);
    }
}

runBackfill();
