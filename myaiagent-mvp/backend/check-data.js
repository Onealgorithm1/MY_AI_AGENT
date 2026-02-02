import 'dotenv/config';
import { awardService } from './src/services/awardService.js';
import { query } from './src/utils/database.js';

async function checkData() {
    try {
        // 1. Check Total Awards
        const countRes = await query('SELECT COUNT(*) as total FROM fpds_contract_awards');
        console.log(`\n📊 Total Awards in DB: ${countRes.rows[0].total}`);

        // 2. Check Top Performers
        console.log('\n🏆 Top 5 Performing Vendors (Current Data):');
        const top = await awardService.getTopPerformingVendors(5);
        if (top.length === 0) {
            console.log('   (No vendor data aggregated yet)');
        } else {
            top.forEach((v, i) => {
                console.log(`   ${i + 1}. ${v.vendor_name} (UEI: ${v.vendor_uei})`);
                console.log(`      $${new Intl.NumberFormat('en-US').format(v.total_value)} | ${v.award_count} Awards`);
            });
        }
        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}

checkData();
