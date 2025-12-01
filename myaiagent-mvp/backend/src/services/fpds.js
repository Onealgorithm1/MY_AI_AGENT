import axios from 'axios';
import pool from '../config/database.js';
import { getApiKey } from '../utils/apiKeys.js';

const FPDS_API_BASE_URL = 'https://api.sam.gov/prod/opportunities/v1/search';
const FPDS_CONTRACT_DATA_URL = 'https://api.sam.gov/prod/federalaccountingsystem/v1/accounts';

/**
 * Get SAM.gov API key (FPDS uses same key as SAM.gov)
 */
async function getFpdsApiKey(userId = null) {
  try {
    const apiKey = await getApiKey('samgov', userId);
    return apiKey;
  } catch (error) {
    console.error('Failed to get FPDS API key:', error);
    throw new Error('FPDS API key not configured');
  }
}

/**
 * Search for contract awards in FPDS
 * @param {Object} options - Search options
 * @param {string} options.piid - Procurement Instrument Identifier
 * @param {string} options.vendorUEI - Vendor UEI
 * @param {string} options.vendorName - Vendor name
 * @param {string} options.agencyCode - Contracting agency code
 * @param {string} options.naicsCode - NAICS code
 * @param {string} options.pscCode - Product/Service Code
 * @param {string} options.awardDateFrom - Award date range start (YYYY-MM-DD)
 * @param {string} options.awardDateTo - Award date range end (YYYY-MM-DD)
 * @param {string} options.setAsideType - Type of set-aside
 * @param {number} options.limit - Number of results (default: 100)
 * @param {number} options.offset - Pagination offset
 * @param {string} userId - User ID for API key lookup
 * @returns {Promise<Object>} Contract award search results
 */
export async function searchContractAwards(options = {}, userId = null) {
  try {
    const apiKey = await getFpdsApiKey(userId);
    const {
      piid,
      vendorUEI,
      vendorName,
      agencyCode,
      naicsCode,
      pscCode,
      awardDateFrom,
      awardDateTo,
      setAsideType,
      limit = 100,
      offset = 0,
    } = options;

    // Build query parameters
    const params = {
      api_key: apiKey,
      limit,
      offset,
    };

    // Add search filters
    if (piid) params.piid = piid;
    if (vendorUEI) params.awardeeUeiSAM = vendorUEI;
    if (vendorName) params.awardeeName = vendorName;
    if (agencyCode) params.contractingAgencyCode = agencyCode;
    if (naicsCode) params.naicsCode = naicsCode;
    if (pscCode) params.productOrServiceCode = pscCode;
    if (awardDateFrom) params.awardDateFrom = awardDateFrom;
    if (awardDateTo) params.awardDateTo = awardDateTo;
    if (setAsideType) params.typeOfSetAside = setAsideType;

    const response = await axios.get(FPDS_API_BASE_URL, {
      params,
      timeout: 60000, // 60 seconds for large data sets
    });

    return {
      success: true,
      data: response.data,
      totalRecords: response.data.totalRecords || 0,
      contracts: response.data.opportunities || [],
    };
  } catch (error) {
    console.error('FPDS search error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to search FPDS contract awards'
    );
  }
}

/**
 * Get detailed contract information by PIID
 * @param {string} piid - Procurement Instrument Identifier
 * @param {string} userId - User ID for API key lookup
 * @returns {Promise<Object>} Contract details
 */
export async function getContractByPIID(piid, userId = null) {
  try {
    const result = await searchContractAwards({ piid, limit: 1 }, userId);

    if (result.contracts && result.contracts.length > 0) {
      return {
        success: true,
        contract: result.contracts[0],
      };
    }

    return {
      success: false,
      message: 'Contract not found',
    };
  } catch (error) {
    console.error('FPDS get contract error:', error);
    throw error;
  }
}

/**
 * Get contracts by vendor UEI (for incumbent analysis)
 * @param {string} vendorUEI - Vendor UEI
 * @param {Object} options - Additional filters
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Vendor's contract history
 */
export async function getVendorContracts(vendorUEI, options = {}, userId = null) {
  try {
    const result = await searchContractAwards(
      {
        vendorUEI,
        ...options,
        limit: options.limit || 100,
      },
      userId
    );

    return {
      success: true,
      vendorUEI,
      totalContracts: result.totalRecords,
      contracts: result.contracts,
    };
  } catch (error) {
    console.error('FPDS vendor contracts error:', error);
    throw error;
  }
}

/**
 * Store contract award in database
 * @param {Object} contractData - Contract data from FPDS API
 * @returns {Promise<Object>} Stored contract record
 */
export async function storeContractAward(contractData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO fpds_contract_awards (
        piid, modification_number, reference_idv_piid, award_id_piid,
        contract_award_unique_key, award_date, signed_date, effective_date,
        current_completion_date, ultimate_completion_date,
        base_and_exercised_options_value, base_and_all_options_value,
        current_contract_value, potential_total_value, dollars_obligated,
        contract_type, pricing_type, award_type, idv_type,
        vendor_name, vendor_duns, vendor_uei, vendor_cage_code,
        vendor_location_city, vendor_location_state, vendor_location_country,
        small_business_competitive, emerging_small_business, women_owned_small_business,
        service_disabled_veteran_owned, hubzone_business, eight_a_program_participant,
        contracting_agency_name, contracting_agency_id, contracting_office_name,
        funding_agency_name, naics_code, naics_description, psc_code, psc_description,
        description_of_requirement, extent_competed, solicitation_procedures,
        type_of_set_aside, number_of_offers_received,
        performance_based_service_acquisition, pop_country, pop_state, pop_city,
        fpds_last_modified, data_source
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45, $46, $47, $48, $49, $50
      )
      ON CONFLICT (piid, modification_number)
      DO UPDATE SET
        current_contract_value = EXCLUDED.current_contract_value,
        dollars_obligated = EXCLUDED.dollars_obligated,
        current_completion_date = EXCLUDED.current_completion_date,
        fpds_last_modified = EXCLUDED.fpds_last_modified,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      contractData.piid,
      contractData.modificationNumber || '0',
      contractData.referencedIDVPIID,
      contractData.awardIdPiid,
      contractData.contractAwardUniqueKey,
      contractData.awardDate,
      contractData.signedDate,
      contractData.effectiveDate,
      contractData.currentCompletionDate,
      contractData.ultimateCompletionDate,
      contractData.baseAndExercisedOptionsValue,
      contractData.baseAndAllOptionsValue,
      contractData.currentContractValue,
      contractData.potentialTotalValueOfAward,
      contractData.dollarObligated,
      contractData.typeOfContractPricing,
      contractData.pricingType,
      contractData.awardType,
      contractData.idvType,
      contractData.vendorName,
      contractData.vendorDunsNumber,
      contractData.vendorUeiSAM,
      contractData.vendorCageCode,
      contractData.vendorLocationCity,
      contractData.vendorLocationState,
      contractData.vendorLocationCountry,
      contractData.smallBusinessCompetitiveFlag === 'Y',
      contractData.emergingSmallBusinessFlag === 'Y',
      contractData.womenOwnedSmallBusinessFlag === 'Y',
      contractData.serviceDisabledVeteranOwnedBusinessFlag === 'Y',
      contractData.hubZoneFlag === 'Y',
      contractData.eightAFlag === 'Y',
      contractData.contractingAgencyName,
      contractData.contractingAgencyCode,
      contractData.contractingOfficeName,
      contractData.fundingAgencyName,
      contractData.naicsCode,
      contractData.naicsDescription,
      contractData.productOrServiceCode,
      contractData.pscDescription,
      contractData.descriptionOfContractRequirement,
      contractData.extentCompeted,
      contractData.solicitationProcedures,
      contractData.typeOfSetAside,
      contractData.numberOfOffersReceived,
      contractData.performanceBasedServiceAcquisition,
      contractData.placeOfPerformanceCountry,
      contractData.placeOfPerformanceState,
      contractData.placeOfPerformanceCity,
      contractData.lastModifiedDate || new Date(),
      'FPDS',
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error storing contract award:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Build incumbent analysis for a vendor
 * @param {string} vendorUEI - Vendor UEI
 * @returns {Promise<Object>} Incumbent analysis
 */
export async function buildIncumbentAnalysis(vendorUEI) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO incumbent_analysis (
        vendor_uei, vendor_name, vendor_duns, vendor_cage_code,
        total_contracts_won, total_contract_value, average_contract_value,
        primary_agencies, agency_count,
        primary_naics_codes, primary_psc_codes,
        small_business_contracts, eight_a_contracts, hubzone_contracts,
        wosb_contracts, sdvosb_contracts, unrestricted_contracts,
        first_contract_date, latest_contract_date, active_years,
        avg_competitors_faced, total_modifications, avg_modifications_per_contract,
        total_modification_value, data_completeness_score
      )
      SELECT
        vendor_uei,
        MAX(vendor_name) as vendor_name,
        MAX(vendor_duns) as vendor_duns,
        MAX(vendor_cage_code) as vendor_cage_code,
        COUNT(*) as total_contracts_won,
        SUM(COALESCE(current_contract_value, 0)) as total_contract_value,
        AVG(COALESCE(current_contract_value, 0)) as average_contract_value,
        jsonb_agg(DISTINCT jsonb_build_object('agency', contracting_agency_name, 'code', contracting_agency_id))
          FILTER (WHERE contracting_agency_name IS NOT NULL) as primary_agencies,
        COUNT(DISTINCT contracting_agency_id) as agency_count,
        jsonb_agg(DISTINCT jsonb_build_object('code', naics_code, 'description', naics_description))
          FILTER (WHERE naics_code IS NOT NULL) as primary_naics_codes,
        jsonb_agg(DISTINCT jsonb_build_object('code', psc_code, 'description', psc_description))
          FILTER (WHERE psc_code IS NOT NULL) as primary_psc_codes,
        COUNT(*) FILTER (WHERE small_business_competitive = true) as small_business_contracts,
        COUNT(*) FILTER (WHERE eight_a_program_participant = true) as eight_a_contracts,
        COUNT(*) FILTER (WHERE hubzone_business = true) as hubzone_contracts,
        COUNT(*) FILTER (WHERE women_owned_small_business = true) as wosb_contracts,
        COUNT(*) FILTER (WHERE service_disabled_veteran_owned = true) as sdvosb_contracts,
        COUNT(*) FILTER (WHERE type_of_set_aside = 'NONE' OR type_of_set_aside IS NULL) as unrestricted_contracts,
        MIN(award_date) as first_contract_date,
        MAX(award_date) as latest_contract_date,
        EXTRACT(YEAR FROM AGE(MAX(award_date), MIN(award_date))) as active_years,
        AVG(COALESCE(number_of_offers_received, 0)) as avg_competitors_faced,
        (SELECT COUNT(*) FROM fpds_contract_modifications m
         WHERE m.contract_award_id IN (SELECT id FROM fpds_contract_awards WHERE vendor_uei = $1)) as total_modifications,
        (SELECT COUNT(*) FROM fpds_contract_modifications m
         WHERE m.contract_award_id IN (SELECT id FROM fpds_contract_awards WHERE vendor_uei = $1))::DECIMAL /
         NULLIF(COUNT(*), 0) as avg_modifications_per_contract,
        (SELECT SUM(COALESCE(change_in_dollars_obligated, 0)) FROM fpds_contract_modifications m
         WHERE m.contract_award_id IN (SELECT id FROM fpds_contract_awards WHERE vendor_uei = $1)) as total_modification_value,
        85 as data_completeness_score
      FROM fpds_contract_awards
      WHERE vendor_uei = $1
      GROUP BY vendor_uei
      ON CONFLICT (vendor_uei)
      DO UPDATE SET
        total_contracts_won = EXCLUDED.total_contracts_won,
        total_contract_value = EXCLUDED.total_contract_value,
        average_contract_value = EXCLUDED.average_contract_value,
        primary_agencies = EXCLUDED.primary_agencies,
        agency_count = EXCLUDED.agency_count,
        primary_naics_codes = EXCLUDED.primary_naics_codes,
        primary_psc_codes = EXCLUDED.primary_psc_codes,
        small_business_contracts = EXCLUDED.small_business_contracts,
        eight_a_contracts = EXCLUDED.eight_a_contracts,
        hubzone_contracts = EXCLUDED.hubzone_contracts,
        wosb_contracts = EXCLUDED.wosb_contracts,
        sdvosb_contracts = EXCLUDED.sdvosb_contracts,
        unrestricted_contracts = EXCLUDED.unrestricted_contracts,
        first_contract_date = EXCLUDED.first_contract_date,
        latest_contract_date = EXCLUDED.latest_contract_date,
        active_years = EXCLUDED.active_years,
        avg_competitors_faced = EXCLUDED.avg_competitors_faced,
        total_modifications = EXCLUDED.total_modifications,
        avg_modifications_per_contract = EXCLUDED.avg_modifications_per_contract,
        total_modification_value = EXCLUDED.total_modification_value,
        last_analyzed = NOW(),
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await client.query(query, [vendorUEI]);
    return result.rows[0];
  } catch (error) {
    console.error('Error building incumbent analysis:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get incumbent analysis by vendor UEI
 * @param {string} vendorUEI - Vendor UEI
 * @returns {Promise<Object>} Incumbent analysis data
 */
export async function getIncumbentAnalysis(vendorUEI) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM incumbent_analysis WHERE vendor_uei = $1';
    const result = await client.query(query, [vendorUEI]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // If not found, build it
    return await buildIncumbentAnalysis(vendorUEI);
  } catch (error) {
    console.error('Error getting incumbent analysis:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Link incumbent to opportunity
 * @param {string} opportunityId - Opportunity ID
 * @param {string} noticeId - Notice ID
 * @param {string} incumbentUEI - Incumbent vendor UEI
 * @param {Object} additionalData - Additional competitive intelligence data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Competitive intelligence record
 */
export async function linkIncumbentToOpportunity(
  opportunityId,
  noticeId,
  incumbentUEI,
  additionalData = {},
  userId
) {
  const client = await pool.connect();
  try {
    // Get incumbent analysis
    const incumbent = await getIncumbentAnalysis(incumbentUEI);

    const query = `
      INSERT INTO competitive_intelligence (
        opportunity_id, notice_id,
        incumbent_vendor_uei, incumbent_vendor_name,
        incumbent_contract_piid, incumbent_contract_value,
        recompete, incumbent_years_held, previous_modifications,
        estimated_bidders, market_saturation_level,
        win_probability, strategic_importance,
        recommended_action, confidence_score,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (opportunity_id) DO UPDATE SET
        incumbent_vendor_uei = EXCLUDED.incumbent_vendor_uei,
        incumbent_vendor_name = EXCLUDED.incumbent_vendor_name,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      opportunityId,
      noticeId,
      incumbentUEI,
      incumbent.vendor_name,
      additionalData.contractPIID || null,
      incumbent.average_contract_value,
      additionalData.recompete || true,
      incumbent.active_years || 0,
      incumbent.total_modifications || 0,
      additionalData.estimatedBidders || Math.ceil(incumbent.avg_competitors_faced || 3),
      additionalData.marketSaturation || 'Medium',
      additionalData.winProbability || 0.5,
      additionalData.strategicImportance || 5,
      additionalData.recommendedAction || 'Bid',
      additionalData.confidenceScore || 70,
      userId,
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error linking incumbent to opportunity:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default {
  searchContractAwards,
  getContractByPIID,
  getVendorContracts,
  storeContractAward,
  buildIncumbentAnalysis,
  getIncumbentAnalysis,
  linkIncumbentToOpportunity,
};
