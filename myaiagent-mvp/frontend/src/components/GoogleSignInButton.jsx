import { useState } from 'react';
import { FaGoogle } from 'react-icons/fa';
import axios from 'axios';

const GoogleSignInButton = ({ onError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/auth/google/login');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Google sign-in error:', error);
      onError?.(error.response?.data?.error || 'Failed to initiate Google sign-in');
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FaGoogle className="text-xl" />
      <span className="font-medium">
        {isLoading ? 'Connecting...' : 'Continue with Google'}
      </span>
    </button>
  );
};

export default GoogleSignInButton;
