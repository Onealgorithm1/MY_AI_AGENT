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
  const [companyProfile, setCompanyProfile] = useState(null);
  const [companyMatches, setCompanyMatches] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

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
      // Update role
      await api.org.updateUserRole(currentOrganization.id, selectedUser.id, formData.role);

      // Update status if changed
      if (formData.isActive !== selectedUser.is_active) {
        await api.org.updateUserStatus(currentOrganization.id, selectedUser.id, formData.isActive);
      }

      setSuccessMessage('User updated successfully');
      setShowEditModal(false);

      // Reload users
      const response = await api.org.getUsers(currentOrganization.id, 50, 0, userSearch);
      setUsers(response.data.users || []);

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      fullName: user.full_name,
      role: user.org_role || user.role, // check both just in case
      isActive: user.is_active
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

  // Load Organization Profile & Matches (Shared for Overview and Eligible Opportunities)
  useEffect(() => {
    if ((activeTab === 'overview' || activeTab === 'eligible-opportunities') && currentOrganization) {
      const loadOrgData = async () => {
        try {
          setLoading(true);
          // Fetch profile for Overview
          if (!companyProfile) {
            const profileRes = await api.get('/company/profile');
            setCompanyProfile(profileRes.data.profile);
          }

          // Fetch matches for Eligible Opportunities or Overview stats
          if (activeTab === 'eligible-opportunities' || !companyMatches.length) {
            const matchesRes = await api.get('/company/matched-opportunities?limit=50');
            setCompanyMatches(matchesRes.data.matches || []);
          }

          // Fetch detailed analysis only if needed (e.g. for Overview recommendations)
          if (activeTab === 'overview' && !recommendations.length) {
            try {
              const eligibilityRes = await api.get('/company/eligibility-analysis');
              setRecommendations(eligibilityRes.data.recommendations || []);
            } catch (e) { console.warn("Could not load recommendations", e); }
          }

        } catch (err) {
          console.error('Error loading org data:', err);
          // Don't block the UI with a full page error for this, just log it 
          // as these are enhancements
        } finally {
          setLoading(false);
        }
      };

      loadOrgData();
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

  const handleDeleteApiKey = async (keyId) => {
    if (window.confirm('Are you sure you want to PERMANENTLY DELETE this API key? This cannot be undone.')) {
      try {
        setError(null);
        // Pass params: orgId, keyId, force=true
        // We will update api.js to handle the 3rd argument as a boolean for force delete
        await api.org.deleteApiKey(currentOrganization.id, keyId, true);
        setSuccessMessage('API key deleted successfully');

        // Reload keys
        const response = await api.org.getApiKeys(currentOrganization.id);
        setApiKeys(response.data.apiKeys || []);

        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (err) {
        console.error('Failed to delete key:', err);
        setError(err.response?.data?.error || 'Failed to delete API key');
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
          className={`tab ${activeTab === 'eligible-opportunities' ? 'active' : ''}`}
          onClick={() => setActiveTab('eligible-opportunities')}
        >
          🎯 Eligible Opportunities
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
              {currentOrganization?.description && (
                <div className="info-item full-width">
                  <span className="label">Description:</span>
                  <span className="value">{currentOrganization.description}</span>
                </div>
              )}
              {currentOrganization?.website_url && (
                <div className="info-item">
                  <span className="label">Website:</span>
                  <a href={currentOrganization.website_url} target="_blank" rel="noopener noreferrer" className="value link">
                    {currentOrganization.website_url}
                  </a>
                </div>
              )}
              {currentOrganization?.phone && (
                <div className="info-item">
                  <span className="label">Phone:</span>
                  <span className="value">{currentOrganization.phone}</span>
                </div>
              )}
              {currentOrganization?.address && (
                <div className="info-item full-width">
                  <span className="label">Address:</span>
                  <span className="value address">{currentOrganization.address}</span>
                </div>
              )}
            </div>

            {/* Profile Data Section */}
            <div className="profile-section" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #eee' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Company Profile Data</h4>
              {!companyProfile ? (
                <p style={{ fontSize: '14px', color: '#666' }}>
                  No profile data found. <a href="/company-profile" style={{ color: '#0066cc', textDecoration: 'none' }}>Complete your profile</a> to match more opportunities.
                </p>
              ) : (
                <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#666', textTransform: 'uppercase' }}>NAICS Codes</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {(companyProfile.naicsCodes || companyProfile.naics_codes || []).length > 0 ?
                        (companyProfile.naicsCodes || companyProfile.naics_codes).map((code, i) => (
                          <span key={i} style={{ padding: '2px 8px', backgroundColor: '#f3e8ff', color: '#6b21a8', borderRadius: '4px', fontSize: '12px' }}>{code}</span>
                        )) : <span style={{ color: '#999', fontSize: '12px' }}>None listed</span>}
                    </div>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#666', textTransform: 'uppercase' }}>Certifications</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {Object.entries(companyProfile.certifications || {}).filter(([_, v]) => v).length > 0 ?
                        Object.entries(companyProfile.certifications).filter(([_, v]) => v).map(([k]) => (
                          <span key={k} style={{ padding: '2px 8px', backgroundColor: '#fef9c3', color: '#854d0e', borderRadius: '4px', fontSize: '12px', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                        )) : <span style={{ color: '#999', fontSize: '12px' }}>None listed</span>}
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#666', textTransform: 'uppercase' }}>Core Capabilities</span>
                    <p style={{ fontSize: '14px', color: '#333', marginTop: '4px' }}>
                      {companyProfile.keywords?.join(', ') || companyProfile.core_capabilities?.join(', ') || 'No capabilities listed'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Recommendations Section */}
            {recommendations.length > 0 && (
              <div className="recommendations-section" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #eee' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                  🚧 Missing Requirements (Gaps)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recommendations.slice(0, 3).map((rec, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', padding: '8px', backgroundColor: '#fff7ed', borderRadius: '4px', border: '1px solid #ffedd5' }}>
                      <span style={{ color: '#f97316', marginRight: '8px' }}>•</span>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937', margin: 0 }}>{rec.title}</p>
                        <p style={{ fontSize: '12px', color: '#4b5563', margin: 0 }}>{rec.action || rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <a href="/company-profile" style={{ fontSize: '14px', color: '#0066cc', textDecoration: 'none' }}>View all match recommendations &rarr;</a>
                </div>
              </div>
            )}
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

      {/* Eligible Opportunities Tab */}
      {activeTab === 'eligible-opportunities' && (
        <div className="org-opportunities" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Eligible Opportunities</h2>
              <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>Contracts matched to your company profile</p>
            </div>
            <a href="/samgov" style={{ padding: '8px 16px', backgroundColor: '#0066cc', color: 'white', borderRadius: '4px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
              Browse All Opportunities
            </a>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '32px', color: '#666' }}>Finding matches...</p>
          ) : companyMatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ color: '#6b7280', fontSize: '16px' }}>No eligible opportunities found yet.</p>
              <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>Try updating your company profile with more keywords and NAICS codes.</p>
              <a href="/company-profile" style={{ display: 'inline-block', marginTop: '16px', padding: '8px 16px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '4px', textDecoration: 'none', fontSize: '14px', fontWeight: 500, color: '#374151' }}>Update Profile</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {companyMatches.map((match, i) => (
                <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white', transition: 'box-shadow 0.2s' }} className="hover:shadow-md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                        <a href={`/samgov/${match.id || match.solicitation_number}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>
                          {match.title || match.opportunity_title}
                        </a>
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '14px', color: '#4b5563' }}>
                        <span style={{ fontWeight: 500 }}>{match.agency || match.department}</span>
                        <span>•</span>
                        <span>Due: {match.close_date || match.response_deadline ? new Date(match.close_date || match.response_deadline).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500, backgroundColor: '#dcfce7', color: '#166534' }}>
                        {match.match_score || match.matchScore?.total || 0}% Match
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                    {match.naics_code && <span style={{ padding: '2px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px', color: '#374151' }}>NAICS: {match.naics_code}</span>}
                    {(match.set_aside || match.type_of_set_aside) && <span style={{ padding: '2px 8px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', textTransform: 'capitalize' }}>{match.set_aside || match.type_of_set_aside}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}{/* Users Tab */}
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
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Status</label>
                    <select
                      value={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
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
                        <td style={{ display: 'flex', gap: '8px' }}>
                          {/* <button className="btn-action">View</button> */}
                          <button
                            className="btn-action"
                            onClick={() => setRotationKey(key)}
                            title="Rotate API Key"
                            disabled={!(key.isActive !== undefined ? key.isActive : key.is_active)}
                          >
                            Rotate
                          </button>

                          {(key.isActive !== undefined ? key.isActive : key.is_active) && (
                            <button
                              className="btn-action btn-danger"
                              onClick={() => handleRevokeApiKey(key.id)}
                              title="Revoke API Key (Soft Delete)"
                            >
                              Revoke
                            </button>
                          )}

                          <button
                            className="btn-action btn-danger"
                            style={{ backgroundColor: '#dc3545', border: '1px solid #dc3545', marginLeft: '5px' }}
                            onClick={() => handleDeleteApiKey(key.id)}
                            title="Permanently Delete API Key"
                          >
                            Delete
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
