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
  const [users, setUsers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);

  // Verify user is org admin
  useEffect(() => {
    if (user && user.org_role !== 'admin' && user.org_role !== 'owner') {
      setError('Access denied. Organization admin access required.');
    }
  }, [user]);

  // Load users
  useEffect(() => {
    if (activeTab === 'users' && currentOrganization) {
      async function loadUsers() {
        try {
          setLoading(true);
          setError(null);
          const response = await api.org.getUsers(currentOrganization.id);
          setUsers(response.data.users || []);
        } catch (err) {
          console.error('Error loading users:', err);
          setError('Failed to load users');
        } finally {
          setLoading(false);
        }
      }
      loadUsers();
    }
  }, [activeTab, currentOrganization]);

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
          <div className="users-header">
            <h2>Organization Members</h2>
            <button className="btn-primary" onClick={() => setShowInviteForm(!showInviteForm)}>
              + Invite User
            </button>
          </div>

          {showInviteForm && (
            <form className="invite-form" onSubmit={handleInviteUser}>
              <h3>Invite User to Organization</h3>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit">Send Invitation</button>
                <button type="button" className="btn-cancel" onClick={() => setShowInviteForm(false)}>Cancel</button>
              </div>
            </form>
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
                    <th>Conversations</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="user-name">{user.full_name}</td>
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
                      <td>{new Date(user.joined_at).toLocaleDateString()}</td>
                      <td className="number">{user.conversation_count || 0}</td>
                      <td>
                        <button
                          className="btn-action"
                          onClick={() => handleResetPassword(user.id)}
                          title="Send password reset email"
                        >
                          Reset PWD
                        </button>
                        {user.org_role !== 'owner' && (
                          <button
                            className="btn-action btn-danger"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Deactivate user"
                          >
                            Remove
                          </button>
                        )}
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
                  loadApiKeys();
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
                { providerName: 'google', displayName: 'Google Cloud', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg', authType: 'api_key', docsUrl: 'https://console.cloud.google.com/apis/credentials' }
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
                      <td className="service-name">{key.service_name}</td>
                      <td>{key.key_label}</td>
                      <td>
                        <span className={`badge ${key.is_active ? 'active' : 'inactive'}`}>
                          {key.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(key.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn-action">View</button>
                        <button className="btn-action">Rotate</button>
                        <button className="btn-action btn-danger">Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit-logs' && (
        <div className="p-6">
          <AuditLogs orgId={currentOrganization?.id} />
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="org-settings">
          <h2>Organization Settings</h2>
          <div className="coming-soon-section">
            <p>Please use the dedicated settings page accessed via the sidebar.</p>
            <a href="/admin/org/settings" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block mt-4">
              Go to Settings
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrgAdminDashboard;
