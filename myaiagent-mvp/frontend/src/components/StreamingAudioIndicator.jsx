import { Loader2, Radio, Volume2 } from 'lucide-react';

/**
 * Streaming Audio Status Indicator
 * Shows real-time status for streaming TTS with progress tracking and latency metrics
 */
export default function StreamingAudioIndicator({ state, progress, error, latencyMs, showLatency = true }) {
  if (state === 'idle' || state === 'error') {
    return null;
  }

  const getStatusConfig = () => {
    switch (state) {
      case 'loading':
        return {
          icon: <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />,
          text: 'Preparing Audio Stream...',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-700 dark:text-blue-300',
        };
      case 'streaming':
        return {
          icon: <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />,
          text: 'Streaming Audio',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          textColor: 'text-purple-700 dark:text-purple-300',
        };
      case 'playing':
        return {
          icon: <Radio className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />,
          text: 'Playing Audio',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-700 dark:text-green-300',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const showProgress = progress && progress.total > 0;
  const progressPercent = showProgress 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <div className={`flex flex-col gap-2 mt-2 ml-2 px-3 py-2 ${config.bgColor} border ${config.borderColor} rounded-lg text-sm`}>
      <div className="flex items-center gap-2">
        {config.icon}
        <span className={`${config.textColor} font-medium`}>
          {config.text}
        </span>
        {showProgress && state === 'streaming' && (
          <span className={`${config.textColor} text-xs ml-auto`}>
            Chunk {progress.current}/{progress.total}
          </span>
        )}
      </div>
      
      {/* Progress bar for streaming */}
      {showProgress && (state === 'streaming' || state === 'playing') && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              state === 'streaming' ? 'bg-purple-500' : 'bg-green-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Latency metrics display */}
      {showLatency && latencyMs != null && (
        <div className="flex items-center justify-between text-xs">
          <span className={config.textColor}>Response Time:</span>
          <span className={`${config.textColor} font-mono font-semibold`}>
            {latencyMs < 1000 ? `${Math.round(latencyMs)}ms` : `${(latencyMs / 1000).toFixed(2)}s`}
          </span>
        </div>
      )}

      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
