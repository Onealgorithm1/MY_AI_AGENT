import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizations } from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  Users,
  Mail,
  UserPlus,
  Key,
  Plus,
  Copy,
  Trash2,
  Loader,
  AlertCircle,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  RotateCw,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import './OrgAdminDashboard.css';

export default function OrgAdminDashboard() {
  const { user, currentOrganization } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('member');
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [showApiKeyValues, setShowApiKeyValues] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const orgId = currentOrganization?.id;

  // Fetch organization details with real-time updates
  const { data: orgData, isLoading: orgLoading, error: orgError, refetch: refetchOrg, isFetching } = useQuery({
    queryKey: ['orgDetails', orgId],
    queryFn: () => organizations.get(orgId),
    enabled: !!orgId,
    staleTime: 15000, // Refresh every 15 seconds
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const org = orgData?.data?.organization;

  // Auto-refetch when organization changes
  useEffect(() => {
    if (orgId) {
      refetchOrg();
    }
  }, [orgId, refetchOrg]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchOrg();
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInviteUser = async () => {
    if (!newUserEmail.trim()) {
      toast.error('Please enter an email');
      return;
    }

    try {
      // TODO: Implement invite user endpoint in backend
      // This requires: POST /api/org/:orgId/users with email and role
      toast.success('User invitation sent (feature coming soon)');
      setNewUserEmail('');
      setShowAddUser(false);
      // refetchOrg();
    } catch (error) {
      toast.error('Failed to send invitation');
      console.error('Invite error:', error);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyLabel.trim()) {
      toast.error('Please enter a key label');
      return;
    }

    try {
      // TODO: Implement create API key endpoint in backend
      // This requires: POST /api/org/:orgId/api-keys with label
      toast.success('API key created (feature coming soon)');
      setNewKeyLabel('');
      setShowAddKey(false);
      // refetchOrg();
    } catch (error) {
      toast.error('Failed to create API key');
      console.error('Create key error:', error);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this API key?')) {
      return;
    }

    try {
      // TODO: Implement revoke API key endpoint in backend
      // This requires: DELETE /api/org/:orgId/api-keys/:keyId
      toast.success('API key revoked (feature coming soon)');
      // refetchOrg();
    } catch (error) {
      toast.error('Failed to revoke API key');
      console.error('Revoke error:', error);
    }
  };

  const toggleKeyVisibility = (keyId) => {
    setShowApiKeyValues((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  };

  if (!orgId) {
    return (
      <div className="org-admin-dashboard">
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Organization Selected
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please select an organization from the sidebar to manage it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="org-admin-dashboard">
      <div className="org-admin-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>Organization Settings</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentOrganization?.name || 'Organization'} • {currentOrganization?.slug}
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isFetching}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing || isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live Status Indicator */}
      {isFetching && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-800 dark:text-blue-200">Updating data...</span>
        </div>
      )}

      {/* Tabs */}
      <div className="org-admin-tabs">
        <button
          className={`org-admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`org-admin-tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        <button
          className={`org-admin-tab ${activeTab === 'api-keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('api-keys')}
        >
          API Keys
        </button>
        <button
          className={`org-admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="org-admin-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {orgLoading && !org ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : orgError ? (
              <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">Failed to load organization</p>
                  <p className="text-sm text-red-800 dark:text-red-200">{orgError.message}</p>
                </div>
              </div>
            ) : org ? (
              <div className="org-admin-stats-grid">
                <div className="org-admin-stat-card">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Members</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {org.stats?.memberCount || 0}
                    </p>
                  </div>
                </div>

                <div className="org-admin-stat-card">
                  <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Conversations</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {org.stats?.conversationCount || 0}
                    </p>
                  </div>
                </div>

                <div className="org-admin-stat-card">
                  <Key className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">API Keys</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {org.stats?.apiKeyCount || 0}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No organization data available</p>
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Members</h3>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Invite Member
              </button>
            </div>

            {/* Invite Form */}
            {showAddUser && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleInviteUser}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Send Invitation
                    </button>
                    <button
                      onClick={() => setShowAddUser(false)}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Members List */}
            {orgLoading && !org ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : org?.stats?.memberCount > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {org.stats.memberCount} member{org.stats.memberCount !== 1 ? 's' : ''} in this organization
                </p>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center text-gray-600 dark:text-gray-400">
                  Member list details coming soon - backend endpoint pending
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No members yet</p>
              </div>
            )}
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h3>
              <button
                onClick={() => setShowAddKey(!showAddKey)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Key
              </button>
            </div>

            {/* Create Key Form */}
            {showAddKey && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Key Label
                    </label>
                    <input
                      type="text"
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                      placeholder="e.g., Production API Key"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateApiKey}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Key
                    </button>
                    <button
                      onClick={() => setShowAddKey(false)}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* API Keys List */}
            {orgLoading && !org ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : org?.stats?.apiKeyCount > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {org.stats.apiKeyCount} API key{org.stats.apiKeyCount !== 1 ? 's' : ''} for this organization
                </p>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center text-gray-600 dark:text-gray-400">
                  API key list details coming soon - backend endpoint pending
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Key className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No API keys created yet</p>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Organization Settings
            </h3>

            {orgLoading && !org ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : org ? (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Organization Info</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Organization Name
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">{org.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Slug
                      </label>
                      <p className="text-gray-900 dark:text-white font-mono text-sm">{org.slug}</p>
                    </div>
                    {org.description && (
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Description
                        </label>
                        <p className="text-gray-900 dark:text-white">{org.description}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Created
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(org.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Status
                      </label>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        org.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {org.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Additional organization settings and customization options will be available soon.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
