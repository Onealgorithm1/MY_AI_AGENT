import { useState, useEffect, useRef } from 'react';

const useTypewriter = (text, options = {}) => {
  const {
    speed = 'snappy', // 'snappy' (250 WPM), 'thoughtful' (150 WPM), 'professional' (180 WPM)
    enabled = true,
    onComplete = null,
  } = options;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef(null);
  const isPausedRef = useRef(false);

  // WPM to milliseconds per character conversion
  const getBaseDelay = (speedSetting) => {
    const wpmToMs = (wpm) => (60 * 1000) / (wpm * 5); // Average 5 chars per word
    const speeds = {
      snappy: wpmToMs(250),      // ~48ms per char
      thoughtful: wpmToMs(150),  // ~80ms per char
      professional: wpmToMs(180), // ~67ms per char
    };
    return speeds[speedSetting] || speeds.snappy;
  };

  const getCharDelay = (char, nextChars = '') => {
    const baseDelay = getBaseDelay(speed);
    
    // Add variance based on punctuation and word length
    if (['.', ',', '!', '?'].includes(char)) {
      return baseDelay + 50;
    }
    
    // Paragraph break detection (double newline)
    if (char === '\n' && nextChars[0] === '\n') {
      return baseDelay + 120;
    }
    
    // Longer words get slight pause
    const wordBoundary = [' ', '\n', '\t'];
    if (wordBoundary.includes(char)) {
      const previousWord = displayedText.split(/[\s\n\t]/).pop() || '';
      if (previousWord.length > 9) {
        return baseDelay + 30;
      }
    }
    
    return baseDelay;
  };

  // Reset when text changes
  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setCurrentIndex(0);
    setIsTyping(true);
    isPausedRef.current = false;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [text, enabled]);

  // Typewriter effect
  useEffect(() => {
    if (!enabled || !isTyping || isPausedRef.current) return;

    if (currentIndex < text.length) {
      const char = text[currentIndex];
      const nextChars = text.slice(currentIndex + 1);
      const delay = getCharDelay(char, nextChars);

      timeoutRef.current = setTimeout(() => {
        setDisplayedText((prev) => prev + char);
        setCurrentIndex((prev) => prev + 1);
      }, delay);
    } else if (currentIndex >= text.length && isTyping) {
      setIsTyping(false);
      if (onComplete) {
        onComplete();
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex, text, enabled, isTyping]);

  const pause = () => {
    isPausedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const resume = () => {
    isPausedRef.current = false;
    if (currentIndex < text.length) {
      setIsTyping(true);
    }
  };

  const reset = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText('');
    setCurrentIndex(0);
    setIsTyping(true);
    isPausedRef.current = false;
  };

  const skip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText(text);
    setCurrentIndex(text.length);
    setIsTyping(false);
    if (onComplete) {
      onComplete();
    }
  };

  return {
    displayedText,
    isTyping,
    progress: text.length > 0 ? (currentIndex / text.length) * 100 : 100,
    pause,
    resume,
    reset,
    skip,
  };
};

export default useTypewriter;
