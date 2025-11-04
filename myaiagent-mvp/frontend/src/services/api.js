import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// CSRF token storage
let csrfToken = null;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // SECURITY: Enable credentials (cookies) to be sent with requests
  withCredentials: true,
});

// Function to fetch and set CSRF token
export const fetchCsrfToken = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/csrf-token`, {
      withCredentials: true,
    });
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
};

// Function to get current CSRF token (for use in fetch() requests)
export const getCsrfToken = () => csrfToken;

// Request interceptor - add CSRF token to state-changing requests
api.interceptors.request.use(
  (config) => {
    // Add CSRF token to POST, PUT, PATCH, DELETE requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
        console.log('✅ CSRF token added to request:', config.method, config.url);
      } else {
        console.error('❌ CSRF token missing for state-changing request:', config.method, config.url);
        console.error('   Please refresh the page to fetch CSRF token');
      }
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and CSRF token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // CSRF token invalid/missing - fetch new token and retry
    if (error.response?.status === 403 && error.response?.data?.code === 'EBADCSRFTOKEN') {
      console.log('🔄 CSRF token invalid, fetching new token...');
      await fetchCsrfToken();
      console.log('✅ New CSRF token fetched, retrying request...');
      // Retry the original request with new token
      const config = error.config;
      config.headers['X-CSRF-Token'] = csrfToken;
      // Prevent infinite retry loop
      if (config.__isRetry) {
        console.error('❌ CSRF retry failed twice, giving up');
        return Promise.reject(error);
      }
      config.__isRetry = true;
      return api(config);
    }
    
    // Unauthorized - JWT invalid/expired
    if (error.response?.status === 401) {
      // Don't redirect if already on login/signup pages or if this is a login attempt
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
      const isLoginAttempt = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/signup');
      
      if (!isAuthPage && !isLoginAttempt) {
        // Clear all auth-related storage
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        
        // Force a full redirect to login (this will clear all state)
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const auth = {
  signup: (email, password, fullName) =>
    api.post('/auth/signup', { email, password, fullName }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  me: () =>
    api.get('/auth/me'),
  updateSettings: (settings, preferences) =>
    api.put('/auth/settings', { settings, preferences }),
  logout: () =>
    api.post('/auth/logout'),
  getProfile: () =>
    api.get('/auth/profile'),
  updateProfile: (fullName, email, phone) =>
    api.put('/auth/profile', { fullName, email, phone }),
  updateProfileImage: (profileImage) =>
    api.put('/auth/profile/image', { profileImage }),
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    return api.post('/auth/profile/upload-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/profile/password', { currentPassword, newPassword }),
  getPreferences: () =>
    api.get('/auth/preferences'),
  updatePreferences: (preferences) =>
    api.put('/auth/preferences', { preferences }),
  resetPreferences: () =>
    api.delete('/auth/preferences'),
};

// Conversation endpoints
export const conversations = {
  list: (limit = 20, offset = 0) =>
    api.get('/conversations', { params: { limit, offset } }),
  get: (id) =>
    api.get(`/conversations/${id}`),
  create: (title, model) =>
    api.post('/conversations', { title, model }),
  update: (id, data) =>
    api.put(`/conversations/${id}`, data),
  delete: (id) =>
    api.delete(`/conversations/${id}`),
  getMessages: (id, limit = 50, offset = 0) =>
    api.get(`/conversations/${id}/messages`, { params: { limit, offset } }),
  analytics: (id) =>
    api.get(`/conversations/${id}/analytics`),
};

// Message endpoints
export const messages = {
  send: (conversationId, content, model, stream = false) =>
    api.post('/messages', { conversationId, content, model, stream }),
  get: (id) =>
    api.get(`/messages/${id}`),
  delete: (id) =>
    api.delete(`/messages/${id}`),
};

// Memory endpoints
export const memory = {
  list: (category, approved) =>
    api.get('/memory', { params: { category, approved } }),
  add: (fact, category) =>
    api.post('/memory', { fact, category }),
  extract: (conversationId) =>
    api.post(`/memory/extract/${conversationId}`),
  update: (id, data) =>
    api.put(`/memory/${id}`, data),
  delete: (id) =>
    api.delete(`/memory/${id}`),
  clear: () =>
    api.delete('/memory'),
  categories: () =>
    api.get('/memory/categories'),
};

// Attachment endpoints
export const attachments = {
  upload: (file, conversationId, messageId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) formData.append('conversationId', conversationId);
    if (messageId) formData.append('messageId', messageId);
    
    return api.post('/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  get: (id) =>
    api.get(`/attachments/${id}`, { responseType: 'blob' }),
  delete: (id) =>
    api.delete(`/attachments/${id}`),
  listByConversation: (conversationId) =>
    api.get(`/attachments/conversation/${conversationId}`),
};

// Feedback endpoints
export const feedback = {
  submit: (data) =>
    api.post('/feedback', data),
  list: (limit = 50, offset = 0) =>
    api.get('/feedback', { params: { limit, offset } }),
  getByMessage: (messageId) =>
    api.get(`/feedback/message/${messageId}`),
  delete: (id) =>
    api.delete(`/feedback/${id}`),
};

// Admin endpoints
export const admin = {
  stats: () =>
    api.get('/admin/stats'),
  users: (limit, offset, search) =>
    api.get('/admin/users', { params: { limit, offset, search } }),
  getUser: (id) =>
    api.get(`/admin/users/${id}`),
  updateUser: (id, data) =>
    api.put(`/admin/users/${id}`, data),
  errors: (limit, resolved) =>
    api.get('/admin/errors', { params: { limit, resolved } }),
  resolveError: (id) =>
    api.put(`/admin/errors/${id}/resolve`),
  performance: (hours) =>
    api.get('/admin/performance', { params: { hours } }),
  health: () =>
    api.get('/admin/health'),
  apiKeys: () =>
    api.get('/admin/api-keys'),
};

// Secrets endpoints
export const secrets = {
  definitions: () =>
    api.get('/secrets/definitions'),
  list: () =>
    api.get('/secrets'),
  get: (id) =>
    api.get(`/secrets/${id}`),
  save: (data) =>
    api.post('/secrets', data),
  toggle: (id) =>
    api.put(`/secrets/${id}/toggle`),
  delete: (id) =>
    api.delete(`/secrets/${id}`),
  deleteCategory: (serviceName) =>
    api.delete(`/secrets/category/${encodeURIComponent(serviceName)}`),
  test: (id) =>
    api.post(`/secrets/${id}/test`),
  setDefault: (id) =>
    api.put(`/secrets/${id}/set-default`),
  updateCategoryMetadata: (serviceName, data) =>
    api.patch(`/secrets/category/${encodeURIComponent(serviceName)}/metadata`, data),
  updateKeyMetadata: (id, data) =>
    api.patch(`/secrets/${id}/metadata`, data),
};

// TTS endpoints
export const tts = {
  getVoices: () => api.get('/tts/voices'),
  
  synthesize: async (text, voiceId) => {
    const response = await api.post('/tts/synthesize', 
      { text, voiceId },
      { responseType: 'blob' }
    );
    return response.data;
  },
};

export default api;
