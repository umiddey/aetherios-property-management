/**
 * Secure Token Storage Utility
 * Provides secure token management with XSS protection
 * 
 * Security measures implemented:
 * 1. Uses sessionStorage instead of localStorage for temporary storage
 * 2. Implements token refresh mechanisms
 * 3. Automatic token expiration handling
 * 4. Sanitizes stored data
 */

const PORTAL_TOKEN_KEY = 'portal_token';
const PORTAL_USER_KEY = 'portal_user';
const PORTAL_TOKEN_EXPIRES_KEY = 'portal_token_expires';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

class SecureStorage {
  constructor() {
    // Use sessionStorage instead of localStorage for better security
    // sessionStorage is cleared when tab closes, reducing exposure time
    this.storage = sessionStorage;
  }

  /**
   * Store portal authentication token securely
   * @param {string} token - JWT access token
   * @param {Object} user - User account data
   * @param {number} expiresIn - Token expiration time in seconds (default 24h)
   */
  setPortalAuth(token, user, expiresIn = 24 * 60 * 60) {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token provided');
    }

    const expirationTime = Date.now() + (expiresIn * 1000);
    
    try {
      // Store token with expiration
      this.storage.setItem(PORTAL_TOKEN_KEY, token);
      this.storage.setItem(PORTAL_TOKEN_EXPIRES_KEY, expirationTime.toString());
      
      // Sanitize and store user data
      if (user) {
        const sanitizedUser = this._sanitizeUserData(user);
        this.storage.setItem(PORTAL_USER_KEY, JSON.stringify(sanitizedUser));
      }
    } catch (error) {
      console.error('Failed to store portal authentication:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  /**
   * Get portal authentication token if valid
   * @returns {string|null} - Valid token or null if expired/invalid
   */
  getPortalToken() {
    try {
      const token = this.storage.getItem(PORTAL_TOKEN_KEY);
      const expirationTime = this.storage.getItem(PORTAL_TOKEN_EXPIRES_KEY);
      
      if (!token || !expirationTime) {
        return null;
      }

      // Check if token is expired
      if (Date.now() >= parseInt(expirationTime)) {
        this.clearPortalAuth();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Failed to retrieve portal token:', error);
      return null;
    }
  }

  /**
   * Get portal user data
   * @returns {Object|null} - User data or null if not available
   */
  getPortalUser() {
    try {
      const userJson = this.storage.getItem(PORTAL_USER_KEY);
      const token = this.getPortalToken(); // This also validates expiration
      
      if (!userJson || !token) {
        return null;
      }

      return JSON.parse(userJson);
    } catch (error) {
      console.error('Failed to retrieve portal user:', error);
      return null;
    }
  }

  /**
   * Check if token needs refresh (within threshold of expiration)
   * @returns {boolean} - True if token should be refreshed
   */
  shouldRefreshToken() {
    try {
      const expirationTime = this.storage.getItem(PORTAL_TOKEN_EXPIRES_KEY);
      
      if (!expirationTime) {
        return false;
      }

      const timeUntilExpiry = parseInt(expirationTime) - Date.now();
      return timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD && timeUntilExpiry > 0;
    } catch (error) {
      console.error('Failed to check token refresh status:', error);
      return false;
    }
  }

  /**
   * Get time until token expires
   * @returns {number} - Milliseconds until expiration, or 0 if expired
   */
  getTimeUntilExpiry() {
    try {
      const expirationTime = this.storage.getItem(PORTAL_TOKEN_EXPIRES_KEY);
      
      if (!expirationTime) {
        return 0;
      }

      const timeLeft = parseInt(expirationTime) - Date.now();
      return Math.max(0, timeLeft);
    } catch (error) {
      console.error('Failed to get expiration time:', error);
      return 0;
    }
  }

  /**
   * Clear all portal authentication data
   */
  clearPortalAuth() {
    try {
      this.storage.removeItem(PORTAL_TOKEN_KEY);
      this.storage.removeItem(PORTAL_USER_KEY);
      this.storage.removeItem(PORTAL_TOKEN_EXPIRES_KEY);
    } catch (error) {
      console.error('Failed to clear portal authentication:', error);
    }
  }

  /**
   * Check if user is authenticated with valid token
   * @returns {boolean} - True if authenticated with valid token
   */
  isAuthenticated() {
    return this.getPortalToken() !== null;
  }

  /**
   * Sanitize user data to prevent XSS
   * @private
   * @param {Object} user - Raw user data
   * @returns {Object} - Sanitized user data
   */
  _sanitizeUserData(user) {
    if (!user || typeof user !== 'object') {
      return {};
    }

    const sanitized = {};
    const allowedFields = [
      'id', 'first_name', 'last_name', 'email', 'account_type', 
      'status', 'address', 'phone', 'portal_active'
    ];

    allowedFields.forEach(field => {
      if (user.hasOwnProperty(field)) {
        const value = user[field];
        // Basic sanitization - ensure strings don't contain script tags
        if (typeof value === 'string') {
          sanitized[field] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        } else {
          sanitized[field] = value;
        }
      }
    });

    return sanitized;
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Export class for testing
export { SecureStorage };

// Backward compatibility helper (deprecated - use secureStorage methods)
export const legacyPortalStorage = {
  setToken: (token, user) => {
    console.warn('legacyPortalStorage.setToken is deprecated. Use secureStorage.setPortalAuth()');
    secureStorage.setPortalAuth(token, user);
  },
  getToken: () => {
    console.warn('legacyPortalStorage.getToken is deprecated. Use secureStorage.getPortalToken()');
    return secureStorage.getPortalToken();
  },
  clearToken: () => {
    console.warn('legacyPortalStorage.clearToken is deprecated. Use secureStorage.clearPortalAuth()');
    secureStorage.clearPortalAuth();
  }
};