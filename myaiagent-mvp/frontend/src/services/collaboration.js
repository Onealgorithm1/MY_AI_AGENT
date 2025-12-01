import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/collaboration`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Workspace APIs
export const getWorkspaces = async (params = {}) => {
  return api.get('/workspaces', { params });
};

export const createWorkspace = async (data) => {
  return api.post('/workspaces', data);
};

export const getWorkspace = async (id) => {
  return api.get(`/workspaces/${id}`);
};

export const addTeamMember = async (workspaceId, data) => {
  return api.post(`/workspaces/${workspaceId}/team`, data);
};

export const createSection = async (workspaceId, data) => {
  return api.post(`/workspaces/${workspaceId}/sections`, data);
};

export const updateSection = async (sectionId, data) => {
  return api.put(`/sections/${sectionId}`, data);
};

// Checklist APIs
export const createChecklist = async (workspaceId, data) => {
  return api.post(`/workspaces/${workspaceId}/checklists`, data);
};

export const getChecklist = async (checklistId) => {
  return api.get(`/checklists/${checklistId}`);
};

export const addChecklistItem = async (checklistId, data) => {
  return api.post(`/checklists/${checklistId}/items`, data);
};

export const updateChecklistItem = async (itemId, data) => {
  return api.put(`/checklist-items/${itemId}`, data);
};

// Deadline APIs
export const createDeadline = async (workspaceId, data) => {
  return api.post(`/workspaces/${workspaceId}/deadlines`, data);
};

export const getDeadlines = async (workspaceId) => {
  return api.get(`/workspaces/${workspaceId}/deadlines`);
};

export default {
  getWorkspaces,
  createWorkspace,
  getWorkspace,
  addTeamMember,
  createSection,
  updateSection,
  createChecklist,
  getChecklist,
  addChecklistItem,
  updateChecklistItem,
  createDeadline,
  getDeadlines,
};
