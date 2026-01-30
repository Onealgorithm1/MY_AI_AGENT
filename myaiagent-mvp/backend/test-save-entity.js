import { saveEntity } from './src/services/samGovEntityService.js';
import { query } from './src/utils/database.js';

const mockEntity = {
    entityRegistration: {
        ueiSAM: 'TESTUEI12345',
        legalBusinessName: 'TEST ENTITY LLC',
        cageCode: '12345',
        registrationStatus: 'Active',
        expirationDate: '2025-12-31'
    },
    coreData: {
        physicalAddress: {
            city: 'Test City',
            stateOrProvinceCode: 'TS'
        }
    }
};

async function testSave() {
    console.log('Testing saveEntity...');
    try {
        await saveEntity(mockEntity);
        console.log('Save called. Checking DB...');

        const result = await query("SELECT * FROM samgov_entities WHERE uei = 'TESTUEI12345'");
        if (result.rows.length > 0) {
            console.log('✅ Success! Entity found in DB:', result.rows[0].legal_business_name);
            // Cleanup
            await query("DELETE FROM samgov_entities WHERE uei = 'TESTUEI12345'");
            console.log('Test entity cleaned up.');
        } else {
            console.error('❌ Failed! Entity not found in DB.');
        }
    } catch (err) {
        console.error('❌ Exception during test:', err);
    }
}

testSave();
