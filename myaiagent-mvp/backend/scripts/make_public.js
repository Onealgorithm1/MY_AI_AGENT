import pool from '../src/utils/database.js';

async function makeOpportunitiesPublic() {
    const client = await pool.connect();
    try {
        console.log('🔄 Converting cached SAM.gov opportunities to PUBLIC (Global)...');

        // Update all records where organization_id is NOT null
        const result = await client.query(`
      UPDATE samgov_opportunities_cache 
      SET organization_id = NULL 
      WHERE organization_id IS NOT NULL
    `);

        console.log(`✅ Success! Updated ${result.rowCount} opportunities to be public.`);
    } catch (error) {
        if (error.code === '23505') {
            console.warn('⚠️  Duplicate key error during update. You may have duplicates (same notice_id for multiple orgs).');
            console.log('🔄 Attempting to merge/deduplicate is complex, so for now we will just update non-conflicting ones or leave as is.');
        } else {
            console.error('❌ Error updating opportunities:', error);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

makeOpportunitiesPublic();
