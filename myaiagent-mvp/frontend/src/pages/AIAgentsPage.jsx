import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CheckCircle, AlertCircle, ExternalLink, Zap } from 'lucide-react';
import AIAgentsList from '../components/AIAgentsList';
import ConnectAIAgentModal from '../components/ConnectAIAgentModal';
import api from '../services/api';

export default function AIAgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [testingAgent, setTestingAgent] = useState(null);

  // Load agents and providers
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [agentsRes, providersRes] = await Promise.all([
        api.get('/ai-agents/my-agents'),
        api.get('/ai-agents/available-providers'), // Auto-detect based on API keys
      ]);

      setAgents(agentsRes.data.agents || []);

      // Use only available providers (those with configured API keys)
      setProviders(providersRes.data.available || []);

      // Log summary for debugging
      if (providersRes.data.summary) {
        console.log('🔍 AI Providers Summary:', {
          available: providersRes.data.summary.availableCount,
          unavailable: providersRes.data.summary.unavailableCount,
          configuredServices: providersRes.data.summary.totalConfigured,
        });
      }
    } catch (err) {
      const statusCode = err.response?.status;
      const responseData = err.response?.data;
      let errorMessage = 'Failed to load AI agents';

      // Log full error for debugging
      console.error('❌ Error loading AI agents:', {
        status: statusCode,
        data: responseData,
        message: err.message,
        fullError: err,
      });

      // Extract error message - handle multiple formats
      if (statusCode === 404) {
        errorMessage = 'AI agents endpoint not found. Ensure backend is deployed and running.';
      } else if (statusCode === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (statusCode === 500 || statusCode === 503) {
        // Try to extract error message from response
        let backendError = 'Server error';

        if (typeof responseData?.error === 'string') {
          backendError = responseData.error;
        } else if (responseData?.message) {
          backendError = responseData.message;
        } else if (err.message) {
          backendError = err.message;
        }

        errorMessage = `${backendError}. Please try again or contact support if the problem persists.`;
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else if (responseData && typeof responseData === 'object') {
        // If response is an object, try to find any message field
        errorMessage = responseData.error || responseData.message || JSON.stringify(responseData);
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAgent = async (formData) => {
    try {
      const response = await api.post('/ai-agents/my-agents', formData);

      setAgents([...agents, response.data.agent]);
      setShowConnectModal(false);
      setSelectedProvider(null);
    } catch (err) {
      throw new Error(err.message || 'Failed to connect AI agent');
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;

    try {
      await api.delete(`/ai-agents/my-agents/${agentId}`);

      setAgents(agents.filter(a => a.id !== agentId));
    } catch (err) {
      alert('Failed to delete agent: ' + err.message);
    }
  };

  const handleSetDefault = async (agentId) => {
    try {
      const response = await api.post(
        `/ai-agents/my-agents/${agentId}/set-default`
      );

      setAgents(agents.map(a => ({
        ...a,
        isDefault: a.id === agentId,
      })));
    } catch (err) {
      alert('Failed to set default agent: ' + err.message);
    }
  };

  const handleTestAgent = async (agentId) => {
    try {
      setTestingAgent(agentId);

      const response = await api.post(
        `/ai-agents/my-agents/${agentId}/test`
      );

      setAgents(agents.map(a =>
        a.id === agentId
          ? { ...a, status: response.data.status, errorMessage: response.data.error }
          : a
      ));
    } catch (err) {
      alert('Failed to test agent: ' + err.message);
    } finally {
      setTestingAgent(null);
    }
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
                  AI Agents
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Connect and manage your AI providers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setShowConnectModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Connect Agent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="text-red-700 dark:text-red-400">
                <p className="font-medium">{error}</p>
              </div>
              <button
                onClick={loadData}
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
        ) : agents.length === 0 ? (
          // Empty State
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No AI Agents Connected
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your preferred AI providers to use them in Werkules. You can connect
              ChatGPT, Gemini, Claude, and more.
            </p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Connect Your First Agent
            </button>
          </div>
        ) : (
          // Agents List
          <div className="grid gap-6">
            {agents.map(agent => (
              <div
                key={agent.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    {agent.providerLogoUrl && (
                      <img
                        src={agent.providerLogoUrl}
                        alt={agent.providerDisplayName}
                        className="w-12 h-12 rounded object-contain"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {agent.agentName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {agent.providerDisplayName} · {agent.model}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {agent.status === 'active' ? (
                      <div className="flex items-center gap-1 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {agent.status}
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Message if exists */}
                {agent.errorMessage && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                    {agent.errorMessage}
                  </div>
                )}

                {/* Agent Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 py-4 border-t border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold">
                      Auth Type
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white capitalize mt-1">
                      {agent.authType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold">
                      Default
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {agent.isDefault ? '✓ Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold">
                      Connected
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold">
                      Last Used
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {agent.lastUsedAt
                        ? new Date(agent.lastUsedAt).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!agent.isDefault && (
                    <button
                      onClick={() => handleSetDefault(agent.id)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      Set as Default
                    </button>
                  )}

                  <button
                    onClick={() => handleTestAgent(agent.id)}
                    disabled={testingAgent === agent.id}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {testingAgent === agent.id ? 'Testing...' : 'Test'}
                  </button>

                  {/* Documentation link removed - not applicable for connected agents */}

                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="ml-auto px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Agent Modal */}
      {showConnectModal && (
        <ConnectAIAgentModal
          providers={providers}
          onClose={() => {
            setShowConnectModal(false);
            setSelectedProvider(null);
          }}
          onConnect={handleConnectAgent}
        />
      )}
    </div>
  );
}
