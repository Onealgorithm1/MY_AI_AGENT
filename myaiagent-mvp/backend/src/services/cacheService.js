/**
 * Simple In-Memory Cache Service with TTL
 * Reduces database load for frequently accessed data
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  /**
   * Generate cache key
   */
  _generateKey(namespace, key) {
    return `${namespace}:${key}`;
  }

  /**
   * Set cache value with TTL
   * @param {string} namespace - Cache namespace (e.g., 'user_preferences', 'memory_facts')
   * @param {string} key - Cache key (e.g., user ID)
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   */
  set(namespace, key, value, ttl = 5 * 60 * 1000) {
    const cacheKey = this._generateKey(namespace, key);
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(cacheKey, {
      value,
      expiresAt,
    });
    
    this.stats.sets++;
  }

  /**
   * Get cache value
   * @param {string} namespace - Cache namespace
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found/expired
   */
  get(namespace, key) {
    const cacheKey = this._generateKey(namespace, key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Invalidate cache entry
   * @param {string} namespace - Cache namespace
   * @param {string} key - Cache key
   */
  invalidate(namespace, key) {
    const cacheKey = this._generateKey(namespace, key);
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all entries in a namespace
   * @param {string} namespace - Cache namespace
   */
  invalidateNamespace(namespace) {
    const prefix = `${namespace}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      total,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
    };
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Create singleton instance
const cache = new CacheService();

// Run cleanup every 10 minutes
setInterval(() => {
  const cleaned = cache.cleanup();
  if (cleaned > 0) {
    console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
  }
}, 10 * 60 * 1000);

export default cache;
