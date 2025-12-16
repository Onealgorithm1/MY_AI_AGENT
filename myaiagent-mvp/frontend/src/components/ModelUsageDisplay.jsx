import { useState } from 'react';
import { ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';

const MODELS_DATA = [
  {
    id: 'gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    category: 'Text-out models',
    rpm: { current: 3, limit: 5 },
    tpm: { current: 33480, limit: 250000 },
    rpd: { current: 21, limit: 20 },
    status: 'limited',
  },
  {
    id: 'gemma-3-12b',
    name: 'gemma-3-12b',
    category: 'Other models',
    rpm: { current: 1, limit: 30 },
    tpm: { current: 5, limit: 15000 },
    rpd: { current: 1, limit: 14400 },
    status: 'active',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'gemini-2.5-flash-lite',
    category: 'Text-out models',
    rpm: { current: 0, limit: 10 },
    tpm: { current: 0, limit: 250000 },
    rpd: { current: 0, limit: 20 },
    status: 'active',
  },
  {
    id: 'gemini-2.5-flash-tts',
    name: 'gemini-2.5-flash-tts',
    category: 'Multi-modal generative models',
    rpm: { current: 0, limit: 3 },
    tpm: { current: 0, limit: 10000 },
    rpd: { current: 0, limit: 10 },
    status: 'active',
  },
  {
    id: 'gemini-robotics-er-1.5-preview',
    name: 'gemini-robotics-er-1.5-preview',
    category: 'Other models',
    rpm: { current: 0, limit: 10 },
    tpm: { current: 0, limit: 250000 },
    rpd: { current: 0, limit: 250 },
    status: 'active',
  },
  {
    id: 'gemma-3-1b',
    name: 'gemma-3-1b',
    category: 'Other models',
    rpm: { current: 0, limit: 30 },
    tpm: { current: 0, limit: 15000 },
    rpd: { current: 0, limit: 14400 },
    status: 'active',
  },
  {
    id: 'gemma-3-27b',
    name: 'gemma-3-27b',
    category: 'Other models',
    rpm: { current: 0, limit: 30 },
    tpm: { current: 0, limit: 15000 },
    rpd: { current: 0, limit: 14400 },
    status: 'active',
  },
  {
    id: 'gemma-3-2b',
    name: 'gemma-3-2b',
    category: 'Other models',
    rpm: { current: 0, limit: 30 },
    tpm: { current: 0, limit: 15000 },
    rpd: { current: 0, limit: 14400 },
    status: 'active',
  },
  {
    id: 'gemma-3-4b',
    name: 'gemma-3-4b',
    category: 'Other models',
    rpm: { current: 0, limit: 30 },
    tpm: { current: 0, limit: 15000 },
    rpd: { current: 0, limit: 14400 },
    status: 'active',
  },
  {
    id: 'gemini-2.5-flash-native-audio-dialog',
    name: 'gemini-2.5-flash-native-audio-dialog',
    category: 'Live API',
    rpm: { current: 0, limit: 'Unlimited' },
    tpm: { current: 0, limit: 1000000 },
    rpd: { current: 0, limit: 'Unlimited' },
    status: 'active',
  },
];

function formatNumber(num) {
  if (num === 'Unlimited') return 'Unlimited';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getUsagePercentage(current, limit) {
  if (limit === 'Unlimited') return 0;
  return Math.round((current / limit) * 100);
}

function getUsageColor(percentage) {
  if (percentage >= 80) return 'bg-red-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getStatusBadgeStyle(status) {
  if (status === 'limited') {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
  }
  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
}

export default function ModelUsageDisplay({ selectedModel, onSelectModel }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentModel = MODELS_DATA.find(m => m.id === selectedModel) || MODELS_DATA[0];

  const handleSelectModel = (model) => {
    onSelectModel(model.id);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      {/* Model Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="truncate font-medium">{currentModel.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentModel.category}</div>
        </div>
        <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />
      </button>

      {/* Current Model Usage Info */}
      {!isOpen && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
            <div className="text-gray-600 dark:text-gray-400 font-medium">RPM</div>
            <div className="text-gray-900 dark:text-white font-semibold">
              {currentModel.rpm.current} / {formatNumber(currentModel.rpm.limit)}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div
                className={`h-full rounded-full ${getUsageColor(getUsagePercentage(currentModel.rpm.current, currentModel.rpm.limit))}`}
                style={{ width: `${Math.min(getUsagePercentage(currentModel.rpm.current, currentModel.rpm.limit), 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
            <div className="text-gray-600 dark:text-gray-400 font-medium">TPM</div>
            <div className="text-gray-900 dark:text-white font-semibold">
              {formatNumber(currentModel.tpm.current)} / {formatNumber(currentModel.tpm.limit)}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div
                className={`h-full rounded-full ${getUsageColor(getUsagePercentage(currentModel.tpm.current, currentModel.tpm.limit))}`}
                style={{ width: `${Math.min(getUsagePercentage(currentModel.tpm.current, currentModel.tpm.limit), 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
            <div className="text-gray-600 dark:text-gray-400 font-medium">RPD</div>
            <div className="text-gray-900 dark:text-white font-semibold">
              {currentModel.rpd.current} / {formatNumber(currentModel.rpd.limit)}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div
                className={`h-full rounded-full ${getUsageColor(getUsagePercentage(currentModel.rpd.current, currentModel.rpd.limit))}`}
                style={{ width: `${Math.min(getUsagePercentage(currentModel.rpd.current, currentModel.rpd.limit), 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-3 space-y-2">
              {MODELS_DATA.map(model => {
                const rpmPercent = getUsagePercentage(model.rpm.current, model.rpm.limit);
                const tpmPercent = getUsagePercentage(model.tpm.current, model.tpm.limit);
                const rpdPercent = getUsagePercentage(model.rpd.current, model.rpd.limit);
                const isSelected = model.id === selectedModel;

                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {model.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {model.category}
                        </div>
                      </div>
                      <div className={`ml-2 flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${getStatusBadgeStyle(model.status)}`}>
                        {model.status === 'limited' ? (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Limited
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Usage Bars */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">RPM</div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {model.rpm.current}/{formatNumber(model.rpm.limit)}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div
                            className={`h-full rounded-full ${getUsageColor(rpmPercent)}`}
                            style={{ width: `${Math.min(rpmPercent, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">TPM</div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {formatNumber(model.tpm.current)}/{formatNumber(model.tpm.limit)}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div
                            className={`h-full rounded-full ${getUsageColor(tpmPercent)}`}
                            style={{ width: `${Math.min(tpmPercent, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">RPD</div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {model.rpd.current}/{formatNumber(model.rpd.limit)}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div
                            className={`h-full rounded-full ${getUsageColor(rpdPercent)}`}
                            style={{ width: `${Math.min(rpdPercent, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
