import axios from 'axios';
import apiCache from './cache';

// Create axios instance with caching
const cachedAxios = axios.create();

// Cache configuration per endpoint
const cacheConfig = {
  // Cache dashboard stats for 2 minutes
  '/api/v1/dashboard/stats': { ttl: 2 * 60 * 1000 },
  
  // Cache properties, tenants, etc. for 5 minutes
  '/api/v1/properties': { ttl: 5 * 60 * 1000 },
  '/api/v2/accounts': { ttl: 5 * 60 * 1000 },
  '/api/v1/customers': { ttl: 5 * 60 * 1000 },
  '/api/v1/invoices': { ttl: 3 * 60 * 1000 },
  '/api/v1/tasks': { ttl: 2 * 60 * 1000 },
  '/api/v1/contracts': { ttl: 5 * 60 * 1000 },
  
  // Cache user data for 5-10 minutes
  '/api/v1/users': { ttl: 5 * 60 * 1000 },
  '/api/v1/users/me': { ttl: 10 * 60 * 1000 },
};

// Check if URL should be cached
const shouldCache = (method, url) => {
  if (method.toLowerCase() !== 'get') {
    return false;
  }
  
  // Check if URL matches any cache config pattern
  for (const pattern in cacheConfig) {
    if (url.includes(pattern)) {
      return true;
    }
  }
  
  return false;
};

// Get cache TTL for URL
const getCacheTTL = (url) => {
  for (const pattern in cacheConfig) {
    if (url.includes(pattern)) {
      return cacheConfig[pattern].ttl;
    }
  }
  return apiCache.defaultTTL;
};

// Request interceptor - check cache before making request and copy auth headers
cachedAxios.interceptors.request.use(
  (config) => {
    // Copy authorization header from default axios
    if (axios.defaults.headers.common['Authorization']) {
      config.headers['Authorization'] = axios.defaults.headers.common['Authorization'];
    }
    
    const { method, url, params } = config;
    
    if (shouldCache(method, url)) {
      const cachedData = apiCache.get(url, params);
      if (cachedData) {
        // Return cached data by transforming it into a response-like object
        return Promise.reject({
          cached: true,
          data: cachedData,
          status: 200,
          statusText: 'OK (cached)',
          headers: {},
          config
        });
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - cache successful responses
cachedAxios.interceptors.response.use(
  (response) => {
    const { method, url, params } = response.config;
    
    if (shouldCache(method, url) && response.status === 200) {
      const ttl = getCacheTTL(url);
      apiCache.set(url, response.data, params, ttl);
    }
    
    return response;
  },
  (error) => {
    // Handle cached responses (from request interceptor)
    if (error.cached) {
      return Promise.resolve(error);
    }
    
    // Clear cache on auth errors to force fresh data on re-login
    if (error.response?.status === 401 || error.response?.status === 403) {
      apiCache.clear();
    }
    
    return Promise.reject(error);
  }
);

// Helper function to invalidate cache for specific patterns
export const invalidateCache = (pattern) => {
  if (pattern) {
    // Clear specific pattern cache entries
    const keys = Array.from(apiCache.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        // Just delete the key directly since we don't need to parse it
        apiCache.cache.delete(key);
      }
    });
  } else {
    // Clear all cache
    apiCache.clear();
  }
};

// Helper function to get cache stats
export const getCacheStats = () => apiCache.getStats();

export default cachedAxios;