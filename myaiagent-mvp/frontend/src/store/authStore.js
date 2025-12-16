import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth as authApi } from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      organizations: [],
      currentOrganization: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login
      login: async (email, password, organizationId = null) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { user, organizations } = response.data;

          // SECURITY: Token is now stored in HTTP-only cookie (set by backend)
          // No need to store in localStorage

          // Select organization: use provided, first from list, or null
          let selectedOrg = null;
          if (organizationId && organizations.some(o => o.id === organizationId)) {
            selectedOrg = organizations.find(o => o.id === organizationId);
          } else if (organizations.length > 0) {
            selectedOrg = organizations[0];
          }

          set({
            user,
            organizations: organizations || [],
            currentOrganization: selectedOrg,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Signup
      signup: async (email, password, fullName, organizationName = null) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.signup(email, password, fullName);
          const { user } = response.data;

          // SECURITY: Token is now stored in HTTP-only cookie (set by backend)
          // No need to store in localStorage

          // New user will have one organization created by default
          const organization = {
            id: user.organization_id,
            name: user.organization_name,
          };

          set({
            user,
            organizations: [organization],
            currentOrganization: organization,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Signup failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Logout
      logout: async () => {
        try {
          // Call backend to clear HTTP-only cookie
          await authApi.logout();
        } catch (error) {
          console.error('Logout API call failed:', error);
        } finally {
          // Clear ALL local state regardless of API call result
          localStorage.removeItem('user');
          localStorage.removeItem('auth-storage');
          set({
            user: null,
            organizations: [],
            currentOrganization: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      // Refresh user data and organizations
      refreshUser: async () => {
        try {
          const response = await authApi.me();
          const { user, organizations } = response.data;

          // Preserve current organization if still valid
          let currentOrg = get().currentOrganization;
          if (currentOrg && !organizations.some(o => o.id === currentOrg.id)) {
            currentOrg = organizations.length > 0 ? organizations[0] : null;
          } else if (!currentOrg && organizations.length > 0) {
            currentOrg = organizations[0];
          }

          set({
            user,
            organizations: organizations || [],
            currentOrganization: currentOrg,
          });
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
      },

      // Switch to a different organization
      switchOrganization: (orgId) => {
        const organizations = get().organizations;
        const org = organizations.find(o => o.id === orgId);

        if (!org) {
          throw new Error('Organization not found');
        }

        set({
          currentOrganization: org,
          user: {
            ...get().user,
            organization_id: org.id,
          },
        });
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        organizations: state.organizations,
        currentOrganization: state.currentOrganization,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
