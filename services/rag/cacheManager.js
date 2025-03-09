// services/rag/cacheManager.js
const logger = require('../../utils/logger');

/**
 * Simple in-memory cache implementation
 */
class CacheManager {
  constructor(maxSize = 100, ttl = 1000 * 60 * 15) {
    this.cache = {};
    this.maxSize = maxSize;
    this.ttl = ttl; // 15 minutes in milliseconds by default
  }
  
  set(key, value) {
    logger.info(`🔍 CACHE: Attempting to store key "${key.substring(0, 30)}..."`);
    
    // Remove oldest entry if we're at capacity
    const keys = Object.keys(this.cache);
    if (keys.length >= this.maxSize) {
      let oldestKey = keys[0];
      let oldestTime = this.cache[oldestKey].timestamp;
      
      for (const k of keys) {
        if (this.cache[k].timestamp < oldestTime) {
          oldestKey = k;
          oldestTime = this.cache[k].timestamp;
        }
      }
      
      logger.info(`🔍 CACHE: Cache full, removing oldest key "${oldestKey.substring(0, 30)}..."`);
      delete this.cache[oldestKey];
    }
    
    // Add new entry
    this.cache[key] = {
      value: value,
      timestamp: Date.now()
    };
    logger.info(`🔍 CACHE: Successfully stored key, current cache size: ${Object.keys(this.cache).length}`);
  }
  
  get(key) {
    logger.info(`🔍 CACHE: Attempting to retrieve key "${key.substring(0, 30)}..."`);
    
    const entry = this.cache[key];
    if (!entry) {
      logger.info(`🔍 CACHE: Key not found in cache`);
      return undefined;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      logger.info(`🔍 CACHE: Key found but expired (TTL: ${this.ttl}ms, Age: ${Date.now() - entry.timestamp}ms)`);
      delete this.cache[key];
      return undefined;
    }
    
    // Update access time
    entry.timestamp = Date.now();
    logger.info(`🔍 CACHE: Key found and valid, updating timestamp`);
    return entry.value;
  }
  
  has(key) {
    logger.info(`🔍 CACHE: Checking if key exists "${key.substring(0, 30)}..."`);
    
    const entry = this.cache[key];
    if (!entry) {
      logger.info(`🔍 CACHE: Key does not exist`);
      return false;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      logger.info(`🔍 CACHE: Key exists but expired (TTL: ${this.ttl}ms, Age: ${Date.now() - entry.timestamp}ms)`);
      delete this.cache[key];
      return false;
    }
    
    logger.info(`🔍 CACHE: Key exists and is valid`);
    return true;
  }
  
  clear() {
    logger.info(`🔍 CACHE: Clearing entire cache of ${Object.keys(this.cache).length} entries`);
    this.cache = {};
  }
  
  get size() {
    return Object.keys(this.cache).length;
  }
  
  getStats() {
    return {
      size: this.size,
      itemCount: this.size,
      maxSize: this.maxSize
    };
  }
}

// Create and export a singleton instance
const queryCache = new CacheManager();

module.exports = {
  queryCache
};