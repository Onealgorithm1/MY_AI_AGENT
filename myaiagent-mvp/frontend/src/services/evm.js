import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/evm`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Get all EVM projects
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getProjects = async (params = {}) => {
  return api.get('/projects', { params });
};

/**
 * Create EVM project
 * @param {Object} data - Project data
 * @returns {Promise} API response
 */
export const createProject = async (data) => {
  return api.post('/projects', data);
};

/**
 * Get project by ID
 * @param {string} id - Project ID
 * @returns {Promise} API response
 */
export const getProject = async (id) => {
  return api.get(`/projects/${id}`);
};

/**
 * Add reporting period
 * @param {string} projectId - Project ID
 * @param {Object} data - Period data
 * @returns {Promise} API response
 */
export const addReportingPeriod = async (projectId, data) => {
  return api.post(`/projects/${projectId}/periods`, data);
};

/**
 * Get project reporting periods
 * @param {string} projectId - Project ID
 * @returns {Promise} API response
 */
export const getReportingPeriods = async (projectId) => {
  return api.get(`/projects/${projectId}/periods`);
};

/**
 * Get EVM dashboard data
 * @param {string} projectId - Project ID
 * @returns {Promise} API response
 */
export const getDashboard = async (projectId) => {
  return api.get(`/projects/${projectId}/dashboard`);
};

/**
 * Create performance alert
 * @param {string} projectId - Project ID
 * @param {Object} data - Alert data
 * @returns {Promise} API response
 */
export const createAlert = async (projectId, data) => {
  return api.post(`/projects/${projectId}/alerts`, data);
};

/**
 * Update alert status
 * @param {string} alertId - Alert ID
 * @param {Object} data - Update data
 * @returns {Promise} API response
 */
export const updateAlert = async (alertId, data) => {
  return api.put(`/alerts/${alertId}`, data);
};

export default {
  getProjects,
  createProject,
  getProject,
  addReportingPeriod,
  getReportingPeriods,
  getDashboard,
  createAlert,
  updateAlert,
};
