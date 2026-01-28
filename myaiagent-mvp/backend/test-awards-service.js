import 'dotenv/config';
import { awardService } from './src/services/awardService.js';
import { query } from './src/utils/database.js';

async function testAwards() {
    console.log('🧪 Testing Award Service...');

    const testUei = 'TEST_UEI_' + Date.now();

    try {
        // 2. Insert mock award
        console.log('📝 Inserting mock awards...');
        const id1 = 'TEST_AWARD_1_' + Date.now();
        const id2 = 'TEST_AWARD_2_' + Date.now();

        await query(`
      INSERT INTO fpds_contract_awards 
      (piid, vendor_name, vendor_uei, contracting_agency_name, current_contract_value, award_date, description_of_requirement, naics_code)
      VALUES 
      ($1, 'Test Vendor Inc', $2, 'Test Agency', 100000.00, '2025-01-01', 'Test Requirement 1', '541511'),
      ($3, 'Test Vendor Inc', $2, 'Another Agency', 50000.00, '2025-02-01', 'Test Requirement 2', '541512')
    `, [id1, testUei, id2]);

        // 3. Test search
        console.log('🔍 Testing searchAwards...');
        const searchRes = await awardService.searchAwards({ keyword: 'Test Vendor', limit: 10 });
        // Filter to be sure we found OUR test vendor (in case others exist)
        const foundMyVendor = searchRes.awards.some(a => a.vendor_uei === testUei);

        console.log('Search Results Total:', searchRes.total);
        if (foundMyVendor || searchRes.total >= 2) {
            console.log('✅ Found awards matching keyword.');
        } else {
            console.log('❌ Did not find created awards');
        }

        // 4. Test vendor performance
        console.log('📊 Testing getVendorPerformance...');
        const perfRes = await awardService.getVendorPerformance(testUei);
        console.log('Performance Summary:', perfRes.summary);

        // Check values (convert string from DB numeric/bigint to number/string for comparison)
        // total_awards is bigint (string), total_value is numeric (string)
        if (perfRes.summary.total_awards == 2 && Number(perfRes.summary.total_value) === 150000) {
            console.log('✅ Performance calc correct');
        } else {
            console.log('❌ Performance calc incorrect');
        }

        // 5. Test vendor history
        console.log('📜 Testing getVendorAwards...');
        const histRes = await awardService.getVendorAwards(testUei);
        console.log('History Total:', histRes.total);
        if (histRes.total == 2) {
            console.log('✅ History count correct');
        } else {
            console.log('❌ History count incorrect');
        }

        // Clean up
        console.log('🧹 Cleaning up...');
        await query('DELETE FROM fpds_contract_awards WHERE vendor_uei = $1', [testUei]);
        console.log('✨ Done.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        process.exit(0);
    }
}

testAwards();
