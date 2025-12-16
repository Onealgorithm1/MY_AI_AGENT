import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Trash2, UserX, Shield, Plus, Copy, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { organizations as orgApi } from '../services/api';
import { toast } from 'sonner';

export default function OrganizationSettingsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, currentOrganization } = useAuthStore();

  const [organization, setOrganization] = useState(null);
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  useEffect(() => {
    if (!user || !currentOrganization || currentOrganization.slug !== slug) {
      navigate('/');
      return;
    }

    loadOrgData();
  }, [slug, user, currentOrganization]);

  const loadOrgData = async () => {
    try {
      setIsLoading(true);
      const orgResponse = await orgApi.get(currentOrganization.id);
      setOrganization(orgResponse.data.organization);

      const usersResponse = await orgApi.getUsers(currentOrganization.id);
      setUsers(usersResponse.data.users);

      const invitationsResponse = await orgApi.getInvitations(currentOrganization.id);
      setInvitations(invitationsResponse.data.invitations);
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to load organization data';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();

    if (!inviteEmail) {
      toast.error('Email is required');
      return;
    }

    try {
      await orgApi.inviteUser(currentOrganization.id, {
        email: inviteEmail,
        role: inviteRole,
      });

      toast.success('Invitation sent successfully');
      setInviteEmail('');
      setInviteRole('member');
      setIsInviting(false);

      // Reload invitations
      const response = await orgApi.getInvitations(currentOrganization.id);
      setInvitations(response.data.invitations);
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to send invitation';
      toast.error(msg);
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) {
      return;
    }

    try {
      await orgApi.revokeInvitation(currentOrganization.id, invitationId);
      toast.success('Invitation revoked');

      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to revoke invitation';
      toast.error(msg);
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      await orgApi.deactivateUser(currentOrganization.id, userId);
      toast.success('User deactivated');

      setUsers(
        users.map((u) =>
          u.user_id === userId ? { ...u, is_active: false } : u
        )
      );
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to deactivate user';
      toast.error(msg);
    }
  };

  const handleActivateUser = async (userId) => {
    try {
      await orgApi.activateUser(currentOrganization.id, userId);
      toast.success('User activated');

      setUsers(
        users.map((u) =>
          u.user_id === userId ? { ...u, is_active: true } : u
        )
      );
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to activate user';
      toast.error(msg);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user?')) {
      return;
    }

    try {
      await orgApi.removeUser(currentOrganization.id, userId);
      toast.success('User removed');

      setUsers(users.filter((u) => u.user_id !== userId));
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to remove user';
      toast.error(msg);
    }
  };

  const canManageUsers = user && currentOrganization && 
    (user.org_role === 'admin' || user.org_role === 'owner');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Organization not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {organization.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {organization.description || 'Manage your organization settings'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'invitations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Invitations ({invitations.length})
          </button>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {canManageUsers && (
              <button
                onClick={() => setIsInviting(!isInviting)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                Invite User
              </button>
            )}

            {isInviting && (
              <form
                onSubmit={handleInviteUser}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Joined
                    </th>
                    {canManageUsers && (
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.full_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {member.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium capitalize">
                          {member.role === 'owner' && <Shield size={14} />}
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-medium ${
                            member.is_active
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      {canManageUsers && member.user_id !== user.id && member.role !== 'owner' && (
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {member.is_active ? (
                              <button
                                onClick={() => handleDeactivateUser(member.user_id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                title="Deactivate user"
                              >
                                <UserX size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateUser(member.user_id)}
                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                title="Activate user"
                              >
                                ✓
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveUser(member.user_id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              title="Remove user"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="space-y-4">
            {invitations.length === 0 ? (
              <div className="text-center py-8">
                <Mail size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  No pending invitations
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {invitation.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Role: <span className="capitalize">{invitation.role}</span>
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Invited{' '}
                          {new Date(invitation.invited_at).toLocaleDateString()} •
                          Expires{' '}
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      {canManageUsers && (
                        <button
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          title="Revoke invitation"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
