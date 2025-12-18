import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { organizations as orgApi, adminOrganizations as adminOrgsApi } from '../services/api';

import { toast } from 'sonner';

export default function OrganizationSelector() {
  const { user, organizations: userOrgs, currentOrganization, switchOrganization, isMasterAdmin } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminOrgs, setAdminOrgs] = useState([]);
  const dropdownRef = useRef(null);

  // Combine user orgs and admin fetched orgs, removing duplicates by ID
  const displayOrganizations = isMasterAdmin()
    ? [...new Map([...userOrgs, ...adminOrgs].map(item => [item.id, item])).values()]
    : userOrgs;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all organizations for master admin
  useEffect(() => {
    if (isMasterAdmin() && isOpen) {
      const fetchAllOrgs = async () => {
        try {
          // Fetch first 100 orgs for the dropdown (pagination could be added later if needed)
          const response = await adminOrgsApi.list(undefined, 100, 0);
          setAdminOrgs(response.data.organizations || []);
        } catch (error) {
          console.error('Failed to fetch admin organizations:', error);
          toast.error('Failed to load all organizations');
        }
      };
      fetchAllOrgs();
    }
  }, [isMasterAdmin, isOpen]);

  const handleCreateOrganization = async (e) => {
    e.preventDefault();

    if (!orgName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await orgApi.create({
        name: orgName,
      });

      const newOrg = response.data.organization;
      useAuthStore.setState((state) => ({
        organizations: [...state.organizations, newOrg],
        currentOrganization: newOrg,
      }));

      toast.success('Organization created successfully');
      setIsCreatingOrg(false);
      setOrgName('');
      setIsOpen(false);
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || 'Failed to create organization';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchOrganization = (org) => {
    // If the org isn't in the global store's list (which switchOrganization checks), add it temporarily
    const storeState = useAuthStore.getState();
    const exists = storeState.organizations.find(o => o.id === org.id);

    if (!exists) {
      useAuthStore.setState(state => ({
        organizations: [...state.organizations, org]
      }));
    }

    switchOrganization(org.id);
    setIsOpen(false);
    toast.success(`Switched to ${org.name}`);
  };

  if (!user || !currentOrganization) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Organization
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
            {currentOrganization.name}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {/* Organization List */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            {displayOrganizations.length > 0 ? (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {displayOrganizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSwitchOrganization(org)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${currentOrganization.id === org.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{org.name}</span>
                      {org.role && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {org.role}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No organizations
              </p>
            )}
          </div>

          {/* Create Organization Form */}
          {isCreatingOrg ? (
            <form onSubmit={handleCreateOrganization} className="p-3 space-y-2">
              <input
                type="text"
                placeholder="Organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingOrg(false);
                    setOrgName('');
                  }}
                  className="flex-1 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Action Buttons */}
              <div className="p-2 space-y-1 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsCreatingOrg(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <Plus size={16} />
                  <span>Create Organization</span>
                </button>

                {currentOrganization && (
                  <a
                    href={`/org/${currentOrganization.slug}/settings`}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <Settings size={16} />
                    <span>Organization Settings</span>
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
