import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth as authApi } from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { user } = response.data;
          
          // SECURITY: Token is now stored in HTTP-only cookie (set by backend)
          // No need to store in localStorage
          
          set({
            user,
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
      signup: async (email, password, fullName) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.signup(email, password, fullName);
          const { user } = response.data;
          
          // SECURITY: Token is now stored in HTTP-only cookie (set by backend)
          // No need to store in localStorage
          
          set({
            user,
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
            isAuthenticated: false,
            error: null,
          });
        }
      },

      // Refresh user data
      refreshUser: async () => {
        try {
          const response = await authApi.me();
          set({ user: response.data.user });
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
