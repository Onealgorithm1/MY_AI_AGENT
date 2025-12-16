import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Building2, Settings, Shield, User, Grid, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import OrganizationSelector from './OrganizationSelector';

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [showConnectedApps, setShowConnectedApps] = useState(false);

  const connectedApps = [
    {
      name: 'SAM.gov',
      description: 'Federal contract opportunities',
      icon: Building2,
      path: '/samgov',
      status: 'connected',
      color: 'bg-blue-600',
    },
    {
      name: 'Company Profile',
      description: 'OneAlgorithm capabilities & certifications',
      icon: Building2,
      path: '/company-profile',
      status: 'configured',
      color: 'bg-green-600',
    },
    {
      name: 'Opportunity Matches',
      description: 'AI-matched opportunities for your company',
      icon: Grid,
      path: '/opportunity-matches',
      status: 'active',
      color: 'bg-purple-600',
    },
  ];

  const navItems = [
    {
      path: '/chat',
      icon: MessageSquare,
      label: 'Chat',
      title: 'AI Chat',
    },
    {
      path: '/samgov',
      icon: Building2,
      label: 'SAM.gov',
      title: 'SAM.gov Opportunities',
    },
  ];

  const isActive = (path) => {
    return location.pathname === path || (path === '/chat' && location.pathname === '/');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-20 lg:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center lg:justify-start">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <span className="hidden lg:block ml-3 text-lg font-semibold text-gray-900 dark:text-white">
              werkules
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-center lg:justify-start px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={item.title}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden lg:block ml-3 font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Dashboards Button */}
          <button
            onClick={() => setShowConnectedApps(true)}
            className="w-full flex items-center justify-center lg:justify-start px-4 py-3 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 mt-4"
            title="Connected Apps & Dashboards"
          >
            <Grid className="w-5 h-5" />
            <span className="hidden lg:block ml-3 font-medium">
              Dashboards
            </span>
          </button>
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white dark:text-gray-900" />
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.fullName || 'User'}
              </p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="hidden lg:block p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <button
                onClick={() => navigate('/admin')}
                className="hidden lg:block p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Admin Panel"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile: Icons only */}
          <div className="lg:hidden flex flex-col gap-2 mt-3">
            <button
              onClick={() => navigate('/profile')}
              className="w-full p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center"
              title="Profile"
            >
              <Settings className="w-5 h-5" />
            </button>
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center"
                title="Admin"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </div>

      {/* Connected Apps Modal */}
      {showConnectedApps && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Connected Apps & Dashboards
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Access all your integrated tools and data sources
                </p>
              </div>
              <button
                onClick={() => setShowConnectedApps(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Apps Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedApps.map((app) => {
                const AppIcon = app.icon;
                return (
                  <button
                    key={app.name}
                    onClick={() => {
                      navigate(app.path);
                      setShowConnectedApps(false);
                    }}
                    className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-lg text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${app.color} p-3 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <AppIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {app.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {app.description}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          app.status === 'connected'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : app.status === 'configured'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
