import { CheckCircle, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';

export default function AIAgentsList({
  agents = [],
  loading = false,
  onDeleteAgent,
  onSetDefault,
  onTestAgent,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-600 dark:text-gray-400">No AI agents connected yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {agents.map(agent => (
        <div
          key={agent.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {agent.agentName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {agent.providerDisplayName} • {agent.model}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {agent.status === 'active' ? (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Error
                </div>
              )}

              {agent.isDefault && (
                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                  Default
                </span>
              )}

              <button
                onClick={() => onTestAgent?.(agent.id)}
                className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Test
              </button>

              {!agent.isDefault && (
                <button
                  onClick={() => onSetDefault?.(agent.id)}
                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  Default
                </button>
              )}

              <button
                onClick={() => onDeleteAgent?.(agent.id)}
                className="p-1 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
