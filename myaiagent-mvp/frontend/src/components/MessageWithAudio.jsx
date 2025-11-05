import { useEffect, useMemo } from 'react';
import { Copy, ThumbsUp, ThumbsDown, Search, Loader2, Radio } from 'lucide-react';
import MessageSpeakerButton from './MessageSpeakerButton';
import WordHighlighter from './WordHighlighter';
import CodeBlock from './CodeBlock';
import useMessageAudio from '../hooks/useMessageAudio';

export default function MessageWithAudio({
  message,
  voiceId,
  ttsEnabled,
  ttsAutoPlay,
  onCopy,
  onFeedback,
  searchResults,
  shouldAutoPlay = false,
}) {
  // Check if message is code presentation protocol
  const codePresentation = useMemo(() => {
    try {
      const parsed = JSON.parse(message.content);
      if (parsed.presentation_protocol === 'PRESENT_CODE') {
        return parsed;
      }
    } catch (e) {
      // Not JSON or not code presentation - treat as normal text
    }
    return null;
  }, [message.content]);

  // Only use TTS for non-code presentations
  const shouldUseTTS = !codePresentation && ttsEnabled;

  // Conditionally call useMessageAudio hook - only for non-code presentations
  const audioHook = useMessageAudio(
    message.id, 
    codePresentation ? '' : message.content, // Pass empty string for code to prevent loading
    voiceId
  );

  // Destructure hook results (will have default idle state for code presentations)
  const {
    state = 'idle',
    currentWordIndex = -1,
    wordTimings = null,
    error = null,
    latencyMs = null,
    toggle = () => {},
    play = () => {},
    retry = () => {},
    isError = false,
    hasPlayed = false,
  } = codePresentation ? {} : audioHook;

  useEffect(() => {
    if (shouldAutoPlay && shouldUseTTS && ttsAutoPlay && !hasPlayed && state === 'idle') {
      const timer = setTimeout(() => {
        play();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoPlay, shouldUseTTS, ttsAutoPlay, hasPlayed, state, play]);

  // If this is a code presentation, render CodeBlock instead
  if (codePresentation) {
    const codeContent = Array.isArray(codePresentation.data) 
      ? codePresentation.data.join('\n') 
      : codePresentation.data;

    return (
      <div className="max-w-full w-full">
        <CodeBlock
          title={codePresentation.content_title}
          contentType={codePresentation.content_type}
          data={codePresentation.data}
        />
        
        <div className="flex items-center gap-3 mt-1.5 ml-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onCopy(codeContent)}
            className="p-2 md:p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:text-gray-700 dark:active:text-gray-100 active:bg-gray-200 dark:active:bg-gray-600 transition-colors touch-manipulation"
            title="Copy code"
          >
            <Copy className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
          
          <button
            onClick={() => onFeedback(message.id, 1)}
            className="p-2 md:p-1.5 rounded-full text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 active:text-green-700 dark:active:text-green-300 active:bg-green-100 dark:active:bg-green-900/30 transition-colors touch-manipulation"
            title="Good response"
          >
            <ThumbsUp className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
          
          <button
            onClick={() => onFeedback(message.id, -1)}
            className="p-2 md:p-1.5 rounded-full text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:text-red-700 dark:active:text-red-300 active:bg-red-100 dark:active:bg-red-900/30 transition-colors touch-manipulation"
            title="Bad response"
          >
            <ThumbsDown className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
          
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium ml-auto">
            {message.metadata?.autoSelected 
              ? `Auto 🤖 (${message.model})` 
              : message.model}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[80%]">
      <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white relative">
        {searchResults && (
          <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
            <Search className="w-3 h-3" />
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {state === 'playing' && wordTimings ? (
            <WordHighlighter
              text={message.content}
              currentWordIndex={currentWordIndex}
              wordTimings={wordTimings}
            />
          ) : (
            message.content
          )}
        </div>
      </div>

      {searchResults && (
        <div className="mt-2">
          {searchResults}
        </div>
      )}

      {/* TTS Status Indicator */}
      {ttsEnabled && (state === 'loading' || state === 'playing') && (
        <div className="flex flex-col gap-2 mt-2 ml-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            {state === 'loading' && (
              <>
                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  Synthesizing Speech...
                </span>
              </>
            )}
            {state === 'playing' && (
              <>
                <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  Playing Audio
                </span>
              </>
            )}
          </div>
          
          {/* Latency metrics display */}
          {latencyMs != null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-700 dark:text-blue-300">Response Time:</span>
              <span className="text-blue-700 dark:text-blue-300 font-mono font-semibold">
                {latencyMs < 1000 ? `${latencyMs}ms` : `${(latencyMs / 1000).toFixed(2)}s`}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mt-1.5 ml-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
        {ttsEnabled && (
          <MessageSpeakerButton
            state={state}
            onClick={isError ? retry : toggle}
            isError={isError}
          />
        )}
        
        <button
          onClick={() => onCopy(message.content)}
          className="p-2 md:p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:text-gray-700 dark:active:text-gray-100 active:bg-gray-200 dark:active:bg-gray-600 transition-colors touch-manipulation"
          title="Copy message"
        >
          <Copy className="w-4 h-4 md:w-3.5 md:h-3.5" />
        </button>
        
        <button
          onClick={() => onFeedback(message.id, 1)}
          className="p-2 md:p-1.5 rounded-full text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 active:text-green-700 dark:active:text-green-300 active:bg-green-100 dark:active:bg-green-900/30 transition-colors touch-manipulation"
          title="Good response"
        >
          <ThumbsUp className="w-4 h-4 md:w-3.5 md:h-3.5" />
        </button>
        
        <button
          onClick={() => onFeedback(message.id, -1)}
          className="p-2 md:p-1.5 rounded-full text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:text-red-700 dark:active:text-red-300 active:bg-red-100 dark:active:bg-red-900/30 transition-colors touch-manipulation"
          title="Bad response"
        >
          <ThumbsDown className="w-4 h-4 md:w-3.5 md:h-3.5" />
        </button>
        
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium ml-auto">
          {message.metadata?.autoSelected 
            ? `Auto 🤖 (${message.model})` 
            : message.model}
        </span>
      </div>
    </div>
  );
}
