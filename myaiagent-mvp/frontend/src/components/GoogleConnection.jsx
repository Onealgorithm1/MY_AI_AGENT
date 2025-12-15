import { useState, useEffect } from 'react';
import { FaGoogle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const GoogleConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication required. Please log in again.');
        setIsLoading(false);
        return;
      }

      const response = await axios.get('/api/auth/google/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConnectionStatus(response.data);
    } catch (error) {
      console.error('Error checking Google connection status:', {
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
        details: error.response?.data,
      });

      let errorMessage = 'Failed to check Google connection status';
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'User account not found';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      toast.error(errorMessage);

      // Set a default disconnected state on error
      setConnectionStatus({ isConnected: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/google/connect', {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Google connect error:', error);
      toast.error(error.response?.data?.error || 'Failed to connect Google account');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google account? This will remove access to Gmail, Calendar, and Drive.')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/auth/google/disconnect', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Google account disconnected successfully');
      await checkConnectionStatus();
    } catch (error) {
      console.error('Google disconnect error:', error);
      toast.error(error.response?.data?.error || 'Failed to disconnect Google account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Google Account Connection
        </h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
        <FaGoogle className="text-blue-500" />
        Google Account Connection
      </h2>

      {connectionStatus?.isConnected ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FaCheckCircle className="text-green-500" />
            <span className="text-gray-700 dark:text-gray-300">
              Google account connected
            </span>
          </div>

          {connectionStatus.profilePicture && (
            <div className="mb-4">
              <img
                src={connectionStatus.profilePicture}
                alt="Google Profile"
                className="w-16 h-16 rounded-full"
              />
            </div>
          )}

          {connectionStatus.tokenInfo && (
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              <p>
                Token expires: {new Date(connectionStatus.tokenInfo.expiresAt).toLocaleString()}
              </p>
              {connectionStatus.tokenInfo.lastRefreshedAt && (
                <p>
                  Last refreshed: {new Date(connectionStatus.tokenInfo.lastRefreshedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              Connected services:
            </p>
            <ul className="text-sm text-blue-600 dark:text-blue-400 list-disc list-inside">
              <li>Gmail - Full email access</li>
              <li>Calendar - Event management</li>
              <li>Drive - File storage</li>
              <li>Docs & Sheets - Document editing</li>
              <li>Analytics - Website insights</li>
            </ul>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="mt-6 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect Google Account'}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FaTimesCircle className="text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              No Google account connected
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Connect your Google account to enable AI-powered Gmail, Calendar, Drive, and Docs management.
          </p>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaGoogle className="text-xl text-blue-500" />
            <span className="font-medium">
              {isConnecting ? 'Connecting...' : 'Connect Google Account'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleConnection;
