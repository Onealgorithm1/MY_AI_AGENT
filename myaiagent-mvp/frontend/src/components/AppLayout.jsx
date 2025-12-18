import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Building2, Settings, Shield, User, Grid, X, Lock, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import OrganizationSelector from './OrganizationSelector';

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showConnectedApps, setShowConnectedApps] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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

  const mainNavItems = [
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

  // Admin Links - shown in main nav if user has access
  const adminNavItems = [];

  if (user?.role === 'master_admin' || user?.role === 'superadmin') {
    adminNavItems.push({
      path: '/admin/system',
      icon: Lock,
      label: 'System Admin',
      title: 'Master Admin Dashboard',
      color: 'text-purple-600 dark:text-purple-400'
    });
  }

  if (user?.org_role === 'admin' || user?.org_role === 'owner') {
    adminNavItems.push({
      path: '/admin/org',
      icon: Shield,
      label: 'Org Admin',
      title: 'Organization Admin',
      color: 'text-blue-600 dark:text-blue-400'
    });
  }

  const navItems = [...mainNavItems, ...adminNavItems];

  const isActive = (path) => {
    return location.pathname === path || (path === '/chat' && location.pathname === '/');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`hidden md:flex md:flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out z-20 ${isHovered ? 'w-64' : 'w-20'
          }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 h-18 flex items-center justify-between overflow-hidden whitespace-nowrap">
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <span className={`ml-3 text-lg font-semibold text-gray-900 dark:text-white transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 w-0'
              }`}>
              werkules
            </span>
          </div>
        </div>

        {/* Organization Selector */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 h-0 p-0 overflow-hidden'}`}>
          <OrganizationSelector />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors whitespace-nowrap relative ${active
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                title={!isHovered ? item.title : ''}
              >
                <div className={`flex-shrink-0 ${item.color || ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`ml-3 font-medium transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 w-0 hidden'
                  } ${item.color || ''}`}>
                  {item.label}
                </span>

                {/* Tooltip for collapsed state */}
                {!isHovered && (
                  <div className="absolute left-full ml-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}

          {/* Dashboards Button */}
          <button
            onClick={() => setShowConnectedApps(true)}
            className="w-full flex items-center px-4 py-3 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 mt-4 whitespace-nowrap relative"
            title={!isHovered ? "Connected Apps" : ""}
          >
            <div className="flex-shrink-0">
              <Grid className="w-5 h-5" />
            </div>
            <span className={`ml-3 font-medium transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 w-0 hidden'
              }`}>
              Dashboards
            </span>
          </button>
        </nav>

        {/* User Menu & Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/profile')}
              className={`flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap ${isHovered ? 'justify-start' : 'justify-center'}`}
              title={!isHovered ? "Profile" : ""}
            >
              <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white dark:text-gray-900" />
              </div>
              <div className={`ml-3 min-w-0 flex-1 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">View Profile</p>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className={`flex items-center p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors whitespace-nowrap ${isHovered ? 'justify-start' : 'justify-center'}`}
              title={!isHovered ? "Logout" : ""}
            >
              <div className="flex-shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <span className={`ml-3 font-medium transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                Logout
              </span>
            </button>
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${app.status === 'connected'
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
