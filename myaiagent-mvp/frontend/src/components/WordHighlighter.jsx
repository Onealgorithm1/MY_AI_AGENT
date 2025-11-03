import { memo } from 'react';

const WordHighlighter = memo(({ text, currentWordIndex, wordTimings, className = '' }) => {
  if (!wordTimings || wordTimings.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // When currentWordIndex is -1 (idle/stopped), show full text
  const isIdle = currentWordIndex === -1;
  const maxVisibleIndex = isIdle ? wordTimings.length - 1 : currentWordIndex;

  return (
    <span className={className}>
      {wordTimings.map((timing, index) => {
        const isVisible = index <= maxVisibleIndex;
        const isCurrent = currentWordIndex === index && !isIdle;
        
        return (
          <span
            key={index}
            className={`
              inline-block transition-all duration-200 ease-out
              ${!isVisible ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
              ${isCurrent 
                ? 'bg-yellow-200 dark:bg-yellow-600/40 rounded px-0.5' 
                : ''
              }
            `}
          >
            {timing.word}
            {index < wordTimings.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </span>
  );
});

WordHighlighter.displayName = 'WordHighlighter';

export default WordHighlighter;
