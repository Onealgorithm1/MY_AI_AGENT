import { useState, useMemo } from 'react';
import { X, ChevronLeft } from 'lucide-react';

export default function ConnectAIAgentModal({ providers = [], onClose, onConnect }) {
  const [step, setStep] = useState('provider'); // provider, config
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [formData, setFormData] = useState({
    agentName: '',
    model: '',
    apiKey: '',
    oauthToken: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const providerObj = useMemo(() => {
    return providers.find(p => p.providerName === selectedProvider);
  }, [selectedProvider, providers]);

  const handleProviderSelect = (providerName) => {
    setSelectedProvider(providerName);
    setFormData({
      agentName: '',
      model: '',
      apiKey: '',
      oauthToken: '',
    });
    setError(null);
    setStep('config');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.agentName.trim()) {
      setError('Please enter an agent name');
      return;
    }

    if (!formData.model) {
      setError('Please select a model');
      return;
    }

    if (providerObj?.authType === 'api_key' && !formData.apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    try {
      setLoading(true);

      const connectData = {
        providerName: selectedProvider,
        agentName: formData.agentName,
        model: formData.model,
        authType: providerObj?.authType || 'api_key',
      };

      if (providerObj?.authType === 'api_key') {
        connectData.apiKey = formData.apiKey;
      } else if (providerObj?.authType === 'oauth') {
        connectData.oauthToken = formData.oauthToken;
      }

      await onConnect(connectData);
    } catch (err) {
      setError(err.message || 'Failed to connect agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'config' && (
              <button
                onClick={() => {
                  setStep('provider');
                  setSelectedProvider(null);
                }}
                className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {step === 'provider' ? 'Select AI Provider' : 'Configure Agent'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'provider' ? (
            // Provider Selection
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map(provider => (
                <button
                  key={provider.providerName}
                  onClick={() => handleProviderSelect(provider.providerName)}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all text-left group"
                >
                  {provider.logoUrl && (
                    <img
                      src={provider.logoUrl}
                      alt={provider.displayName}
                      className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform"
                    />
                  )}
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {provider.displayName}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {provider.authType === 'api_key' ? 'API Key' : 'OAuth'}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            // Configuration Form
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Agent Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  name="agentName"
                  value={formData.agentName}
                  onChange={handleInputChange}
                  placeholder="e.g., My ChatGPT, Claude AI, etc."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Give your agent a friendly name to identify it
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model
                </label>
                <select
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a model...</option>
                  {providerObj?.supportedModels?.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.max_tokens ? `(${model.max_tokens.toLocaleString()} tokens)` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Choose which model to use for this agent
                </p>
              </div>

              {/* API Key or OAuth Token */}
              {providerObj?.authType === 'api_key' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    name="apiKey"
                    value={formData.apiKey}
                    onChange={handleInputChange}
                    placeholder="Paste your API key"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Your API key is encrypted and never stored in plain text
                  </p>
                  {providerObj?.docsUrl && (
                    <a
                      href={providerObj.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                    >
                      How to get your API key →
                    </a>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OAuth Token
                  </label>
                  <textarea
                    name="oauthToken"
                    value={formData.oauthToken}
                    onChange={handleInputChange}
                    placeholder="Paste your OAuth token"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Your token is encrypted and never stored in plain text
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setStep('provider');
                    setSelectedProvider(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Connecting...' : 'Connect Agent'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
