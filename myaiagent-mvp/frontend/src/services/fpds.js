import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/fpds`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Search for contract awards
 * @param {Object} params - Search parameters
 * @returns {Promise} API response
 */
export const searchContractAwards = async (params) => {
  return api.get('/search/contracts', { params });
};

/**
 * Get contract by PIID
 * @param {string} piid - Procurement Instrument Identifier
 * @returns {Promise} API response
 */
export const getContractByPIID = async (piid) => {
  return api.get(`/contract/${piid}`);
};

/**
 * Get vendor contracts
 * @param {string} uei - Vendor UEI
 * @param {Object} params - Additional filters
 * @returns {Promise} API response
 */
export const getVendorContracts = async (uei, params = {}) => {
  return api.get(`/vendor/${uei}/contracts`, { params });
};

/**
 * Get incumbent analysis
 * @param {string} uei - Vendor UEI
 * @returns {Promise} API response
 */
export const getIncumbentAnalysis = async (uei) => {
  return api.get(`/incumbent/${uei}/analysis`);
};

/**
 * Rebuild incumbent analysis
 * @param {string} uei - Vendor UEI
 * @returns {Promise} API response
 */
export const rebuildIncumbentAnalysis = async (uei) => {
  return api.post(`/incumbent/${uei}/rebuild`);
};

/**
 * Create competitive intelligence
 * @param {Object} data - Intelligence data
 * @returns {Promise} API response
 */
export const createCompetitiveIntelligence = async (data) => {
  return api.post('/competitive-intelligence', data);
};

/**
 * Get competitive intelligence for opportunity
 * @param {string} opportunityId - Opportunity ID
 * @returns {Promise} API response
 */
export const getCompetitiveIntelligence = async (opportunityId) => {
  return api.get(`/competitive-intelligence/${opportunityId}`);
};

export default {
  searchContractAwards,
  getContractByPIID,
  getVendorContracts,
  getIncumbentAnalysis,
  rebuildIncumbentAnalysis,
  createCompetitiveIntelligence,
  getCompetitiveIntelligence,
};
