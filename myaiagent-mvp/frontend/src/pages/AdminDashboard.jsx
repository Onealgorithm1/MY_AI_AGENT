import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminDashboard.css';
import AddApiKeyModal from '../components/AddApiKeyModal';

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [organizations, setOrganizations] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // User Management State
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersTotal, setUsersTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'user',
    password: ''
  });
  const [passwordData, setPasswordData] = useState('');
  const [apiKeyData, setApiKeyData] = useState({
    provider: 'openai',
    apiKey: ''
  });


  // Verify user is master admin
  useEffect(() => {
    if (user && user.role !== 'master_admin') {
      setError('Access denied. Master admin access required.');
    }
  }, [user]);

  // Load stats
  useEffect(() => {
    async function loadStats() {
      try {
        const response = await api.admin.getStats();
        setStats(response.data);
      } catch (err) {
        console.error('Error loading stats:', err);
        setError('Failed to load statistics');
      }
    }

    loadStats();
  }, []);

  // Load organizations
  useEffect(() => {
    if (activeTab === 'organizations') {
      async function loadOrganizations() {
        try {
          setLoading(true);
          const response = await api.admin.getOrganizations();
          setOrganizations(response.data.organizations || []);
        } catch (err) {
          console.error('Error loading organizations:', err);
          setError('Failed to load organizations');
        } finally {
          setLoading(false);
        }
      }
      loadOrganizations();
    }
  }, [activeTab]);

  // Load users
  const loadUsers = async () => {
    if (activeTab === 'users') {
      try {
        setLoading(true);
        const response = await api.admin.users(50, 0, userSearch);
        setUsers(response.data.users || []);
        setUsersTotal(response.data.total || 0);
      } catch (err) {
        console.error('Error loading users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [activeTab, userSearch]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.admin.createUser(formData);
      setSuccessMessage('User created successfully');
      setShowCreateModal(false);
      setFormData({ email: '', fullName: '', role: 'user', password: '' });
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.admin.updateUser(selectedUser.id, {
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role
      });
      setSuccessMessage('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.admin.resetUserPassword(selectedUser.id, passwordData);
      setSuccessMessage('Password updated successfully');
      setShowPasswordModal(false);
      setPasswordData('');
      setSelectedUser(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getApiKeys();
      setApiKeys(response.data.apiKeys || []);
    } catch (err) {
      console.error('Error loading API keys:', err);
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSystemKey = async (data) => {
    // data is { provider, apiKey, keyLabel }
    try {
      setError(null);
      await api.admin.createApiKey(data);
      setSuccessMessage('System API Key added successfully');
      setShowAddKeyModal(false);
      setApiKeyData({ provider: 'openai', apiKey: '' });
      loadApiKeys(); // Reload keys
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Add System Key Error:', err);
      setError(err.response?.data?.error || 'Failed to add API key');
      throw err; // Re-throw so modal knows it failed
    }
  };


  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      password: '' // Password not editable here
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordData('');
    setShowPasswordModal(true);
  };

  // Load API keys
  useEffect(() => {
    if (activeTab === 'api-keys') {
      loadApiKeys();
    }
  }, [activeTab]);


  if (error && error.includes('Access denied')) {
    return (
      <div className="admin-error">
        <h2>Access Denied</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🔐 System Administrator Dashboard</h1>
        <p className="admin-subtitle">Master Admin - Full System Control</p>
      </div>

      <div className="admin-nav-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab ${activeTab === 'organizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('organizations')}
        >
          🏢 Organizations
        </button>
        <button
          className={`tab ${activeTab === 'api-keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('api-keys')}
        >
          🔑 API Keys
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
      </div>

      {successMessage && (
        <div className="admin-success-message" style={{
          padding: '12px 16px',
          background: '#e8f5e9',
          border: '1px solid #c8e6c9',
          borderRadius: '6px',
          color: '#2e7d32',
          marginBottom: '20px'
        }}>{successMessage}</div>
      )}

      {error && activeTab !== 'overview' && (
        <div className="admin-error-message">{error}</div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="admin-overview">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{organizations.length || 0}</div>
              <div className="stat-label">Organizations</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.users?.total || 0}</div>
              <div className="stat-label">Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.conversations?.total || 0}</div>
              <div className="stat-label">Conversations</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.messages?.total || 0}</div>
              <div className="stat-label">Messages</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.apiKeys?.total || 0}</div>
              <div className="stat-label">API Keys (Active)</div>
            </div>
          </div>

          <div className="overview-info">
            <h3>Master Admin Responsibilities</h3>
            <ul>
              <li>👁️ Monitor all organizations and users</li>
              <li>🔑 Audit all API keys system-wide</li>
              <li>⚙️ Manage system settings and configurations</li>
              <li>🚨 Handle critical system issues</li>
              <li>📈 View system-wide analytics</li>
            </ul>
          </div>
        </div>
      )}

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="admin-organizations">
          <h2>All Organizations</h2>
          {loading ? (
            <p className="loading">Loading organizations...</p>
          ) : organizations.length === 0 ? (
            <p className="no-data">No organizations found</p>
          ) : (
            <div className="orgs-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Users</th>
                    <th>Conversations</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map(org => (
                    <tr key={org.id}>
                      <td className="org-name">{org.name}</td>
                      <td>{org.slug}</td>
                      <td className="number">{org.user_count || 0}</td>
                      <td className="number">{org.conversation_count || 0}</td>
                      <td>
                        <span className={`badge ${org.is_active ? 'active' : 'inactive'}`}>
                          {org.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(org.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn-small">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="admin-api-keys">
          <h2>System API Keys</h2>
          <p className="info-text">These keys are used as defaults for the entire system.</p>

          {loading ? (
            <p className="loading">Loading API keys...</p>
          ) : (
            <>
              {/* System Keys Section */}
              <div className="keys-section mb-6">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3>System Default Keys</h3>
                  <button className="btn-primary" onClick={() => setShowAddKeyModal(true)}>
                    Add System Key
                  </button>
                </div>
                {apiKeys.filter(k => !k.organization_id).length === 0 ? (
                  <p className="no-data">No system keys configured</p>
                ) : (
                  <div className="keys-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Label</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.filter(k => !k.organization_id).map(key => (
                          <tr key={key.id}>
                            <td className="service-name">{key.service_name}</td>
                            <td>{key.key_label}</td>
                            <td>
                              <span className={`badge ${key.is_active ? 'active' : 'inactive'}`}>
                                {key.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>{new Date(key.created_at).toLocaleDateString()}</td>
                            <td>
                              <button className="btn-small">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <h2 className="mt-8">Organization API Keys</h2>
              <p className="info-text">Keys configured by organizations for their own specific usage.</p>

              {/* Organization Keys Section */}
              <div className="keys-section">
                {apiKeys.filter(k => k.organization_id).length === 0 ? (
                  <p className="no-data">No organization keys found</p>
                ) : (
                  <div className="keys-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Label</th>
                          <th>Organization</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.filter(k => k.organization_id).map(key => (
                          <tr key={key.id}>
                            <td className="service-name">{key.service_name}</td>
                            <td>{key.key_label}</td>
                            <td className="org-cell">
                              <span className="org-badge">Org</span>
                              {key.org_name}
                            </td>
                            <td>
                              <span className={`badge ${key.is_active ? 'active' : 'inactive'}`}>
                                {key.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>{new Date(key.created_at).toLocaleDateString()}</td>
                            <td>
                              <button className="btn-small">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="admin-users">
          <div className="users-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2>All Users</h2>
              <p className="info-text" style={{ marginBottom: 0 }}>View and manage users across all organizations</p>
            </div>
            <div className="search-box" style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  width: '300px'
                }}
              />
              <button
                className="btn-primary"
                onClick={() => {
                  setFormData({ email: '', fullName: '', role: 'user', password: '' });
                  setShowCreateModal(true);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                + Add User
              </button>
            </div>
          </div>

          {showCreateModal && (
            <div className="modal-overlay" style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}>
              <div className="modal-content" style={{
                backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '500px', maxWidth: '90%'
              }}>
                <h3 style={{ marginTop: 0 }}>Create New User</h3>
                <form onSubmit={handleCreateUser}>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
                    <input
                      type="password"
                      required
                      minLength="6"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                  <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#0066cc', color: 'white', cursor: 'pointer' }}>Create User</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEditModal && (
            <div className="modal-overlay" style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}>
              <div className="modal-content" style={{
                backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '500px', maxWidth: '90%'
              }}>
                <h3 style={{ marginTop: 0 }}>Edit User: {selectedUser?.full_name}</h3>
                <form onSubmit={handleUpdateUser}>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                  <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#0066cc', color: 'white', cursor: 'pointer' }}>Update User</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showPasswordModal && (
            <div className="modal-overlay" style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}>
              <div className="modal-content" style={{
                backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%'
              }}>
                <h3 style={{ marginTop: 0 }}>Reset Password</h3>
                <p style={{ fontSize: '14px', color: '#666' }}>For user: {selectedUser?.email}</p>
                <form onSubmit={handleResetPassword}>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>New Password</label>
                    <input
                      type="password"
                      required
                      minLength="6"
                      value={passwordData}
                      onChange={(e) => setPasswordData(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowPasswordModal(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#d32f2f', color: 'white', cursor: 'pointer' }}>Reset Password</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
            <p className="loading">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="no-data">No users found</p>
          ) : (
            <div className="users-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Stats</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="user-name">
                        <div style={{ fontWeight: 500 }}>{user.full_name}</div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge role-${user.role}`}>
                          {user.role?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.is_active ? 'active' : 'inactive'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <div>{user.conversation_count || 0} chats</div>
                          <div>{user.message_count || 0} msgs</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            className="btn-small"
                            onClick={() => openEditModal(user)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-small"
                            style={{ borderColor: '#d32f2f', color: '#d32f2f' }}
                            onClick={() => openPasswordModal(user)}
                          >
                            Reset PWD
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination-info" style={{ marginTop: '20px', textAlign: 'right', color: '#666', fontSize: '14px' }}>
                Showing {users.length} of {usersTotal} users
              </div>
            </div>
          )}
        </div>
      )}
      {/* Add System API Key Modal (Polished) */}
      {showAddKeyModal && (
        <AddApiKeyModal
          onClose={() => setShowAddKeyModal(false)}
          onSave={handleAddSystemKey}
          providers={[
            { providerName: 'openai', displayName: 'OpenAI', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png', authType: 'api_key', docsUrl: 'https://platform.openai.com/api-keys' },
            { providerName: 'gemini', displayName: 'Google Gemini', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg', authType: 'api_key', docsUrl: 'https://makersuite.google.com/app/apikey' },
            { providerName: 'anthropic', displayName: 'Anthropic', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg', authType: 'api_key', docsUrl: 'https://console.anthropic.com/settings/keys' },
            { providerName: 'elevenlabs', displayName: 'ElevenLabs', logoUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kKx8_A5pXp7Jc4t4o4q4q4q4q4q4q4q4q4q4q4q4q4q4q4=s900-c-k-c0x00ffffff-no-rj', authType: 'api_key', docsUrl: 'https://elevenlabs.io/app/voice-lab' },
            { providerName: 'stripe', displayName: 'Stripe', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg', authType: 'api_key', docsUrl: 'https://dashboard.stripe.com/apikeys' },
            { providerName: 'google', displayName: 'Google Cloud', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg', authType: 'api_key', docsUrl: 'https://console.cloud.google.com/apis/credentials' }
          ]}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
