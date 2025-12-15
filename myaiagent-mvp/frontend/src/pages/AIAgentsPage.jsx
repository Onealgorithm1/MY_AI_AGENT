import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, AlertCircle, Copy, Check } from 'lucide-react';
import api from '../services/api';

export default function AIAgentsPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedModel, setCopiedModel] = useState(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/ai-agents/configured-services');
      setServices(response.data.services || []);
    } catch (err) {
      const statusCode = err.response?.status;
      const responseData = err.response?.data;
      let errorMessage = 'Failed to load AI services';

      if (statusCode === 404) {
        errorMessage = 'AI services endpoint not found.';
      } else if (statusCode === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (statusCode === 500 || statusCode === 503) {
        let backendError = 'Server error';
        if (typeof responseData?.error === 'string') {
          backendError = responseData.error;
        } else if (responseData?.message) {
          backendError = responseData.message;
        } else if (err.message) {
          backendError = err.message;
        }
        errorMessage = backendError;
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error('❌ Error loading services:', { status: statusCode, data: responseData, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (modelId) => {
    navigator.clipboard.writeText(modelId);
    setCopiedModel(modelId);
    setTimeout(() => setCopiedModel(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Available Models
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Based on configured API keys
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-red-700 dark:text-red-400">
                  <p className="font-medium">{error}</p>
                  <p className="text-sm mt-1">
                    Add API keys in <button onClick={() => navigate('/profile')} className="underline hover:no-underline">Admin Settings</button> to access AI models.
                  </p>
                </div>
              </div>
              <button
                onClick={loadServices}
                className="ml-4 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400 rounded-full animate-spin"></div>
          </div>
        ) : services.length === 0 ? (
          // Empty State
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No API Keys Configured
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add API keys in Admin Settings to see available models for ChatGPT, Gemini, Claude, and more.
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Settings
            </button>
          </div>
        ) : (
          // Services and Models
          <div className="grid gap-6">
            {services.map(service => (
              <div
                key={service.serviceName}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Service Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    {service.logo && (
                      <img
                        src={service.logo}
                        alt={service.displayName}
                        className="w-10 h-10 object-contain"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {service.displayName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {service.models.length} available models
                      </p>
                    </div>
                  </div>
                </div>

                {/* Models List */}
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {service.models.map(model => (
                    <div
                      key={model.id}
                      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {model.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Model ID: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-xs">{model.id}</code>
                          </p>
                          {model.maxTokens && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Max tokens: {model.maxTokens.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(model.id)}
                          className="ml-4 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Copy model ID"
                        >
                          {copiedModel === model.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
