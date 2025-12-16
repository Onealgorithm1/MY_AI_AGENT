import axios from 'axios';

// Determine API base URL based on current hostname
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // If on werkules.com production domain, use relative path
    if (hostname === 'werkules.com' || (hostname.includes('werkules') && !hostname.includes('fly.dev'))) {
      console.log('🎯 Detected werkules.com - using /api');
      return '/api';
    }

    // If on fly.dev or Builder.io preview, use full VITE_API_URL
    if (hostname.includes('fly.dev') ||
        hostname.includes('builder.io') ||
        hostname.includes('projects.builder.codes') ||
        hostname.includes('projects.builder.my')) {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://werkules.com/api';
      console.log('🎯 Detected preview domain - using full API URL:', apiUrl);
      return apiUrl;
    }
  }

  // Development: check environment variable first
  if (import.meta.env.VITE_API_URL) {
    console.log('🔧 Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // Development fallback - use relative path (proxied through Vite to werkules.com)
  console.log('🔧 Using relative /api path (proxied to werkules.com)');
  return '/api';
};

// Get base URL or force /api for production
let API_BASE_URL = getApiBaseUrl();

// FAILSAFE: If somehow empty or undefined, force /api for production
if (!API_BASE_URL || API_BASE_URL === '') {
  console.warn('⚠️ API_BASE_URL was empty, forcing /api');
  API_BASE_URL = '/api';
}

// Debug logging
console.log('🔧 API Configuration:', {
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
  apiBaseURL: API_BASE_URL,
  mode: import.meta.env.MODE,
  viteApiUrl: import.meta.env.VITE_API_URL
});

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
      
      // Don't logout on TTS errors (ElevenLabs quota exceeded returns 401)
      const isTTSError = error.config?.url?.includes('/tts/');
      
      if (!isAuthPage && !isLoginAttempt && !isTTSError) {
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
  getWebSocketToken: () =>
    api.get('/auth/ws-token'),
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
    // Use streaming endpoint for faster TTS by splitting into sentences
    try {
      const response = await api.post('/tts/synthesize-stream',
        { text, voiceId },
        { responseType: 'text' }
      );

      // Parse newline-delimited JSON response
      const lines = response.data.trim().split('\n');
      const audioChunks = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        const chunk = JSON.parse(line);
        if (chunk.error) {
          throw new Error(chunk.error);
        }

        if (chunk.audioData) {
          // Convert base64 to binary
          const binaryString = atob(chunk.audioData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          audioChunks.push(bytes);
        }
      }

      // Combine all chunks into a single blob
      const combinedBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
      return combinedBlob;

    } catch (error) {
      console.warn('Streaming TTS failed, falling back to regular synthesis:', error.message);

      // Fallback to regular synthesis if streaming fails
      const response = await api.post('/tts/synthesize',
        { text, voiceId },
        { responseType: 'blob' }
      );
      return response.data;
    }
  },
};

// STT endpoints
export const stt = {
  transcribe: async (audioBlob, languageCode = 'en-US') => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('languageCode', languageCode);
    
    const response = await api.post('/stt/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.transcript;
  },
};

// Web Search endpoints
export const webSearch = {
  search: async (query, numResults = 5) => {
    const response = await api.post('/tools/web-search', {
      query,
      numResults,
    });
    return response.data;
  },
};

// SAM.gov endpoints
export const samGov = {
  // Search for entities
  searchEntities: async (params) => {
    const response = await api.post('/sam-gov/search/entities', params);
    return response.data;
  },

  // Get entity by UEI
  getEntity: async (uei) => {
    const response = await api.get(`/sam-gov/entity/${uei}`);
    return response.data;
  },

  // Search opportunities with automatic caching
  searchOpportunities: async (params) => {
    const response = await api.post('/sam-gov/search/opportunities', params);
    return response.data;
  },

  // Get exclusions
  getExclusions: async (params) => {
    const response = await api.post('/sam-gov/exclusions', params);
    return response.data;
  },

  // Get cached opportunity by notice ID
  getCachedOpportunity: async (noticeId) => {
    const response = await api.get(`/sam-gov/cache/${noticeId}`);
    return response.data;
  },

  // Get recent search history
  getSearchHistory: async (limit = 10) => {
    const response = await api.get(`/sam-gov/search-history?limit=${limit}`);
    return response.data;
  },

  // Get cached opportunities
  getCachedOpportunities: async (params = {}) => {
    const { limit = 20, offset = 0, keyword, type, status } = params;
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);
    if (keyword) queryParams.append('keyword', keyword);
    if (type) queryParams.append('type', type);
    if (status) queryParams.append('status', status);

    const response = await api.get(`/sam-gov/cached-opportunities?${queryParams.toString()}`);
    return response.data;
  },

  // Batch fetch all opportunities from SAM.gov
  batchFetchAll: async (params = {}) => {
    const response = await api.post('/sam-gov/batch-fetch-all', params);
    return response.data;
  },

  // Get list of departments from cached opportunities
  getDepartments: async () => {
    const response = await api.get('/sam-gov/departments');
    return response.data;
  },
};

// AI Agents endpoints
export const aiAgents = {
  // Get configured services with available models
  getConfiguredServices: () =>
    api.get('/ai-agents/configured-services'),

  // Get user's connected AI agents
  getMyAgents: () =>
    api.get('/ai-agents/my-agents'),

  // Get available AI providers (auto-detected based on configured API keys)
  getAvailableProviders: () =>
    api.get('/ai-agents/available-providers'),

  // Get all AI providers (unfiltered)
  getAllProviders: () =>
    api.get('/ai-agents/providers'),

  // Get specific provider details
  getProvider: (providerName) =>
    api.get(`/ai-agents/providers/${providerName}`),

  // Connect a new AI agent
  connectAgent: (data) =>
    api.post('/ai-agents/my-agents', data),

  // Update an AI agent
  updateAgent: (agentId, data) =>
    api.put(`/ai-agents/my-agents/${agentId}`, data),

  // Delete an AI agent
  deleteAgent: (agentId) =>
    api.delete(`/ai-agents/my-agents/${agentId}`),

  // Set an agent as default
  setDefaultAgent: (agentId) =>
    api.post(`/ai-agents/my-agents/${agentId}/set-default`),

  // Test an agent's connectivity
  testAgent: (agentId) =>
    api.post(`/ai-agents/my-agents/${agentId}/test`),
};

// Organizations endpoints
export const organizations = {
  // List user's organizations
  list: () =>
    api.get('/organizations'),

  // Get organization details
  get: (orgId) =>
    api.get(`/organizations/${orgId}`),

  // Create new organization
  create: (data) =>
    api.post('/organizations', data),

  // Update organization
  update: (orgId, data) =>
    api.put(`/organizations/${orgId}`, data),

  // Get organization users
  getUsers: (orgId) =>
    api.get(`/organizations/${orgId}/users`),

  // Invite user to organization
  inviteUser: (orgId, data) =>
    api.post(`/organizations/${orgId}/invitations`, data),

  // Get invitations for organization
  getInvitations: (orgId) =>
    api.get(`/organizations/${orgId}/invitations`),

  // Revoke invitation
  revokeInvitation: (orgId, invitationId) =>
    api.delete(`/organizations/${orgId}/invitations/${invitationId}`),

  // Accept invitation
  acceptInvitation: (token) =>
    api.post(`/organizations/invitations/${token}/accept`),

  // Deactivate user in organization
  deactivateUser: (orgId, userId) =>
    api.put(`/organizations/${orgId}/users/${userId}/deactivate`),

  // Activate user in organization
  activateUser: (orgId, userId) =>
    api.put(`/organizations/${orgId}/users/${userId}/activate`),

  // Update user role in organization
  updateUserRole: (orgId, userId, role) =>
    api.put(`/organizations/${orgId}/users/${userId}/role`, { role }),

  // Remove user from organization
  removeUser: (orgId, userId) =>
    api.delete(`/organizations/${orgId}/users/${userId}`),

  // Request password reset
  requestPasswordReset: (email) =>
    api.post('/organizations/password-reset/request', { email }),

  // Reset password with token
  resetPassword: (token, password) =>
    api.post(`/organizations/password-reset/${token}`, { password }),

  // Get organization API keys
  getApiKeys: (orgId) =>
    api.get(`/organizations/${orgId}/api-keys`),

  // Create organization API key
  createApiKey: (orgId, data) =>
    api.post(`/organizations/${orgId}/api-keys`, data),

  // Revoke organization API key
  revokeApiKey: (orgId, keyId) =>
    api.delete(`/organizations/${orgId}/api-keys/${keyId}`),

  // Rotate organization API key
  rotateApiKey: (orgId, keyId, newKeyValue) =>
    api.post(`/organizations/${orgId}/api-keys/${keyId}/rotate`, { newKeyValue }),
};

// Admin Organizations endpoints (for system admins only)
export const adminOrganizations = {
  // Get all organizations
  list: (isActive, limit = 50, offset = 0) =>
    api.get('/admin/organizations', { params: { isActive, limit, offset } }),

  // Get organization details with stats
  get: (orgId) =>
    api.get(`/admin/organizations/${orgId}`),

  // Get organization users (admin view)
  getUsers: (orgId) =>
    api.get(`/admin/organizations/${orgId}/users`),

  // Deactivate organization
  deactivate: (orgId) =>
    api.put(`/admin/organizations/${orgId}/deactivate`),

  // Activate organization
  activate: (orgId) =>
    api.put(`/admin/organizations/${orgId}/activate`),

  // Get admin statistics
  getStatistics: () =>
    api.get('/admin/organizations/stats/overview'),
};

// Export both default and named export for flexibility
export { api };
export default api;
