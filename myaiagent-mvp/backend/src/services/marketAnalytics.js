import axios from 'axios';
import crypto from 'crypto';
import pool from '../config/database.js';

// External API endpoints
const USASPENDING_API_URL = 'https://api.usaspending.gov/api/v2';
const FPDS_TRENDS_URL = 'https://api.sam.gov/prod/federalaccountingsystem/v1/accounts';

/**
 * Generate cache key from endpoint and parameters
 */
function generateCacheKey(endpoint, params) {
  const data = JSON.stringify({ endpoint, params });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Check cache for API response
 */
async function getCachedResponse(endpoint, params, sourceId) {
  const client = await pool.connect();
  try {
    const cacheKey = generateCacheKey(endpoint, params);
    const query = `
      SELECT * FROM market_api_cache
      WHERE query_hash = $1
      AND expires_at > NOW()
      AND is_valid = true
      ORDER BY cached_at DESC
      LIMIT 1
    `;

    const result = await client.query(query, [cacheKey]);

    if (result.rows.length > 0) {
      // Update hit count and last accessed
      await client.query(
        'UPDATE market_api_cache SET cache_hit_count = cache_hit_count + 1, last_accessed = NOW() WHERE id = $1',
        [result.rows[0].id]
      );

      return result.rows[0].response_data;
    }

    return null;
  } catch (error) {
    console.error('Cache lookup error:', error);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Store API response in cache
 */
async function cacheResponse(endpoint, params, responseData, sourceId, ttlHours = 24) {
  const client = await pool.connect();
  try {
    const cacheKey = generateCacheKey(endpoint, params);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const query = `
      INSERT INTO market_api_cache (
        data_source_id, endpoint, query_parameters, query_hash,
        response_data, response_status, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (query_hash) DO UPDATE SET
        response_data = EXCLUDED.response_data,
        cached_at = NOW(),
        expires_at = EXCLUDED.expires_at,
        cache_hit_count = 0
      RETURNING *;
    `;

    const values = [
      sourceId,
      endpoint,
      JSON.stringify(params),
      cacheKey,
      JSON.stringify(responseData),
      200,
      expiresAt,
    ];

    await client.query(query, values);
  } catch (error) {
    console.error('Cache storage error:', error);
  } finally {
    client.release();
  }
}

/**
 * Get or create market data source
 */
async function getDataSource(sourceName) {
  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM market_data_sources WHERE source_name = $1';
    let result = await client.query(query, [sourceName]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create if doesn't exist
    const endpoints = {
      'USASpending': USASPENDING_API_URL,
      'FPDS': FPDS_TRENDS_URL,
    };

    query = `
      INSERT INTO market_data_sources (
        source_name, source_type, source_url, api_endpoint,
        requires_authentication, is_active, reliability_score, data_freshness_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    result = await client.query(query, [
      sourceName,
      'Government',
      endpoints[sourceName] || '',
      endpoints[sourceName] || '',
      false,
      true,
      95,
      1,
    ]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Fetch agency spending trends from USASpending.gov
 * @param {Object} options - Query options
 * @param {string} options.agencyCode - Agency code (e.g., '097' for DOD)
 * @param {number} options.fiscalYear - Fiscal year
 * @param {number} options.fiscalQuarter - Fiscal quarter (1-4)
 * @returns {Promise<Object>} Agency spending data
 */
export async function fetchAgencySpendingTrends(options = {}) {
  try {
    const { agencyCode, fiscalYear = new Date().getFullYear(), fiscalQuarter } = options;

    const dataSource = await getDataSource('USASpending');

    // Check cache first
    const endpoint = '/search/spending_by_category';
    const params = {
      category: 'agency',
      filters: {
        time_period: [
          {
            start_date: `${fiscalYear}-10-01`,
            end_date: `${fiscalYear + 1}-09-30`,
          },
        ],
      },
    };

    if (agencyCode) {
      params.filters.agencies = [{ type: 'funding', tier: 'toptier', name: agencyCode }];
    }

    const cached = await getCachedResponse(endpoint, params, dataSource.id);
    if (cached) {
      return { success: true, data: cached, cached: true };
    }

    // Fetch from API
    const response = await axios.post(`${USASPENDING_API_URL}${endpoint}`, params, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Cache response
    await cacheResponse(endpoint, params, response.data, dataSource.id, 24);

    return {
      success: true,
      data: response.data,
      cached: false,
    };
  } catch (error) {
    console.error('Agency spending trends error:', error.response?.data || error.message);
    throw new Error('Failed to fetch agency spending trends');
  }
}

/**
 * Store agency spending trends in database
 * @param {Object} trendData - Trend data to store
 * @returns {Promise<Object>} Stored record
 */
export async function storeAgencySpendingTrend(trendData) {
  const client = await pool.connect();
  try {
    const dataSource = await getDataSource('USASpending');

    const query = `
      INSERT INTO agency_spending_trends (
        agency_name, agency_code, sub_agency_name, sub_agency_code,
        fiscal_year, fiscal_quarter, fiscal_month,
        category, subcategory,
        it_software_spending, it_hardware_spending, it_services_spending,
        cloud_spending, cybersecurity_spending,
        total_obligated, total_contracts_count,
        yoy_change_percent, qoq_change_percent,
        small_business_dollars, small_business_percent,
        data_source_id, external_reference_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      ON CONFLICT (agency_code, fiscal_year, fiscal_quarter, category)
      DO UPDATE SET
        total_obligated = EXCLUDED.total_obligated,
        total_contracts_count = EXCLUDED.total_contracts_count,
        yoy_change_percent = EXCLUDED.yoy_change_percent,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      trendData.agencyName,
      trendData.agencyCode,
      trendData.subAgencyName,
      trendData.subAgencyCode,
      trendData.fiscalYear,
      trendData.fiscalQuarter || null,
      trendData.fiscalMonth || null,
      trendData.category || 'IT',
      trendData.subcategory,
      trendData.itSoftwareSpending || 0,
      trendData.itHardwareSpending || 0,
      trendData.itServicesSpending || 0,
      trendData.cloudSpending || 0,
      trendData.cybersecuritySpending || 0,
      trendData.totalObligated,
      trendData.totalContractsCount || 0,
      trendData.yoyChangePercent || null,
      trendData.qoqChangePercent || null,
      trendData.smallBusinessDollars || 0,
      trendData.smallBusinessPercent || 0,
      dataSource.id,
      trendData.externalReferenceId,
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error storing agency spending trend:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate contract value analytics
 * @param {Object} options - Aggregation options
 * @param {string} options.aggregationType - 'by_agency', 'by_naics', 'by_setaside', 'by_psc'
 * @param {string} options.aggregationKey - The value to aggregate by
 * @param {number} options.fiscalYear - Fiscal year
 * @returns {Promise<Object>} Aggregated analytics
 */
export async function calculateContractValueAnalytics(options = {}) {
  const client = await pool.connect();
  try {
    const { aggregationType, aggregationKey, fiscalYear } = options;

    let whereClause = '';
    let groupByField = '';

    switch (aggregationType) {
      case 'by_agency':
        whereClause = 'contracting_agency_id = $1';
        groupByField = 'contracting_agency_id, contracting_agency_name';
        break;
      case 'by_naics':
        whereClause = 'naics_code = $1';
        groupByField = 'naics_code, naics_description';
        break;
      case 'by_setaside':
        whereClause = 'type_of_set_aside = $1';
        groupByField = 'type_of_set_aside';
        break;
      case 'by_psc':
        whereClause = 'psc_code = $1';
        groupByField = 'psc_code, psc_description';
        break;
      default:
        throw new Error('Invalid aggregation type');
    }

    const query = `
      WITH contract_data AS (
        SELECT
          current_contract_value,
          small_business_competitive,
          eight_a_program_participant,
          hubzone_business,
          service_disabled_veteran_owned,
          women_owned_small_business,
          extent_competed,
          type_of_set_aside
        FROM fpds_contract_awards
        WHERE ${whereClause}
        AND EXTRACT(YEAR FROM award_date) = $2
        AND current_contract_value IS NOT NULL
      )
      SELECT
        COUNT(*) as total_contracts,
        SUM(current_contract_value) as total_value,
        AVG(current_contract_value) as average_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY current_contract_value) as median_value,
        MIN(current_contract_value) as min_value,
        MAX(current_contract_value) as max_value,
        COUNT(*) FILTER (WHERE current_contract_value < 100000) as under_100k_count,
        COUNT(*) FILTER (WHERE current_contract_value >= 100000 AND current_contract_value < 1000000) as between_100k_1m_count,
        COUNT(*) FILTER (WHERE current_contract_value >= 1000000 AND current_contract_value < 10000000) as between_1m_10m_count,
        COUNT(*) FILTER (WHERE current_contract_value >= 10000000) as over_10m_count,
        COUNT(*) FILTER (WHERE extent_competed LIKE '%Full%') as competed_contracts,
        SUM(current_contract_value) FILTER (WHERE extent_competed LIKE '%Full%') as competed_value,
        COUNT(*) FILTER (WHERE extent_competed LIKE '%Sole%') as sole_source_contracts,
        SUM(current_contract_value) FILTER (WHERE extent_competed LIKE '%Sole%') as sole_source_value,
        SUM(current_contract_value) FILTER (WHERE small_business_competitive = true) as small_business_value,
        SUM(current_contract_value) FILTER (WHERE eight_a_program_participant = true) as eight_a_value,
        SUM(current_contract_value) FILTER (WHERE hubzone_business = true) as hubzone_value,
        SUM(current_contract_value) FILTER (WHERE service_disabled_veteran_owned = true) as sdvosb_value,
        SUM(current_contract_value) FILTER (WHERE women_owned_small_business = true) as wosb_value,
        SUM(current_contract_value) FILTER (WHERE type_of_set_aside = 'NONE' OR type_of_set_aside IS NULL) as unrestricted_value
      FROM contract_data
    `;

    const result = await client.query(query, [aggregationKey, fiscalYear]);

    if (result.rows.length > 0) {
      const analytics = result.rows[0];

      // Store in database
      const dataSource = await getDataSource('FPDS');
      const insertQuery = `
        INSERT INTO contract_value_analytics (
          aggregation_type, aggregation_key, aggregation_label,
          fiscal_year, total_contracts, total_value, average_value,
          median_value, min_value, max_value,
          under_100k_count, between_100k_1m_count, between_1m_10m_count, over_10m_count,
          competed_contracts, competed_value, sole_source_contracts, sole_source_value,
          small_business_value, eight_a_value, hubzone_value, sdvosb_value, wosb_value, unrestricted_value,
          data_source_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        )
        ON CONFLICT (aggregation_type, aggregation_key, fiscal_year, fiscal_quarter)
        DO UPDATE SET
          total_contracts = EXCLUDED.total_contracts,
          total_value = EXCLUDED.total_value,
          average_value = EXCLUDED.average_value,
          updated_at = NOW()
        RETURNING *;
      `;

      const insertValues = [
        aggregationType,
        aggregationKey,
        aggregationKey, // Will be enhanced with actual label
        fiscalYear,
        analytics.total_contracts,
        analytics.total_value,
        analytics.average_value,
        analytics.median_value,
        analytics.min_value,
        analytics.max_value,
        analytics.under_100k_count,
        analytics.between_100k_1m_count,
        analytics.between_1m_10m_count,
        analytics.over_10m_count,
        analytics.competed_contracts,
        analytics.competed_value,
        analytics.sole_source_contracts,
        analytics.sole_source_value,
        analytics.small_business_value,
        analytics.eight_a_value,
        analytics.hubzone_value,
        analytics.sdvosb_value,
        analytics.wosb_value,
        analytics.unrestricted_value,
        dataSource.id,
      ];

      const stored = await client.query(insertQuery, insertValues);
      return stored.rows[0];
    }

    return null;
  } catch (error) {
    console.error('Error calculating contract value analytics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate set-aside intelligence
 * @param {Object} options - Analysis options
 * @param {string} options.setasideType - Type of set-aside
 * @param {string} options.naicsCode - NAICS code (optional)
 * @param {number} options.fiscalYear - Fiscal year
 * @returns {Promise<Object>} Set-aside intelligence data
 */
export async function calculateSetAsideIntelligence(options = {}) {
  const client = await pool.connect();
  try {
    const { setasideType, naicsCode, fiscalYear } = options;

    const query = `
      WITH setaside_data AS (
        SELECT
          current_contract_value,
          number_of_offers_received,
          small_business_competitive,
          vendor_uei
        FROM fpds_contract_awards
        WHERE type_of_set_aside = $1
        ${naicsCode ? 'AND naics_code = $3' : ''}
        AND EXTRACT(YEAR FROM award_date) = $2
      )
      SELECT
        COUNT(*) as total_awards,
        SUM(current_contract_value) as total_award_value,
        AVG(current_contract_value) as average_award_value,
        AVG(number_of_offers_received) as average_bidders,
        COUNT(DISTINCT vendor_uei) as winners_identified,
        COUNT(*) FILTER (WHERE small_business_competitive = true) as small_business_wins
      FROM setaside_data
    `;

    const params = naicsCode ? [setasideType, fiscalYear, naicsCode] : [setasideType, fiscalYear];
    const result = await client.query(query, params);

    if (result.rows.length > 0) {
      const intel = result.rows[0];

      // Calculate competition intensity
      let competitionIntensity = 'Low';
      if (intel.average_bidders > 5) competitionIntensity = 'Very High';
      else if (intel.average_bidders > 3) competitionIntensity = 'High';
      else if (intel.average_bidders > 2) competitionIntensity = 'Medium';

      // Store in database
      const dataSource = await getDataSource('FPDS');
      const insertQuery = `
        INSERT INTO setaside_intelligence (
          setaside_type, naics_code, fiscal_year,
          total_awards, total_award_value, average_award_value,
          average_bidders, competition_intensity,
          winners_identified, small_business_wins,
          small_business_win_rate, data_source_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (setaside_type, naics_code, fiscal_year, fiscal_quarter)
        DO UPDATE SET
          total_awards = EXCLUDED.total_awards,
          total_award_value = EXCLUDED.total_award_value,
          average_bidders = EXCLUDED.average_bidders,
          updated_at = NOW()
        RETURNING *;
      `;

      const insertValues = [
        setasideType,
        naicsCode || null,
        fiscalYear,
        intel.total_awards,
        intel.total_award_value,
        intel.average_award_value,
        intel.average_bidders,
        competitionIntensity,
        intel.winners_identified,
        intel.small_business_wins,
        intel.total_awards > 0 ? intel.small_business_wins / intel.total_awards : 0,
        dataSource.id,
      ];

      const stored = await client.query(insertQuery, insertValues);
      return stored.rows[0];
    }

    return null;
  } catch (error) {
    console.error('Error calculating set-aside intelligence:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get market analytics dashboard data
 * @param {Object} filters - Dashboard filters
 * @returns {Promise<Object>} Aggregated dashboard data
 */
export async function getMarketDashboardData(filters = {}) {
  const client = await pool.connect();
  try {
    const { fiscalYear = new Date().getFullYear() } = filters;

    // Get top agencies by spending
    const agencyQuery = `
      SELECT * FROM agency_spending_trends
      WHERE fiscal_year = $1
      ORDER BY total_obligated DESC
      LIMIT 10
    `;

    // Get contract value analytics
    const contractQuery = `
      SELECT * FROM contract_value_analytics
      WHERE fiscal_year = $1
      ORDER BY total_value DESC
      LIMIT 20
    `;

    // Get set-aside intelligence
    const setasideQuery = `
      SELECT * FROM setaside_intelligence
      WHERE fiscal_year = $1
      ORDER BY total_award_value DESC
    `;

    const [agencyResult, contractResult, setasideResult] = await Promise.all([
      client.query(agencyQuery, [fiscalYear]),
      client.query(contractQuery, [fiscalYear]),
      client.query(setasideQuery, [fiscalYear]),
    ]);

    return {
      topAgencies: agencyResult.rows,
      contractAnalytics: contractResult.rows,
      setasideIntelligence: setasideResult.rows,
    };
  } catch (error) {
    console.error('Error getting market dashboard data:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default {
  fetchAgencySpendingTrends,
  storeAgencySpendingTrend,
  calculateContractValueAnalytics,
  calculateSetAsideIntelligence,
  getMarketDashboardData,
};
