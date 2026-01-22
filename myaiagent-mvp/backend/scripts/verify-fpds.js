import * as fpdsService from '../src/services/fpds.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables manually since we are running a script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyFPDS() {
    console.log('🔍 Starting FPDS Verification...');

    try {
        // Test 1: Search Contract Awards
        console.log('\n--- Test 1: Search Contract Awards (Agency: DOD) ---');
        try {
            const searchResult = await fpdsService.searchContractAwards({
                limit: 5,
                agencyCode: '9700', // DOD or similar
                awardDateFrom: '2023-01-01',
                awardDateTo: '2023-12-31'
            });

            console.log('✅ Search Success:', searchResult.success);
            console.log(`📊 Total Records Found: ${searchResult.totalRecords}`);
            if (searchResult.contracts && searchResult.contracts.length > 0) {
                console.log('📝 Sample Contract:', JSON.stringify(searchResult.contracts[0].title || searchResult.contracts[0].noticeId, null, 2));
            } else {
                console.log('⚠️ No contracts found (this might be valid if no matches)');
                console.log('Response Keys:', Object.keys(searchResult.data));
            }
        } catch (error) {
            console.error('❌ Test 1 Failed:', error.message);
            if (error.message.includes('API key')) {
                console.log('💡 Tip: Ensure SAM.gov API key is set in .env or database');
            }
        }

        // Test 2: Get Vendor Contracts (Mock Vendor UEI)
        console.log('\n--- Test 2: Get Vendor Contracts (Mock UEI) ---');
        try {
            // Using a random UEI format or a known one if possible. 
            // Using Google's UEI or similar might work, but let's try a generic or leave it blank to see validation.
            const mockUEI = 'SAM_TEST_UEI';
            const vendorResult = await fpdsService.getVendorContracts(mockUEI, { limit: 1 });
            console.log('✅ Vendor Search Executed (Success/Fail depends on UEI validity):', vendorResult.success);
        } catch (error) {
            console.error('❌ Test 2 Failed (Expected if UEI is invalid):', error.message);
        }

    } catch (err) {
        console.error('🔥 Critical Error:', err);
    }
}

verifyFPDS();
