import { Mic, Loader2, Wifi, WifiOff } from 'lucide-react';

/**
 * Visual indicator for voice input with real-time feedback
 * Shows recording state, connection status, and partial transcripts
 */
export default function VoiceInputIndicator({
  isListening,
  isTranscribing,
  partialTranscript,
  isUsingWebSocket = false,
  error = null
}) {
  if (!isListening && !isTranscribing) {
    return null;
  }

  return (
    <div className="absolute -top-16 left-0 right-0 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-lg backdrop-blur-sm z-10 animate-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {isTranscribing ? (
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          ) : (
            <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Status Text */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-blue-800 dark:text-blue-300">
              {isTranscribing ? 'Processing...' : 'Listening'}
            </span>

            {/* Connection Status Badge */}
            {isListening && !isTranscribing && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50">
                {isUsingWebSocket ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-600 dark:text-green-400" />
                    <span className="text-[10px] font-medium text-green-700 dark:text-green-300">
                      Real-time
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                      Standard
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Partial Transcript or Placeholder */}
          {isListening && !isTranscribing && (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {partialTranscript ? (
                <span className="animate-in fade-in duration-150">
                  {partialTranscript}
                  <span className="inline-block w-1 h-4 ml-1 bg-blue-600 dark:bg-blue-400 animate-pulse" />
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 italic">
                  Speak now...
                </span>
              )}
            </div>
          )}

          {/* Processing Message */}
          {isTranscribing && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Converting speech to text...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Visual Audio Wave (only when listening) */}
        {isListening && !isTranscribing && (
          <div className="flex items-center gap-0.5 h-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: `${0.6 + Math.random() * 0.4}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress Bar (when listening) */}
      {isListening && !isTranscribing && (
        <div className="mt-2 h-0.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"
               style={{ width: partialTranscript ? '70%' : '30%', transition: 'width 0.3s ease' }}
          />
        </div>
      )}
    </div>
  );
}
