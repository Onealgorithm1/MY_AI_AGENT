import { useEffect } from 'react';
import { Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import MessageSpeakerButton from './MessageSpeakerButton';
import WordHighlighter from './WordHighlighter';
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
  const {
    state,
    currentWordIndex,
    wordTimings,
    error,
    toggle,
    play,
    retry,
    isError,
    hasPlayed,
  } = useMessageAudio(message.id, message.content, voiceId);

  useEffect(() => {
    if (shouldAutoPlay && ttsEnabled && ttsAutoPlay && !hasPlayed && state === 'idle') {
      const timer = setTimeout(() => {
        play();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoPlay, ttsEnabled, ttsAutoPlay, hasPlayed, state, play]);

  return (
    <div className="max-w-[80%]">
      <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
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

      <div className="flex items-center gap-3 mt-1.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {ttsEnabled && (
          <MessageSpeakerButton
            state={state}
            onClick={isError ? retry : toggle}
            isError={isError}
          />
        )}
        
        <button
          onClick={() => onCopy(message.content)}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Copy message"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        
        <button
          onClick={() => onFeedback(message.id, 1)}
          className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          title="Good response"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        
        <button
          onClick={() => onFeedback(message.id, -1)}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Bad response"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
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
