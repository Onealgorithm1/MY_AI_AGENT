import { query } from '../utils/database.js';
import * as fpds from './fpds.js';

/**
 * Award Service
 * Handles interaction with FPDS contract awards and vendor performance metrics
 */
export const awardService = {
    /**
     * Search for awards based on criteria
     * @param {Object} filters - Search filters
     * @returns {Object} - List of awards and total count
     */
    async searchAwards(filters = {}) {
        const {
            keyword,
            agency,
            minValue,
            maxValue,
            startDate,
            endDate,
            naicsCode,
            limit = 20,
            offset = 0,
            sortBy = 'award_date',
            sortOrder = 'DESC'
        } = filters;

        let queryText = `
      SELECT id, piid, modification_number, vendor_name, vendor_uei, 
             contracting_agency_name, award_date, current_contract_value, 
             description_of_requirement, naics_code, naics_description
      FROM fpds_contract_awards
      WHERE 1=1
    `;

        const queryParams = [];
        let paramIndex = 1;

        if (keyword) {
            queryText += ` AND (
        vendor_name ILIKE $${paramIndex} OR 
        description_of_requirement ILIKE $${paramIndex} OR 
        piid ILIKE $${paramIndex} OR
        naics_description ILIKE $${paramIndex}
      )`;
            queryParams.push(`%${keyword}%`);
            paramIndex++;
        }

        if (agency) {
            queryText += ` AND contracting_agency_name ILIKE $${paramIndex}`;
            queryParams.push(`%${agency}%`);
            paramIndex++;
        }

        if (minValue) {
            queryText += ` AND current_contract_value >= $${paramIndex}`;
            queryParams.push(minValue);
            paramIndex++;
        }

        if (maxValue) {
            queryText += ` AND current_contract_value <= $${paramIndex}`;
            queryParams.push(maxValue);
            paramIndex++;
        }

        if (startDate) {
            queryText += ` AND award_date >= $${paramIndex}`;
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            queryText += ` AND award_date <= $${paramIndex}`;
            queryParams.push(endDate);
            paramIndex++;
        }

        if (naicsCode) {
            queryText += ` AND naics_code = $${paramIndex}`;
            queryParams.push(naicsCode);
            paramIndex++;
        }

        // Add sorting
        const allowedSortFields = ['award_date', 'current_contract_value', 'vendor_name', 'contracting_agency_name'];
        const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'award_date';
        const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        queryText += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

        // Add pagination
        queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        const result = await query(queryText, queryParams);

        // Get total count
        const countParams = queryParams.slice(0, queryParams.length - 2); // Remove limit/offset
        let countQuery = `SELECT COUNT(*) as total FROM fpds_contract_awards WHERE 1=1`;
        let countWhere = '';
        let countIndex = 1;

        if (keyword) { countWhere += ` AND (vendor_name ILIKE $${countIndex} OR description_of_requirement ILIKE $${countIndex} OR piid ILIKE $${countIndex} OR naics_description ILIKE $${countIndex})`; countIndex++; }
        if (agency) { countWhere += ` AND contracting_agency_name ILIKE $${countIndex}`; countIndex++; }
        if (minValue) { countWhere += ` AND current_contract_value >= $${countIndex}`; countIndex++; }
        if (maxValue) { countWhere += ` AND current_contract_value <= $${countIndex}`; countIndex++; }
        if (startDate) { countWhere += ` AND award_date >= $${countIndex}`; countIndex++; }
        if (endDate) { countWhere += ` AND award_date <= $${countIndex}`; countIndex++; }
        if (naicsCode) { countWhere += ` AND naics_code = $${countIndex}`; countIndex++; }

        const countResult = await query(countQuery + countWhere, countParams);

        return {
            awards: result.rows,
            total: parseInt(countResult.rows[0]?.total || 0)
        };
    },

    /**
     * Get vendor performance summary
     * @param {string} uei - Vendor UEI
     * @returns {Object} - Performance metrics
     */
    async getVendorPerformance(uei) {
        if (!uei) return null;

        const statsQuery = `
      SELECT 
        COUNT(*) as total_awards,
        SUM(current_contract_value) as total_value,
        AVG(current_contract_value) as average_value,
        COUNT(DISTINCT contracting_agency_name) as distinct_agencies,
        MIN(award_date) as first_award_date,
        MAX(award_date) as last_award_date
      FROM fpds_contract_awards
      WHERE vendor_uei = $1
    `;

        const agencyBreakdownQuery = `
      SELECT contracting_agency_name, COUNT(*) as award_count, SUM(current_contract_value) as value
      FROM fpds_contract_awards
      WHERE vendor_uei = $1
      GROUP BY contracting_agency_name
      ORDER BY value DESC
      LIMIT 10
    `;

        const [statsResult, agencyResult] = await Promise.all([
            query(statsQuery, [uei]),
            query(agencyBreakdownQuery, [uei])
        ]);

        return {
            summary: statsResult.rows[0],
            agency_breakdown: agencyResult.rows
        };
    },

    /**
     * Get historical awards for a specific vendor
     * @param {string} uei - Vendor UEI
     * @param {Object} pagination - Limit and offset
     * @returns {Object} - List of awards
     */
    async getVendorAwards(uei, pagination = {}) {
        if (!uei) return { awards: [], total: 0 };

        const { limit = 20, offset = 0 } = pagination;

        const queryText = `
      SELECT id, piid, modification_number, contracting_agency_name, 
             award_date, current_contract_value, description_of_requirement
      FROM fpds_contract_awards
      WHERE vendor_uei = $1
      ORDER BY award_date DESC
      LIMIT $2 OFFSET $3
    `;

        const countQuery = `SELECT COUNT(*) as total FROM fpds_contract_awards WHERE vendor_uei = $1`;

        const [result, countResult] = await Promise.all([
            query(queryText, [uei, limit, offset]),
            query(countQuery, [uei])
        ]);

        return {
            awards: result.rows,
            total: parseInt(countResult.rows[0]?.total || 0)
        };
    },

    /**
     * Get a single award by ID or PIID
     * @param {string|number} id - Award ID or PIID
     * @returns {Object} - Award details
     */
    async getAward(id) {
        // 1. Try generic ID lookup (assuming integer ID)
        if (!isNaN(id)) {
            const queryText = `SELECT * FROM fpds_contract_awards WHERE id = $1`;
            const result = await query(queryText, [id]);
            if (result.rows[0]) return result.rows[0];
        }

        // 2. Try PIID lookup in local DB
        const piidQuery = `SELECT * FROM fpds_contract_awards WHERE piid = $1 ORDER BY modification_number DESC LIMIT 1`;
        const piidResult = await query(piidQuery, [id]); // 'id' here is treated as the PIID string
        if (piidResult.rows[0]) return piidResult.rows[0];

        // 3. Fallback: Fetch from FPDS API
        try {
            console.log(`Award not found locally for '${id}'. Attempting fetch from FPDS API...`);
            const apiResult = await fpds.getContractByPIID(id);

            if (apiResult.success && apiResult.contract) {
                // Store/Cache the result for future local lookups
                console.log(`Award found in FPDS API. Caching to local DB...`);
                // The API result structure matches what we expect for storage
                const storedContract = await fpds.storeContractAward(apiResult.contract);
                return storedContract;
            }
        } catch (err) {
            console.error('Error fetching/storing award from FPDS:', err);
        }

        return null;
    },

    /**
     * Export awards to CSV format
     * @param {Object} filters - Search filters
     * @returns {string} - CSV string
     */
    async exportAwardsCSV(filters = {}) {
        // Re-use search logic but without pagination (or with large limit)
        // For export, we likely want ALL matching records, but let's cap at 1000 for safety unless specified
        const exportFilters = { ...filters, limit: 1000, offset: 0 };

        // We can call searchAwards, but we might want specific columns for CSV
        // Let's reuse searchAwards for now as it selects key columns
        const result = await this.searchAwards(exportFilters);

        if (!result.awards || result.awards.length === 0) {
            return '';
        }

        // Define headers
        const headers = [
            'PIID',
            'Modification Number',
            'Vendor Name',
            'Vendor UEI',
            'Agency',
            'Award Date',
            'Contract Value',
            'Description',
            'NAICS Code',
            'NAICS Description'
        ];

        // Helper to escape CSV fields
        const escapeCsv = (field) => {
            if (field === null || field === undefined) return '';
            const stringField = String(field);
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        // Build CSV
        const csvRows = [headers.join(',')];

        for (const award of result.awards) {
            const row = [
                award.piid,
                award.modification_number,
                award.vendor_name,
                award.vendor_uei,
                award.contracting_agency_name,
                award.award_date ? new Date(award.award_date).toISOString().split('T')[0] : '',
                award.current_contract_value,
                award.description_of_requirement,
                award.naics_code,
                award.naics_description
            ].map(escapeCsv);

            csvRows.push(row.join(','));
        }

        return csvRows.join('\n');
    }
};
