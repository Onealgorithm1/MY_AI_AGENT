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
 * @param {number} options.limit - Number of results (default: 50, max: 100)
 * @param {number} options.offset - Pagination offset
 * @param {boolean} options.fetchAll - If true, fetches all available results using pagination
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
      limit = 50,
      offset = 0,
      fetchAll = false,
    } = options;

    // SAM.gov requires postedFrom and postedTo - use defaults if not provided
    // Default: last 30 days
    // Format: MM/dd/yyyy (SAM.gov requirement)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`; // MM/dd/yyyy
    };

    const defaultPostedTo = formatDate(today);
    const defaultPostedFrom = formatDate(thirtyDaysAgo);

    const params = {
      api_key: apiKey,
      postedFrom: postedFrom || defaultPostedFrom,
      postedTo: postedTo || defaultPostedTo,
      limit: Math.min(limit, 100), // SAM.gov max is 100 per request
      offset,
    };

    if (keyword) params.title = keyword;

    // If fetchAll is true, paginate through all results
    if (fetchAll) {
      let allOpportunities = [];
      let currentOffset = 0;
      let totalRecords = 0;
      const pageSize = 100; // Use max page size for efficiency

      do {
        const pageParams = { ...params, limit: pageSize, offset: currentOffset };
        const response = await axios.get(`${SAM_API_BASE_URL}/opportunities/v2/search`, {
          params: pageParams,
          timeout: 30000,
        });

        const opportunities = response.data.opportunitiesData || [];
        allOpportunities = allOpportunities.concat(opportunities);
        totalRecords = response.data.totalRecords || 0;
        currentOffset += pageSize;

        // Stop if we've fetched all records or if no more results
        if (allOpportunities.length >= totalRecords || opportunities.length === 0) {
          break;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } while (true);

      return {
        success: true,
        data: { totalRecords, opportunitiesData: allOpportunities },
        totalRecords,
        opportunities: allOpportunities,
      };
    }

    // Regular single-page request
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
