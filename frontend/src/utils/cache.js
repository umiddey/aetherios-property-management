// Simple in-memory cache for API responses
class APICache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  // Generate cache key from URL and options
  generateKey(url, options = {}) {
    const sortedOptions = JSON.stringify(options, Object.keys(options).sort());
    return `${url}:${sortedOptions}`;
  }

  // Set cache entry with TTL
  set(url, data, options = {}, ttl = this.defaultTTL) {
    const key = this.generateKey(url, options);
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(key, {
      data,
      expiresAt,
      timestamp: Date.now()
    });

    // Clean up expired entries periodically
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  // Get cache entry if not expired
  get(url, options = {}) {
    const key = this.generateKey(url, options);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Check if cache has valid entry
  has(url, options = {}) {
    return this.get(url, options) !== null;
  }

  // Clear specific cache entry
  delete(url, options = {}) {
    const key = this.generateKey(url, options);
    return this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired
    };
  }
}

// Create singleton instance
const apiCache = new APICache();

export default apiCache;