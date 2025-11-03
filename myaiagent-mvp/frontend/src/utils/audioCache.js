const CACHE_PREFIX = 'tts_audio_';
const MAX_CACHE_SIZE = 50 * 1024 * 1024;
const CACHE_METADATA_KEY = 'tts_cache_metadata';

function getCacheKey(messageId, voiceId) {
  return `${CACHE_PREFIX}${messageId}_${voiceId}`;
}

function getCacheMetadata() {
  try {
    const metadata = localStorage.getItem(CACHE_METADATA_KEY);
    return metadata ? JSON.parse(metadata) : {};
  } catch (error) {
    console.error('Failed to read cache metadata:', error);
    return {};
  }
}

function saveCacheMetadata(metadata) {
  try {
    localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Failed to save cache metadata:', error);
  }
}

function getTotalCacheSize() {
  const metadata = getCacheMetadata();
  return Object.values(metadata).reduce((total, item) => total + (item.size || 0), 0);
}

function pruneCache(requiredSpace = 0) {
  const metadata = getCacheMetadata();
  const entries = Object.entries(metadata).sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
  
  let currentSize = getTotalCacheSize();
  
  for (const [key, item] of entries) {
    if (currentSize + requiredSpace <= MAX_CACHE_SIZE) {
      break;
    }
    
    try {
      localStorage.removeItem(key);
      currentSize -= item.size || 0;
      delete metadata[key];
    } catch (error) {
      console.error('Failed to prune cache item:', error);
    }
  }
  
  saveCacheMetadata(metadata);
}

export async function getCachedAudio(messageId, voiceId) {
  const key = getCacheKey(messageId, voiceId);
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const metadata = getCacheMetadata();
    if (metadata[key]) {
      metadata[key].lastAccessed = Date.now();
      saveCacheMetadata(metadata);
    }
    
    const binaryString = atob(cached);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Blob([bytes], { type: 'audio/mpeg' });
  } catch (error) {
    console.error('Failed to retrieve cached audio:', error);
    return null;
  }
}

export async function cacheAudio(messageId, voiceId, audioBlob) {
  const key = getCacheKey(messageId, voiceId);
  
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binaryString);
    
    const size = base64.length;
    
    if (size > MAX_CACHE_SIZE) {
      console.warn('Audio file too large to cache');
      return false;
    }
    
    const currentSize = getTotalCacheSize();
    if (currentSize + size > MAX_CACHE_SIZE) {
      pruneCache(size);
    }
    
    localStorage.setItem(key, base64);
    
    const metadata = getCacheMetadata();
    metadata[key] = {
      messageId,
      voiceId,
      size,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };
    saveCacheMetadata(metadata);
    
    return true;
  } catch (error) {
    console.error('Failed to cache audio:', error);
    
    if (error.name === 'QuotaExceededError') {
      pruneCache(0);
      console.warn('Storage quota exceeded, pruned cache');
    }
    
    return false;
  }
}

export function clearAudioCache() {
  try {
    const metadata = getCacheMetadata();
    Object.keys(metadata).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Failed to remove cache item:', error);
      }
    });
    localStorage.removeItem(CACHE_METADATA_KEY);
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

export function getCacheStats() {
  const metadata = getCacheMetadata();
  const entries = Object.keys(metadata).length;
  const totalSize = getTotalCacheSize();
  
  return {
    entries,
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    maxSizeMB: (MAX_CACHE_SIZE / (1024 * 1024)).toFixed(2),
    usagePercent: ((totalSize / MAX_CACHE_SIZE) * 100).toFixed(1),
  };
}
