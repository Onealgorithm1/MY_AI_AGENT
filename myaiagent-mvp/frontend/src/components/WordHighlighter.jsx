import { memo } from 'react';

const WordHighlighter = memo(({ text, currentWordIndex, wordTimings, className = '' }) => {
  if (!wordTimings || wordTimings.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {wordTimings.map((timing, index) => (
        <span
          key={index}
          className={`
            transition-all duration-100
            ${currentWordIndex === index 
              ? 'bg-yellow-200 dark:bg-yellow-600/40 rounded px-0.5' 
              : ''
            }
          `}
        >
          {timing.word}
          {index < wordTimings.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
});

WordHighlighter.displayName = 'WordHighlighter';

export default WordHighlighter;
