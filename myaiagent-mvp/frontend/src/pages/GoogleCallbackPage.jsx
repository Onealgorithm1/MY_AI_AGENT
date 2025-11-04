import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useAuthStore } from '../store/authStore';
import { auth as authApi } from '../services/api';

const GoogleCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Completing Google authentication...');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage(getErrorMessage(error));
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      return;
    }

    // SECURITY: Token is now in HTTP-only cookie (set by backend)
    // Just fetch user data - the cookie will be sent automatically
    authApi.me()
      .then(response => {
        const user = response.data.user;
        
        // Properly update auth state and persist to localStorage
        const authStore = useAuthStore.getState();
        authStore.user = user;
        authStore.isAuthenticated = true;
        useAuthStore.setState({
          user,
          isAuthenticated: true,
        });
        
        setStatus('success');
        setMessage('Successfully signed in with Google!');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      })
      .catch(error => {
        console.error('Failed to fetch user data:', error);
        setStatus('error');
        setMessage('Failed to complete authentication. Please try again.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      });
  }, [location, navigate]);

  const getErrorMessage = (error) => {
    const errorMessages = {
      access_denied: 'Google sign-in was cancelled',
      missing_parameters: 'Authentication parameters missing',
      invalid_state: 'Invalid authentication state',
      callback_failed: 'Authentication callback failed',
      google_account_already_linked: 'This Google account is already linked to another user',
    };

    return errorMessages[error] || 'Google authentication failed';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="flex flex-col items-center">
          {status === 'processing' && (
            <>
              <FaSpinner className="text-6xl text-blue-500 animate-spin mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Processing...
              </h2>
            </>
          )}

          {status === 'success' && (
            <>
              <FaCheckCircle className="text-6xl text-green-500 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Success!
              </h2>
            </>
          )}

          {status === 'error' && (
            <>
              <FaTimesCircle className="text-6xl text-red-500 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Error
              </h2>
            </>
          )}

          <p className="text-gray-600 dark:text-gray-400 text-center">
            {message}
          </p>

          {status !== 'processing' && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              Redirecting...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
