import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with credentials
const api = axios.create({
  baseURL: `${API_BASE_URL}/sam-gov`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Search for entities in SAM.gov
 * @param {Object} params - Search parameters
 * @param {string} params.ueiSAM - Unique Entity Identifier
 * @param {string} params.legalBusinessName - Legal business name
 * @param {string} params.dbaName - Doing Business As name
 * @param {string} params.cageCode - CAGE code
 * @param {number} params.limit - Number of results
 * @param {number} params.offset - Pagination offset
 * @returns {Promise} API response
 */
export const searchEntities = async (params) => {
  return api.post('/search/entities', params);
};

/**
 * Get entity details by UEI
 * @param {string} uei - Unique Entity Identifier
 * @returns {Promise} API response
 */
export const getEntityByUEI = async (uei) => {
  return api.get(`/entity/${uei}`);
};

/**
 * Search for federal contract opportunities
 * @param {Object} params - Search parameters
 * @param {string} params.keyword - Search keyword
 * @param {string} params.postedFrom - Posted from date (YYYY-MM-DD)
 * @param {string} params.postedTo - Posted to date (YYYY-MM-DD)
 * @param {number} params.limit - Number of results
 * @param {number} params.offset - Pagination offset
 * @returns {Promise} API response
 */
export const searchOpportunities = async (params) => {
  return api.post('/search/opportunities', params);
};

/**
 * Get exclusions (debarred entities)
 * @param {Object} params - Search parameters
 * @param {string} params.name - Entity name
 * @param {string} params.ueiSAM - UEI SAM
 * @param {string} params.cageCode - CAGE code
 * @param {number} params.limit - Number of results
 * @returns {Promise} API response
 */
export const getExclusions = async (params) => {
  return api.post('/exclusions', params);
};

export default {
  searchEntities,
  getEntityByUEI,
  searchOpportunities,
  getExclusions,
};
