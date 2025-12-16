import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import './AdminDashboard.css';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [organizations, setOrganizations] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Load API keys
  useEffect(() => {
    if (activeTab === 'api-keys') {
      async function loadApiKeys() {
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
      }
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

      {error && activeTab !== 'overview' && (
        <div className="admin-error-message">{error}</div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="admin-overview">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.organizations?.total || 0}</div>
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
          <h2>System API Keys (Audit View)</h2>
          {loading ? (
            <p className="loading">Loading API keys...</p>
          ) : apiKeys.length === 0 ? (
            <p className="no-data">No API keys configured</p>
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
                  {apiKeys.map(key => (
                    <tr key={key.id}>
                      <td className="service-name">{key.service_name}</td>
                      <td>{key.key_label}</td>
                      <td className="org-cell">
                        {key.org_name ? (
                          <>
                            <span className="org-badge">Org</span>
                            {key.org_name}
                          </>
                        ) : (
                          <span className="system-badge">System</span>
                        )}
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

              <div className="key-stats">
                <p>
                  <strong>System Keys:</strong> {apiKeys.filter(k => !k.organization_id).length}
                </p>
                <p>
                  <strong>Organization Keys:</strong> {apiKeys.filter(k => k.organization_id).length}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="admin-users">
          <h2>All Users</h2>
          <p className="info-text">View and manage users across all organizations</p>
          <div className="coming-soon">Coming soon - User management interface</div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
