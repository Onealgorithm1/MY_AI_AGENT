import { useState, useEffect } from 'react';
import { ChevronDown, Zap, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AIAgentSelector({ selectedAgentId, onSelectAgent }) {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/ai-agents/my-agents');
      const agentsList = response.data.agents || [];
      setAgents(agentsList);

      // Select the first agent or default if none selected
      if (!selectedAgentId && agentsList?.length > 0) {
        const defaultAgent = agentsList.find(a => a.isDefault) || agentsList[0];
        onSelectAgent(defaultAgent);
      }
    } catch (err) {
      let errorMsg = 'Failed to load AI agents';

      if (err.response?.status === 404) {
        errorMsg = 'AI agents endpoint not accessible. Backend may need to be deployed. Go to /ai-agents to configure.';
        console.error('404 - AI agents endpoint not found', {
          endpoint: '/api/ai-agents/my-agents',
          fix: 'Run: cd myaiagent-mvp && flyctl deploy --no-cache',
        });
      } else if (err.response?.status === 401) {
        errorMsg = 'Not authenticated. Please log in again.';
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
      console.warn('Failed to load AI agents:', {
        status: err.response?.status,
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 md:px-3 py-2 md:py-1.5 text-xs md:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none touch-manipulation whitespace-nowrap max-w-[200px] overflow-hidden"
        title={selectedAgent ? selectedAgent.agentName : 'Select AI Agent'}
      >
        <Zap className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
        <span className="truncate">
          {selectedAgent ? selectedAgent.agentName : 'Select Agent'}
        </span>
        <ChevronDown className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ml-auto" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                Loading agents...
              </div>
            ) : error ? (
              <div className="p-4">
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                  {error}
                </p>
                <button
                  onClick={() => {
                    navigate('/ai-agents');
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  Connect AI Agents
                </button>
              </div>
            ) : agents.length === 0 ? (
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  No AI agents connected yet
                </p>
                <button
                  onClick={() => {
                    navigate('/ai-agents');
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Connect First Agent
                </button>
              </div>
            ) : (
              <>
                {/* Agents List */}
                <div className="max-h-72 overflow-y-auto">
                  {agents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        onSelectAgent(agent);
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedAgent?.id === agent.id
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {agent.providerLogoUrl && (
                          <img
                            src={agent.providerLogoUrl}
                            alt={agent.providerDisplayName}
                            className="w-5 h-5 mt-0.5 flex-shrink-0 rounded object-contain"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                              {agent.agentName}
                            </p>
                            {agent.isDefault && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                            {selectedAgent?.id === agent.id && (
                              <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {agent.providerDisplayName} • {agent.model}
                          </p>
                          {agent.status !== 'active' && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                              ⚠️ Status: {agent.status}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                  <button
                    onClick={() => {
                      navigate('/ai-agents');
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Connect New Agent
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
