import axios from 'axios';
import { query } from '../utils/database.js';
import { getApiKey } from '../utils/apiKeys.js';

const SAM_API_BASE_URL = 'https://api.sam.gov';

export async function fetchAwards(options = {}, organizationId = null) {
    try {
        const apiKey = await getApiKey('samgov', 'project', organizationId);
        if (!apiKey) throw new Error('SAM.gov API key not found');

        const {
            dateSignedStart,
            dateSignedEnd,
            limit = 100,
            offset = 0
        } = options;

        const params = {
            api_key: apiKey,
            limit: limit,
            offset: offset
        };

        // SAM.gov Awards API requires MM/DD/YYYY format for dates
        if (dateSignedStart) params.dateSignedStart = dateSignedStart;
        if (dateSignedEnd) params.dateSignedEnd = dateSignedEnd;

        // According to docs, we can pass 'date_signed' range
        // Example from docs: dateSigned in range
        // Let's use the provided params if they match documentation
        // If user passed specific date range string like "[01/01/2025,01/31/2025]" for dateSigned param
        if (options.dateSigned) {
            params.dateSigned = options.dateSigned;
        }

        const response = await axios.get(`${SAM_API_BASE_URL}/prod/contract-awards/v1/search`, {
            params,
            timeout: 60000
        });

        return {
            success: true,
            data: response.data,
            totalRecords: response.data.totalRecords || 0,
            awards: response.data.awardsData || [] // Check actual response key 'awardsData' vs 'results'
        };
    } catch (error) {
        console.error('Fetch Awards Error:', error.response?.data || error.message);
        throw error;
    }
}

export async function saveAward(award) {
    const client = await query('BEGIN');
    try {
        // Extract fields safely
        const key = award.contractAwardUniqueKey; // Primary Key
        if (!key) throw new Error('No unique key in award');

        const q = `
            INSERT INTO contract_awards (
                contract_award_unique_key,
                award_id_piid,
                modification_number,
                transaction_number,
                parent_award_id_piid,
                awardee_name,
                awardee_uei,
                awardee_cage,
                total_dollars_obligated,
                date_signed,
                naics_code,
                psc_code,
                awarding_agency_name,
                full_data,
                updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
            )
            ON CONFLICT (contract_award_unique_key)
            DO UPDATE SET
                total_dollars_obligated = EXCLUDED.total_dollars_obligated,
                modification_number = EXCLUDED.modification_number,
                updated_at = NOW();
        `;

        const values = [
            key,
            award.awardIdPiid,
            award.modificationNumber,
            award.transactionNumber,
            award.parentAwardIdPiid,
            award.awardee?.name,
            award.awardee?.ueiSAM,
            award.awardee?.cageCode,
            parseFloat(award.totalDollarsObligated || '0'),
            award.dateSigned, // Ensure 'YYYY-MM-DD' or valid date
            award.naicsCode,
            award.pscCode,
            award.awardingAgency?.name,
            JSON.stringify(award)
        ];

        await query(q, values);
        await query('COMMIT');
        return true;
    } catch (err) {
        await query('ROLLBACK');
        console.error('Save Award Failed:', err.message, award.contractAwardUniqueKey);
        return false;
    }
}

export async function saveAwards(awards) {
    let saved = 0;
    for (const award of awards) {
        if (await saveAward(award)) saved++;
    }
    return saved;
}

export default {
    fetchAwards,
    saveAward,
    saveAwards
};
