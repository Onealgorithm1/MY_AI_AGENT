import axios from 'axios';
import { getApiKey } from '../utils/apiKeys.js';

const SAM_API_BASE_URL = 'https://api.sam.gov';

/**
 * Get SAM.gov API key from database or environment
 */
async function getSamApiKey(organizationId = null) {
  try {
    // getApiKey signature: (provider, keyType, organizationId)
    // We pass 'project' as keyType (default)
    const apiKey = await getApiKey('samgov', 'project', organizationId);
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
 * @param {string} userId - User ID for logging/auditing
 * @param {number} organizationId - Organization ID for API key lookup
 * @returns {Promise<Object>} Search results
 */
export async function searchEntities(options = {}, userId = null, organizationId = null) {
  try {
    const apiKey = await getSamApiKey(organizationId);
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
export async function getEntityByUEI(ueiSAM, userId = null, organizationId = null) {
  try {
    const apiKey = await getSamApiKey(organizationId);

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
export async function searchOpportunities(options = {}, userId = null, organizationId = null) {
  try {
    const apiKey = await getSamApiKey(organizationId);
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
      limit: Math.min(limit, 1000), // SAM.gov max is 1000 per request
      offset,
    };

    if (keyword) params.title = keyword;

    // If fetchAll is true, paginate through all results
    if (fetchAll) {
      let allOpportunities = [];
      let currentOffset = 0;
      let totalRecords = 0;
      const pageSize = 1000; // Use max page size for efficiency

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

        // Add delay to respect SAM.gov rate limits (2 second minimum between requests)
        await new Promise(resolve => setTimeout(resolve, 2000));
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
    const errorMessage = error.response?.data?.message || error.message;
    console.error('SAM.gov opportunities search error:', errorMessage);

    // Check for rate limit/throttle errors
    if (errorMessage?.includes('throttled') || errorMessage?.includes('rate') || errorMessage?.includes('Message throttled')) {
      console.error('⚠️  SAM.gov API rate limit hit - please wait before retrying');
      throw new Error(`SAM.gov API rate limited: ${errorMessage}`);
    }

    throw new Error(errorMessage || 'Failed to search opportunities');
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
export async function getExclusions(options = {}, userId = null, organizationId = null) {
  try {
    const apiKey = await getSamApiKey(organizationId);
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
