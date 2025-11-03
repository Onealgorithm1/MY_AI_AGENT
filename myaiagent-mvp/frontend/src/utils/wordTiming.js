export function calculateWordTimings(text, audioDuration) {
  const words = text.split(/(\s+)/).filter(part => part.trim().length > 0);
  
  // More realistic timing model with pauses and delays
  const wordCharCounts = words.map(word => {
    let charCount = word.length;
    
    // Add significant pause after sentence endings
    if (/[.!?]$/.test(word)) {
      charCount += 4; // Longer pause after sentences
    } else if (/[,;:]$/.test(word)) {
      charCount += 2; // Medium pause after commas
    }
    
    // Longer words take more time to pronounce
    if (word.length > 9) {
      charCount += 2;
    }
    
    return charCount;
  });
  
  const totalChars = wordCharCounts.reduce((sum, count) => sum + count, 0);
  
  // Account for natural silence at start of audio (typically 100-300ms)
  const startDelay = Math.min(0.25, audioDuration * 0.05);
  // Reserve time for trailing silence
  const usableAudioDuration = audioDuration - startDelay - 0.1;
  
  const timings = [];
  let currentTime = startDelay;
  
  words.forEach((word, index) => {
    const charCount = wordCharCounts[index];
    const duration = (charCount / totalChars) * usableAudioDuration;
    
    timings.push({
      word,
      startTime: currentTime,
      endTime: currentTime + duration,
      duration,
    });
    
    currentTime += duration;
  });
  
  return timings;
}

export function getCurrentWordIndex(wordTimings, currentTime) {
  if (!wordTimings || wordTimings.length === 0) return -1;
  
  for (let i = 0; i < wordTimings.length; i++) {
    if (currentTime >= wordTimings[i].startTime && currentTime < wordTimings[i].endTime) {
      return i;
    }
  }
  
  if (currentTime >= wordTimings[wordTimings.length - 1].endTime) {
    return wordTimings.length;
  }
  
  return -1;
}

export function getWordAtTime(wordTimings, currentTime) {
  const index = getCurrentWordIndex(wordTimings, currentTime);
  if (index < 0 || index >= wordTimings.length) return null;
  return wordTimings[index];
}
