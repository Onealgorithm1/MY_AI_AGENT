export function calculateWordTimings(text, audioDuration) {
  const words = text.split(/(\s+)/).filter(part => part.trim().length > 0);
  
  const wordCharCounts = words.map(word => {
    let charCount = word.length;
    
    if (/[.!?]$/.test(word)) {
      charCount += 2;
    } else if (/[,;:]$/.test(word)) {
      charCount += 1;
    }
    
    if (word.length > 9) {
      charCount += 1;
    }
    
    return charCount;
  });
  
  const totalChars = wordCharCounts.reduce((sum, count) => sum + count, 0);
  
  const timings = [];
  let currentTime = 0;
  
  words.forEach((word, index) => {
    const charCount = wordCharCounts[index];
    const duration = (charCount / totalChars) * audioDuration;
    
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
