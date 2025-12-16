import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { fetchCsrfToken } from './services/api';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import LandingPage from './pages/LandingPage';

const ChatPage = lazy(() => import('./pages/ChatPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const OrgAdminDashboard = lazy(() => import('./pages/OrgAdminDashboard'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const PreferencesPage = lazy(() => import('./pages/PreferencesPage'));
const AIAgentsPage = lazy(() => import('./pages/AIAgentsPage'));
const SAMGovPage = lazy(() => import('./pages/SAMGovPage'));
const ContractAnalyticsPage = lazy(() => import('./pages/ContractAnalyticsPage'));
const ProposalWorkspacePage = lazy(() => import('./pages/ProposalWorkspacePage'));
const CompanyDashboardPage = lazy(() => import('./pages/CompanyDashboardPage'));
const CompanyProfilePage = lazy(() => import('./pages/CompanyProfilePage'));
const OrganizationSettingsPage = lazy(() => import('./pages/OrganizationSettingsPage'));
const AppLayout = lazy(() => import('./components/AppLayout'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppLayout>{children}</AppLayout>
    </Suspense>
  );
}

function PrivateRouteWithoutLayout({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  );
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppLayout>{children}</AppLayout>
    </Suspense>
  );
}

function MasterAdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  const isMasterAdmin = user?.role === 'master_admin' || user?.role === 'superadmin';

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isMasterAdmin) return <Navigate to="/" />;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppLayout>{children}</AppLayout>
    </Suspense>
  );
}

function OrgAdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  const isMasterAdmin = user?.role === 'master_admin' || user?.role === 'superadmin';
  const isOrgAdmin = user && (user.org_role === 'admin' || user.org_role === 'owner');
  const hasAccess = isMasterAdmin || isOrgAdmin;

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!hasAccess) return <Navigate to="/" />;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppLayout>{children}</AppLayout>
    </Suspense>
  );
}

function App() {
  const { isAuthenticated, user } = useAuthStore();

  // SECURITY: Fetch CSRF token and verify auth on app load
  useEffect(() => {
    const initializeApp = async () => {
      await fetchCsrfToken();
      
      // Skip auth verification on OAuth callback pages
      const isOAuthCallback = window.location.pathname.startsWith('/auth/google/');
      
      // If frontend thinks user is authenticated, verify with backend
      if (isAuthenticated && user && !isOAuthCallback) {
        try {
          const { auth } = await import('./services/api');
          await auth.me();
          // Token is valid, user stays logged in
        } catch (error) {
          // Token invalid or expired, clear auth state
          console.log('Session expired, logging out');
          localStorage.removeItem('auth-storage');
          useAuthStore.setState({ user: null, isAuthenticated: false });
        }
      }
    };
    
    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/google/success" element={<GoogleCallbackPage />} />
          <Route path="/auth/google/error" element={<GoogleCallbackPage />} />

          {/* Landing Page for non-authenticated users */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <PrivateRouteWithoutLayout>
                  <ChatPage />
                </PrivateRouteWithoutLayout>
              ) : (
                <LandingPage />
              )
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRouteWithoutLayout>
                <ChatPage />
              </PrivateRouteWithoutLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <UserProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/preferences"
            element={
              <PrivateRoute>
                <PreferencesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/ai-agents"
            element={
              <PrivateRoute>
                <AIAgentsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/samgov"
            element={
              <PrivateRoute>
                <SAMGovPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/contract-analytics"
            element={
              <PrivateRoute>
                <ContractAnalyticsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/proposals"
            element={
              <PrivateRoute>
                <ProposalWorkspacePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/company-dashboard"
            element={
              <PrivateRoute>
                <CompanyDashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/company-profile"
            element={
              <PrivateRoute>
                <CompanyProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/system"
            element={
              <MasterAdminRoute>
                <AdminDashboard />
              </MasterAdminRoute>
            }
          />
          <Route
            path="/admin/org"
            element={
              <OrgAdminRoute>
                <OrgAdminDashboard />
              </OrgAdminRoute>
            }
          />
          <Route
            path="/org/:slug/settings"
            element={
              <OrgAdminRoute>
                <OrganizationSettingsPage />
              </OrgAdminRoute>
            }
          />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
