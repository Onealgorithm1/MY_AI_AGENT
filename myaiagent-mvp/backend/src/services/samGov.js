import axios from 'axios';
import { getApiKey } from '../utils/apiKeys.js';

const SAM_API_BASE_URL = 'https://api.sam.gov';

/**
 * Get SAM.gov API key from database or environment
 */
async function getSamApiKey(userId = null) {
  try {
    const apiKey = await getApiKey('samgov', userId);
    return apiKey;
  } catch (error) {
    console.error('Failed to get SAM.gov API key:', error);
    throw new Error('SAM.gov API key not configured');
  }
}

/**
 * Search for entities in SAM.gov
 * @param {Object} options - Search options
 * @param {string} options.ueiSAM - Unique Entity Identifier (UEI) SAM
 * @param {string} options.legalBusinessName - Legal business name
 * @param {string} options.dbaName - Doing Business As name
 * @param {string} options.cageCode - CAGE code
 * @param {number} options.limit - Number of results (default: 10, max: 100)
 * @param {number} options.offset - Pagination offset
 * @param {string} userId - User ID for API key lookup
 * @returns {Promise<Object>} Search results
 */
export async function searchEntities(options = {}, userId = null) {
  try {
    const apiKey = await getSamApiKey(userId);
    const {
      ueiSAM,
      legalBusinessName,
      dbaName,
      cageCode,
      limit = 10,
      offset = 0,
    } = options;

    const params = {
      api_key: apiKey,
    };

    // Add search criteria
    if (ueiSAM) params.ueiSAM = ueiSAM;
    if (legalBusinessName) params.legalBusinessName = legalBusinessName;
    if (dbaName) params.dbaName = dbaName;
    if (cageCode) params.cageCode = cageCode;

    const response = await axios.get(`${SAM_API_BASE_URL}/entity-information/v3/entities`, {
      params,
      timeout: 30000,
    });

    return {
      success: true,
      data: response.data,
      totalRecords: response.data.totalRecords || 0,
      entities: response.data.entityData || [],
    };
  } catch (error) {
    console.error('SAM.gov search error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to search SAM.gov entities'
    );
  }
}

/**
 * Get entity details by UEI
 * @param {string} ueiSAM - Unique Entity Identifier
 * @param {string} userId - User ID for API key lookup
 * @returns {Promise<Object>} Entity details
 */
export async function getEntityByUEI(ueiSAM, userId = null) {
  try {
    const apiKey = await getSamApiKey(userId);

    const response = await axios.get(`${SAM_API_BASE_URL}/entity-information/v3/entities`, {
      params: {
        api_key: apiKey,
        ueiSAM,
        includeSections: 'entityRegistration,coreData,assertions,repsAndCerts,pointsOfContact',
      },
      timeout: 30000,
    });

    if (response.data.entityData && response.data.entityData.length > 0) {
      return {
        success: true,
        entity: response.data.entityData[0],
      };
    }

    return {
      success: false,
      message: 'Entity not found',
    };
  } catch (error) {
    console.error('SAM.gov get entity error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to get entity details'
    );
  }
}

/**
 * Search federal opportunities (contract opportunities)
 * @param {Object} options - Search options
 * @param {string} options.keyword - Keyword search
 * @param {string} options.postedFrom - Posted from date (YYYY-MM-DD)
 * @param {string} options.postedTo - Posted to date (YYYY-MM-DD)
 * @param {number} options.limit - Number of results
 * @param {number} options.offset - Pagination offset
 * @param {string} userId - User ID for API key lookup
 * @returns {Promise<Object>} Opportunities
 */
export async function searchOpportunities(options = {}, userId = null) {
  try {
    const apiKey = await getSamApiKey(userId);
    const {
      keyword,
      postedFrom,
      postedTo,
      limit = 10,
      offset = 0,
    } = options;

    const params = {
      api_key: apiKey,
    };

    if (keyword) params.q = keyword;
    if (postedFrom) params.postedFrom = postedFrom;
    if (postedTo) params.postedTo = postedTo;

    const response = await axios.get(`${SAM_API_BASE_URL}/opportunities/v2/search`, {
      params,
      timeout: 30000,
    });

    return {
      success: true,
      data: response.data,
      totalRecords: response.data.totalRecords || 0,
      opportunities: response.data.opportunitiesData || [],
    };
  } catch (error) {
    console.error('SAM.gov opportunities search error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to search opportunities'
    );
  }
}

/**
 * Get exclusions (debarred entities)
 * @param {Object} options - Search options
 * @param {string} options.name - Entity name
 * @param {string} options.ueiSAM - UEI SAM
 * @param {string} options.cageCode - CAGE code
 * @param {number} options.limit - Number of results
 * @param {string} userId - User ID for API key lookup
 * @returns {Promise<Object>} Exclusions
 */
export async function getExclusions(options = {}, userId = null) {
  try {
    const apiKey = await getSamApiKey(userId);
    const { name, ueiSAM, cageCode, limit = 10 } = options;

    const params = {
      api_key: apiKey,
    };

    if (name) params.name = name;
    if (ueiSAM) params.ueiSAM = ueiSAM;
    if (cageCode) params.cageCode = cageCode;

    const response = await axios.get(`${SAM_API_BASE_URL}/entity-information/v3/exclusions`, {
      params,
      timeout: 30000,
    });

    return {
      success: true,
      data: response.data,
      exclusions: response.data.exclusionDetails || [],
    };
  } catch (error) {
    console.error('SAM.gov exclusions error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to get exclusions'
    );
  }
}

export default {
  searchEntities,
  getEntityByUEI,
  searchOpportunities,
  getExclusions,
};
