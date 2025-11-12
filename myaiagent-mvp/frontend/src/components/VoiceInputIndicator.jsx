import { Mic, Loader2, Wifi, WifiOff, Brain, Volume2 } from 'lucide-react';

/**
 * Visual indicator for voice UI with real-time feedback
 * Shows states: Listening → Transcribing → Thinking → Speaking
 * Per VUI optimization requirements
 */
export default function VoiceInputIndicator({
  isListening,
  isTranscribing,
  isThinking,
  isSpeaking,
  partialTranscript,
  isUsingWebSocket = false,
  error = null
}) {
  // Don't show if no active state
  if (!isListening && !isTranscribing && !isThinking && !isSpeaking) {
    return null;
  }

  // Determine current state and display properties
  let statusText = 'Idle';
  let statusIcon = null;
  let statusColor = 'blue';

  if (isSpeaking) {
    statusText = 'Speaking';
    statusIcon = <Volume2 className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse" />;
    statusColor = 'purple';
  } else if (isThinking) {
    statusText = 'Thinking';
    statusIcon = <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />;
    statusColor = 'indigo';
  } else if (isTranscribing) {
    statusText = 'Processing';
    statusIcon = <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />;
    statusColor = 'blue';
  } else if (isListening) {
    statusText = 'Listening';
    statusIcon = <Mic className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />;
    statusColor = 'green';
  }

  // Dynamic styling based on state
  const bgGradient = {
    green: 'from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30',
    blue: 'from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30',
    indigo: 'from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30',
    purple: 'from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30',
  }[statusColor];

  const borderColor = {
    green: 'border-green-200 dark:border-green-800',
    blue: 'border-blue-200 dark:border-blue-800',
    indigo: 'border-indigo-200 dark:border-indigo-800',
    purple: 'border-purple-200 dark:border-purple-800',
  }[statusColor];

  return (
    <div className={`absolute -top-16 left-0 right-0 px-4 py-3 bg-gradient-to-r ${bgGradient} border ${borderColor} rounded-xl shadow-lg backdrop-blur-sm z-10 animate-in slide-in-from-bottom-2`}>
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {statusIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Status Text */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium text-${statusColor}-800 dark:text-${statusColor}-300`}>
              {statusText}
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

          {/* State-specific content */}
          {isListening && !isTranscribing && !isThinking && !isSpeaking && (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {partialTranscript ? (
                <span className="animate-in fade-in duration-150">
                  {partialTranscript}
                  <span className="inline-block w-1 h-4 ml-1 bg-green-600 dark:bg-green-400 animate-pulse" />
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 italic">
                  Speak now...
                </span>
              )}
            </div>
          )}

          {/* Processing/Transcribing Message */}
          {isTranscribing && !isThinking && !isSpeaking && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Converting speech to text...
            </div>
          )}

          {/* Thinking Message */}
          {isThinking && !isSpeaking && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Processing your request...
            </div>
          )}

          {/* Speaking Message */}
          {isSpeaking && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Playing response...
            </div>
          )}

          {/* Error Message - Gentle and clarifying per VUI requirements */}
          {error && (
            <div className="mt-1 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded-md border border-amber-200 dark:border-amber-800">
              <p className="font-medium">I want to make sure I understood you correctly.</p>
              <p className="text-xs mt-0.5">Could you please rephrase that?</p>
            </div>
          )}
        </div>

        {/* Visual Audio Wave - different per state */}
        {(isListening || isSpeaking) && (
          <div className="flex items-center gap-0.5 h-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full animate-pulse ${
                  isListening ? 'bg-green-500 dark:bg-green-400' : 'bg-purple-500 dark:bg-purple-400'
                }`}
                style={{
                  height: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: `${0.6 + Math.random() * 0.4}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Thinking Animation */}
        {isThinking && (
          <div className="flex items-center gap-1 h-5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '0.6s',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress Bar - dynamic based on state */}
      {!error && (
        <div className={`mt-2 h-0.5 rounded-full overflow-hidden ${
          statusColor === 'green' ? 'bg-green-200 dark:bg-green-800' :
          statusColor === 'blue' ? 'bg-blue-200 dark:bg-blue-800' :
          statusColor === 'indigo' ? 'bg-indigo-200 dark:bg-indigo-800' :
          'bg-purple-200 dark:bg-purple-800'
        }`}>
          <div
            className={`h-full rounded-full animate-pulse ${
              statusColor === 'green' ? 'bg-green-500 dark:bg-green-400' :
              statusColor === 'blue' ? 'bg-blue-500 dark:bg-blue-400' :
              statusColor === 'indigo' ? 'bg-indigo-500 dark:bg-indigo-400' :
              'bg-purple-500 dark:bg-purple-400'
            }`}
            style={{
              width: isListening && partialTranscript ? '70%' :
                     isTranscribing ? '50%' :
                     isThinking ? '80%' :
                     isSpeaking ? '90%' : '30%',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      )}
    </div>
  );
}
