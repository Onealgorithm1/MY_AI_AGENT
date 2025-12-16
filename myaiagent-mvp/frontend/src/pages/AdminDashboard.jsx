import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminOrganizations, admin } from '../services/api';
import {
  Building2,
  Users,
  MessageSquare,
  Key,
  Search,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showApiKeys, setShowApiKeys] = useState(false);

  // Fetch organizations list
  const { data: orgsData, isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ['adminOrganizations', searchQuery],
    queryFn: () => adminOrganizations.list('true', 100, 0),
    staleTime: 30000,
  });

  // Fetch system statistics
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => admin.stats(),
    staleTime: 60000,
  });

  // Fetch API keys
  const { data: apiKeysData, isLoading: apiKeysLoading, error: apiKeysError } = useQuery({
    queryKey: ['adminApiKeys'],
    queryFn: () => admin.apiKeys(),
    staleTime: 30000,
  });

  // Filter organizations based on search
  const filteredOrgs = orgsData?.data?.organizations?.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const stats = statsData?.data || {};

  const handleDeactivateOrg = async (orgId) => {
    if (!confirm('Are you sure you want to deactivate this organization?')) {
      return;
    }

    try {
      await adminOrganizations.deactivate(orgId);
      toast.success('Organization deactivated');
      // Refetch organizations
    } catch (error) {
      toast.error('Failed to deactivate organization');
      console.error('Deactivate error:', error);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>System Admin Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage organizations, users, and system-wide settings
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`admin-tab ${activeTab === 'organizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('organizations')}
        >
          Organizations
        </button>
        <button
          className={`admin-tab ${activeTab === 'api-keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('api-keys')}
        >
          API Keys
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="admin-content">
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : statsError ? (
            <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Failed to load statistics</p>
                <p className="text-sm text-red-800 dark:text-red-200">{statsError.message}</p>
              </div>
            </div>
          ) : (
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-icon organizations">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="admin-stat-content">
                  <p className="admin-stat-label">Organizations</p>
                  <p className="admin-stat-value">{stats.organizationCount || 0}</p>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon users">
                  <Users className="w-6 h-6" />
                </div>
                <div className="admin-stat-content">
                  <p className="admin-stat-label">Total Users</p>
                  <p className="admin-stat-value">{stats.userCount || 0}</p>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon conversations">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="admin-stat-content">
                  <p className="admin-stat-label">Conversations</p>
                  <p className="admin-stat-value">{stats.conversationCount || 0}</p>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon keys">
                  <Key className="w-6 h-6" />
                </div>
                <div className="admin-stat-content">
                  <p className="admin-stat-label">API Keys</p>
                  <p className="admin-stat-value">{stats.apiKeyCount || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Guide */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Guide
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Organizations Tab
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  View and manage all organizations. See member counts, conversation history, and deactivate organizations if needed.
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                  API Keys Tab
                </h4>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  Audit all API keys across the system. See which organizations are using which keys and their status.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="admin-content">
          <div className="admin-search">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </div>

          {orgsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : orgsError ? (
            <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Failed to load organizations</p>
                <p className="text-sm text-red-800 dark:text-red-200">{orgsError.message}</p>
              </div>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No organizations found</p>
            </div>
          ) : (
            <div className="admin-org-list">
              {filteredOrgs.map((org) => (
                <div key={org.id} className="admin-org-card">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {org.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {org.slug}
                    </p>
                    {org.description && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {org.description}
                      </p>
                    )}
                    <div className="flex gap-6 mt-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Created: {new Date(org.created_at).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        org.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {org.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {org.is_active && (
                      <button
                        onClick={() => handleDeactivateOrg(org.id)}
                        className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                      >
                        Deactivate
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="admin-content">
          {apiKeysLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : apiKeysError ? (
            <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Failed to load API keys</p>
                <p className="text-sm text-red-800 dark:text-red-200">{apiKeysError.message}</p>
              </div>
            </div>
          ) : !apiKeysData?.data?.secrets || apiKeysData.data.secrets.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No API keys found</p>
            </div>
          ) : (
            <div className="admin-api-keys-table">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Label
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {apiKeysData.data.secrets.map((key) => (
                      <tr key={key.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {key.service_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {key.key_label}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {key.organization_id ? `Org #${key.organization_id}` : 'System-wide'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            key.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {key.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
