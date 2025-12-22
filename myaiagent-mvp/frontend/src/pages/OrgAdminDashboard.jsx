import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './OrgAdminDashboard.css';
import AuditLogs from '../components/AuditLogs';
import AddApiKeyModal from '../components/AddApiKeyModal';

const OrgAdminDashboard = () => {
  const { user, currentOrganization } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  // General state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Data state
  const [users, setUsers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);

  // Modal/Form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [rotationKey, setRotationKey] = useState(null);

  // Users Tab specific state
  const [userSearch, setUserSearch] = useState('');
  const [usersTotal, setUsersTotal] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'member'
  });

  // Verify user is org admin
  useEffect(() => {
    if (user && user.org_role !== 'admin' && user.org_role !== 'owner') {
      setError('Access denied. Organization admin access required.');
    }
  }, [user]);

  // Load users
  useEffect(() => {
    if (activeTab === 'users' && currentOrganization) {
      const loadUsers = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await api.org.getUsers(currentOrganization.id, 50, 0, userSearch);
          setUsers(response.data.users || []);
          setUsersTotal(response.data.total || 0);
        } catch (err) {
          console.error('Error loading users:', err);
          setError('Failed to load users');
        } finally {
          setLoading(false);
        }
      };

      const timeoutId = setTimeout(() => {
        loadUsers();
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, currentOrganization, userSearch]);

  const handleUpdateUserRole = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.org.updateUserRole(currentOrganization.id, selectedUser.id, formData.role);
      setSuccessMessage('User role updated successfully');
      setShowEditModal(false);

      // Reload users
      const response = await api.org.getUsers(currentOrganization.id, 50, 0, userSearch);
      setUsers(response.data.users || []);

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user role');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      fullName: user.full_name,
      role: user.role // org role
    });
    setShowEditModal(true);
  };


  // Load API keys
  useEffect(() => {
    if (activeTab === 'api-keys' && currentOrganization) {
      async function loadApiKeys() {
        try {
          setLoading(true);
          setError(null);
          const response = await api.org.getApiKeys(currentOrganization.id);
          setApiKeys(response.data.apiKeys || []);
        } catch (err) {
          console.error('Error loading API keys:', err);
          setError('Failed to load API keys');
        } finally {
          setLoading(false);
        }
      }
      loadApiKeys();
    }
  }, [activeTab, currentOrganization]);

  const handleInviteUser = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.org.inviteUser(currentOrganization.id, {
        email: inviteEmail,
        role: inviteRole
      });
      setSuccessMessage(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);

      // Reload users
      const response = await api.org.getUsers(currentOrganization.id);
      setUsers(response.data.users || []);

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to invite user');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      setError(null);
      await api.org.resetPassword(currentOrganization.id, userId);
      setSuccessMessage('Password reset link sent');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure? This will deactivate the user but preserve all their data.')) {
      try {
        setError(null);
        await api.org.deleteUser(currentOrganization.id, userId);
        setSuccessMessage('User deactivated');

        // Reload users
        const response = await api.org.getUsers(currentOrganization.id);
        setUsers(response.data.users || []);

        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to deactivate user');
      }
    }
  };

  const handleRevokeApiKey = async (keyId) => {
    if (window.confirm('Are you sure you want to revoke this API key? This action cannot be undone and may break integrations using this key.')) {
      try {
        setError(null);
        // api.org.deleteApiKey maps to DELETE /org/:orgId/api-keys/:keyId
        await api.org.deleteApiKey(currentOrganization.id, keyId);
        setSuccessMessage('API key revoked successfully');

        // Reload keys
        const response = await api.org.getApiKeys(currentOrganization.id);
        setApiKeys(response.data.apiKeys || []);

        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (err) {
        console.error('Failed to revoke key:', err);
        setError(err.response?.data?.error || 'Failed to revoke API key');
      }
    }
  };

  if (error && error.includes('Access denied')) {
    return (
      <div className="org-admin-error">
        <h2>Access Denied</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="org-admin-dashboard">
      <div className="org-admin-header">
        <h1>⚙️ Organization Administration</h1>
        <p className="org-admin-subtitle">
          {currentOrganization?.name || 'Organization'} • Admin Controls
        </p>
      </div>

      <div className="org-admin-nav-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`tab ${activeTab === 'api-keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('api-keys')}
        >
          🔑 API Keys
        </button>
        <button
          className={`tab ${activeTab === 'audit-logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit-logs')}
        >
          📜 Audit Logs
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      {successMessage && (
        <div className="org-success-message">{successMessage}</div>
      )}

      {error && activeTab !== 'overview' && (
        <div className="org-error-message">{error}</div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="org-overview">
          <div className="org-info-card">
            <h3>Organization Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Organization Name:</span>
                <span className="value">{currentOrganization?.name}</span>
              </div>
              <div className="info-item">
                <span className="label">Organization Slug:</span>
                <span className="value">{currentOrganization?.slug}</span>
              </div>
              <div className="info-item">
                <span className="label">Your Role:</span>
                <span className="badge role">{user?.org_role?.toUpperCase()}</span>
              </div>
              <div className="info-item">
                <span className="label">Joined:</span>
                <span className="value">{currentOrganization?.joined_at ? new Date(currentOrganization.joined_at).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </div>
          </div>

          <div className="org-admin-guide">
            <h3>Admin Responsibilities</h3>
            <ul>
              <li>👥 Manage organization members (invite, remove, change roles)</li>
              <li>🔑 Create and manage API keys for your organization</li>
              <li>🔄 Rotate API keys when needed</li>
              <li>🔐 Reset passwords for team members</li>
              <li>⚙️ Configure organization settings</li>
            </ul>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="org-users">
          <div className="users-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2>Organization Members</h2>
              <p className="info-text" style={{ marginBottom: 0 }}>Manage access and roles for your organization</p>
            </div>
            <div className="search-box" style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  width: '250px'
                }}
              />
              <button
                className="btn-primary"
                onClick={() => setShowInviteForm(true)}
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
                + Invite User
              </button>
            </div>
          </div>

          {showInviteForm && (
            <div className="modal-overlay" style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}>
              <div className="modal-content" style={{
                backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '500px', maxWidth: '90%'
              }}>
                <h3 style={{ marginTop: 0 }}>Invite User</h3>
                <form onSubmit={handleInviteUser}>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Email Address</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowInviteForm(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#0066cc', color: 'white', cursor: 'pointer' }}>Send Invitation</button>
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
                <h3 style={{ marginTop: 0 }}>Edit User Role: {selectedUser?.full_name}</h3>
                <form onSubmit={handleUpdateUserRole}>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Full Name (Read Only)</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.fullName}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Email (Read Only)</label>
                    <input
                      type="email"
                      readOnly
                      value={formData.email}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                  <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#0066cc', color: 'white', cursor: 'pointer' }}>Update Role</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
            <p className="loading">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="no-data">No users in this organization</p>
          ) : (
            <div className="users-table-container">
              <table className="org-table">
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
                        <span className={`badge role-${user.org_role}`}>
                          {user.org_role?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.is_active ? 'active' : 'inactive'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(user.joined_at || user.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <div>{user.conversation_count || 0} chats</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            className="btn-small"
                            onClick={() => openEditModal(user)}
                            title="Edit Role"
                          >
                            Edit
                          </button>
                          <button
                            className="btn-small"
                            style={{ borderColor: '#d32f2f', color: '#d32f2f' }}
                            onClick={() => handleResetPassword(user.id)}
                            title="Send Password Reset Email"
                          >
                            Reset PWD
                          </button>
                          <button
                            className="btn-small"
                            style={{ borderColor: '#d32f2f', color: '#d32f2f' }}
                            onClick={() => handleDeleteUser(user.id)}
                            title="Remove from Organization"
                          >
                            Remove
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


      {/* API Keys Tab */}
      {
        activeTab === 'api-keys' && (
          <div className="org-api-keys">
            <div className="keys-header">
              <h2>Organization API Keys</h2>
              <button className="btn-primary" onClick={() => setShowNewKeyForm(!showNewKeyForm)}>
                + Add New Key
              </button>
            </div>

            {showNewKeyForm && (
              <AddApiKeyModal
                onClose={() => setShowNewKeyForm(false)}
                onSave={async (data) => {
                  // data is { provider, apiKey, keyLabel }
                  try {
                    // Backend expects: serviceName, keyLabel, keyValue
                    // Map provider -> serviceName, apiKey -> keyValue
                    await api.org.createApiKey(currentOrganization.id, {
                      serviceName: data.provider,
                      keyLabel: data.keyLabel,
                      keyValue: data.apiKey
                    });
                    setShowNewKeyForm(false);

                    // Reload keys immediately
                    const response = await api.org.getApiKeys(currentOrganization.id);
                    setApiKeys(response.data.apiKeys || []);

                    setSuccessMessage('API key created successfully');
                    setTimeout(() => setSuccessMessage(null), 5000);
                  } catch (err) {
                    console.error('Failed to add org key', err);
                    throw err;
                  }
                }}
                providers={[
                  { providerName: 'openai', displayName: 'OpenAI', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png', authType: 'api_key', docsUrl: 'https://platform.openai.com/api-keys' },
                  { providerName: 'gemini', displayName: 'Google Gemini', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg', authType: 'api_key', docsUrl: 'https://makersuite.google.com/app/apikey' },
                  { providerName: 'anthropic', displayName: 'Anthropic', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg', authType: 'api_key', docsUrl: 'https://console.anthropic.com/settings/keys' },
                  { providerName: 'elevenlabs', displayName: 'ElevenLabs', logoUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kKx8_A5pXp7Jc4t4o4q4q4q4q4q4q4q4q4q4q4q4q4q4q4=s900-c-k-c0x00ffffff-no-rj', authType: 'api_key', docsUrl: 'https://elevenlabs.io/app/voice-lab' },
                  { providerName: 'stripe', displayName: 'Stripe', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg', authType: 'api_key', docsUrl: 'https://dashboard.stripe.com/apikeys' },
                  { providerName: 'google', displayName: 'Google Cloud', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg', authType: 'api_key', docsUrl: 'https://console.cloud.google.com/apis/credentials' },
                  { providerName: 'samgov', displayName: 'SAM.gov', logoUrl: 'https://gsa.gov/sites/default/files/styles/576px_wide/public/2021-04/SAM.png', authType: 'api_key', docsUrl: 'https://sam.gov/content/api-key' }
                ]}
              />
            )}

            {rotationKey && (
              <AddApiKeyModal
                initialProvider={rotationKey.serviceName}
                initialLabel={rotationKey.keyLabel}
                onClose={() => setRotationKey(null)}
                onSave={async (data) => {
                  try {
                    await api.org.rotateApiKey(currentOrganization.id, rotationKey.id, data.apiKey); // data.apiKey is the "newKeyValue"
                    setRotationKey(null);

                    // Reload keys immediately
                    const response = await api.org.getApiKeys(currentOrganization.id);
                    setApiKeys(response.data.apiKeys || []);

                    setSuccessMessage('API key rotated successfully');
                    setTimeout(() => setSuccessMessage(null), 5000);
                  } catch (err) {
                    console.error('Failed to rotate org key', err);
                    throw err;
                  }
                }}
                providers={[
                  { providerName: 'openai', displayName: 'OpenAI', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png', authType: 'api_key', docsUrl: 'https://platform.openai.com/api-keys' },
                  { providerName: 'gemini', displayName: 'Google Gemini', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg', authType: 'api_key', docsUrl: 'https://makersuite.google.com/app/apikey' },
                  { providerName: 'anthropic', displayName: 'Anthropic', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg', authType: 'api_key', docsUrl: 'https://console.anthropic.com/settings/keys' },
                  { providerName: 'elevenlabs', displayName: 'ElevenLabs', logoUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kKx8_A5pXp7Jc4t4o4q4q4q4q4q4q4q4q4q4q4q4q4q4q4=s900-c-k-c0x00ffffff-no-rj', authType: 'api_key', docsUrl: 'https://elevenlabs.io/app/voice-lab' },
                  { providerName: 'stripe', displayName: 'Stripe', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg', authType: 'api_key', docsUrl: 'https://dashboard.stripe.com/apikeys' },
                  { providerName: 'google', displayName: 'Google Cloud', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg', authType: 'api_key', docsUrl: 'https://console.cloud.google.com/apis/credentials' },
                  { providerName: 'samgov', displayName: 'SAM.gov', logoUrl: 'https://gsa.gov/sites/default/files/styles/576px_wide/public/2021-04/SAM.png', authType: 'api_key', docsUrl: 'https://sam.gov/content/api-key' }
                ]}
              />
            )}

            {loading ? (
              <p className="loading">Loading API keys...</p>
            ) : apiKeys.length === 0 ? (
              <p className="no-data">No API keys configured for this organization</p>
            ) : (
              <div className="keys-table-container">
                <table className="org-table">
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
                    {apiKeys.map(key => (
                      <tr key={key.id}>
                        <td className="service-name">{key.serviceName || key.service_name}</td>
                        <td>{key.keyLabel || key.key_label}</td>
                        <td>
                          <span className={`badge ${(key.isActive !== undefined ? key.isActive : key.is_active) ? 'active' : 'inactive'}`}>
                            {(key.isActive !== undefined ? key.isActive : key.is_active) ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{new Date(key.createdAt || key.created_at).toLocaleDateString()}</td>
                        <td>
                          {/* <button className="btn-action">View</button> */}
                          <button
                            className="btn-action"
                            onClick={() => setRotationKey(key)}
                            title="Rotate API Key"
                          >
                            Rotate
                          </button>
                          <button
                            className="btn-action btn-danger"
                            onClick={() => handleRevokeApiKey(key.id)}
                            title="Revoke API Key"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      }

      {/* Audit Logs Tab */}
      {
        activeTab === 'audit-logs' && (
          <div className="p-6">
            <AuditLogs orgId={currentOrganization?.id} />
          </div>
        )
      }

      {/* Settings Tab */}
      {
        activeTab === 'settings' && (
          <div className="org-settings">
            <h2>Organization Settings</h2>
            <div className="coming-soon-section">
              <p>Please use the dedicated settings page accessed via the sidebar.</p>
              <a href="/admin/org/settings" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block mt-4">
                Go to Settings
              </a>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default OrgAdminDashboard;
