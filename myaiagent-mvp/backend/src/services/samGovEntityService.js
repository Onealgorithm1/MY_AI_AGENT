import { query } from '../utils/database.js';

/**
 * Upsert an entity into the local database cache
 * @param {Object} entity - The raw entity object from SAM.gov API v4
 */
export async function saveEntity(entity) {
    try {
        // 1. Extract Core Fields from v4 structure
        // Structure: { entityRegistration: { ueiSAM, legalBusinessName, ... }, coreData: { ... }, ... }

        // Safety check
        if (!entity || !entity.entityRegistration) {
            // Might be a partial record or different wrapper
            console.warn('⚠️ Cannot save entity: missing entityRegistration');
            return;
        }

        const reg = entity.entityRegistration;
        const uei = reg.ueiSAM;
        const cage = reg.cageCode || null;
        const name = reg.legalBusinessName;
        const dba = reg.dbaName || null;
        const status = reg.registrationStatus;
        const expiration = reg.expirationDate ? new Date(reg.expirationDate) : null;

        // 2. Normalize Full Data (store everything)
        const fullData = JSON.stringify(entity);

        // 3. Upsert Query
        const text = `
      INSERT INTO samgov_entities (
        uei, 
        cage_code, 
        legal_business_name, 
        dba_name, 
        registration_status, 
        expiration_date, 
        full_data,
        last_updated_from_api,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (uei) 
      DO UPDATE SET
        cage_code = EXCLUDED.cage_code,
        legal_business_name = EXCLUDED.legal_business_name,
        dba_name = EXCLUDED.dba_name,
        registration_status = EXCLUDED.registration_status,
        expiration_date = EXCLUDED.expiration_date,
        full_data = EXCLUDED.full_data,
        last_updated_from_api = NOW(),
        updated_at = NOW();
    `;

        const values = [
            uei,
            cage,
            name,
            dba,
            status,
            expiration,
            fullData
        ];

        await query(text, values);
        // console.log(`💾 Saved entity: ${name} (${uei})`);

    } catch (error) {
        console.error('❌ Failed to save entity to cache:', error.message);
        // Non-blocking: don't throw, just log. We don't want to break the search flow if cache fails.
    }
}

/**
 * Bulk save entities (for list results)
 */
export async function saveEntities(entities) {
    if (!Array.isArray(entities)) return;

    // Process in parallel (or batch if needed, but parallel promises usually fine for page size 10)
    await Promise.all(entities.map(ent => saveEntity(ent)));
}

export default {
    saveEntity,
    saveEntities
};
