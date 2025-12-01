import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/market-analytics`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Get market analytics dashboard data
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getDashboard = async (params = {}) => {
  return api.get('/dashboard', { params });
};

/**
 * Get agency spending trends
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getAgencySpending = async (params = {}) => {
  return api.get('/agency-spending', { params });
};

/**
 * Get contract value analytics
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getContractValueAnalytics = async (params) => {
  return api.get('/contract-values', { params });
};

/**
 * Get all contract value analytics
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getAllContractAnalytics = async (params = {}) => {
  return api.get('/contract-values/all', { params });
};

/**
 * Get set-aside intelligence
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getSetAsideIntelligence = async (params) => {
  return api.get('/setaside-intelligence', { params });
};

/**
 * Get all set-aside intelligence
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getAllSetAsideIntelligence = async (params = {}) => {
  return api.get('/setaside-intelligence/all', { params });
};

/**
 * Get set-aside comparison
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getSetAsideComparison = async (params = {}) => {
  return api.get('/setaside-comparison', { params });
};

/**
 * Get competitive landscape
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getCompetitiveLandscape = async (params = {}) => {
  return api.get('/competitive-landscape', { params });
};

/**
 * Get market insights
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getInsights = async (params = {}) => {
  return api.get('/insights', { params });
};

/**
 * Create market insight
 * @param {Object} data - Insight data
 * @returns {Promise} API response
 */
export const createInsight = async (data) => {
  return api.post('/insights', data);
};

/**
 * Get trending market data
 * @returns {Promise} API response
 */
export const getTrending = async () => {
  return api.get('/trending');
};

export default {
  getDashboard,
  getAgencySpending,
  getContractValueAnalytics,
  getAllContractAnalytics,
  getSetAsideIntelligence,
  getAllSetAsideIntelligence,
  getSetAsideComparison,
  getCompetitiveLandscape,
  getInsights,
  createInsight,
  getTrending,
};
