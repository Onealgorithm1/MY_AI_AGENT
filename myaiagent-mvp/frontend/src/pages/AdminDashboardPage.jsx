import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Users, MessageSquare, Building2, PowerOff, Power } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { adminOrganizations as adminApi } from '../services/api';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [organizations, setOrganizations] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalOrganizations, setTotalOrganizations] = useState(0);

  // Verify admin access
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      navigate('/');
      toast.error('Admin access required');
      return;
    }

    loadData();
  }, [user, currentPage]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load organizations
      const orgsResponse = await adminApi.list(
        undefined,
        pageSize,
        currentPage * pageSize
      );
      setOrganizations(orgsResponse.data.organizations);
      setTotalOrganizations(orgsResponse.data.total);

      // Load statistics
      const statsResponse = await adminApi.getStatistics();
      setStatistics(statsResponse.data.statistics);
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to load data';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleOrgStatus = async (orgId, isActive) => {
    try {
      const action = isActive ? 'deactivate' : 'activate';
      const method = isActive ? adminApi.deactivate : adminApi.activate;

      await method(orgId);

      setOrganizations(
        organizations.map((org) =>
          org.id === orgId ? { ...org, is_active: !isActive } : org
        )
      );

      toast.success(`Organization ${action}d successfully`);
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to update organization';
      toast.error(msg);
    }
  };

  const totalPages = Math.ceil(totalOrganizations / pageSize);

  if (isLoading && organizations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            System Administrator Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage all organizations and view system statistics
          </p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    Active Organizations
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {statistics.activeOrganizations}
                  </p>
                </div>
                <Building2 className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    Total Users
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {statistics.totalUsers}
                  </p>
                </div>
                <Users className="text-green-600 dark:text-green-400" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    Total Conversations
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {statistics.totalConversations}
                  </p>
                </div>
                <MessageSquare className="text-purple-600 dark:text-purple-400" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    Total Messages
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {statistics.totalMessages}
                  </p>
                </div>
                <BarChart className="text-orange-600 dark:text-orange-400" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Organizations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Organizations
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        No organizations found
                      </p>
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr
                      key={org.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {org.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {org.slug}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900 dark:text-white">
                          {org.owner_id ? `User #${org.owner_id}` : 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            org.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {org.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <a
                            href={`/admin/organizations/${org.id}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View Details
                          </a>
                          <button
                            onClick={() =>
                              handleToggleOrgStatus(org.id, org.is_active)
                            }
                            className={`${
                              org.is_active
                                ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
                                : 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300'
                            }`}
                            title={org.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {org.is_active ? (
                              <PowerOff size={18} />
                            ) : (
                              <Power size={18} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                  }
                  disabled={currentPage === totalPages - 1}
                  className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
