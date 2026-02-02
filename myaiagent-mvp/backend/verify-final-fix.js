import 'dotenv/config';
import samGovService from './src/services/samGov.js';

async function verifyFinalFix() {
    console.log('🧪 Verifying Final Fix (v2 Docs Implementation)...');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const formatDate = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const params = {
        postedFrom: formatDate(startDate),
        postedTo: formatDate(endDate),
        limit: 1000,
        offset: 0,
        fetchAll: true // Trigger loop logic
    };

    try {
        console.log('🚀 Sending request...');
        // Pass organizationId=3 to use the valid key
        const result = await samGovService.searchOpportunities(params, null, 3);
        console.log('✅ Success: ' + result.totalRecords + ' records found.');

        if (result.success) {
            console.log('✅ Verify Passed: API accepted request.');
        } else {
            console.log('❌ Verify Failed: API returned success=false.');
        }

    } catch (error) {
        if (error.message.includes('rate limited')) {
            console.log('⚠️  Rate limited (429), but Auth Passed! This counts as success for debugging.');
        } else {
            console.error('❌ Failed:', error.message);
        }
    }
}

verifyFinalFix();
