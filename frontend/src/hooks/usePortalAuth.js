/**
 * Portal Authentication Hook
 * Provides secure authentication management for portal users
 * Includes automatic token refresh and expiration handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const usePortalAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  // Use refs to prevent infinite re-renders
  const refreshTimeoutRef = useRef(null);
  const expirationTimeoutRef = useRef(null);

  /**
   * Initialize authentication state
   */
  const initializeAuth = useCallback(() => {
    const token = secureStorage.getPortalToken();
    const userData = secureStorage.getPortalUser();
    
    if (token && userData) {
      setUser(userData);
      setIsAuthenticated(true);
      setupTokenMonitoring();
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  /**
   * Setup automatic token monitoring and refresh
   */
  const setupTokenMonitoring = useCallback(() => {
    // Clear existing timeouts
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    if (expirationTimeoutRef.current) {
      clearTimeout(expirationTimeoutRef.current);
    }

    const timeUntilExpiry = secureStorage.getTimeUntilExpiry();
    
    if (timeUntilExpiry > 0) {
      // Set up refresh check (5 minutes before expiry)
      const refreshTime = Math.max(0, timeUntilExpiry - (5 * 60 * 1000));
      refreshTimeoutRef.current = setTimeout(() => {
        if (secureStorage.shouldRefreshToken()) {
          refreshToken();
        }
      }, refreshTime);

      // Set up expiration handler
      expirationTimeoutRef.current = setTimeout(() => {
        handleTokenExpiration();
      }, timeUntilExpiry);
    }
  }, []);

  /**
   * Refresh the authentication token
   */
  const refreshToken = useCallback(async () => {
    try {
      const currentToken = secureStorage.getPortalToken();
      if (!currentToken) {
        handleTokenExpiration();
        return;
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/portal/refresh`,
        {},
        {
          headers: { Authorization: `Bearer ${currentToken}` }
        }
      );

      if (response.data.access_token) {
        secureStorage.setPortalAuth(
          response.data.access_token,
          user,
          24 * 60 * 60 // 24 hours
        );
        setupTokenMonitoring();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      handleTokenExpiration();
    }
  }, [user]);

  /**
   * Handle token expiration
   */
  const handleTokenExpiration = useCallback(() => {
    secureStorage.clearPortalAuth();
    setUser(null);
    setIsAuthenticated(false);
    navigate('/portal/login', { 
      state: { message: 'Your session has expired. Please log in again.' }
    });
  }, [navigate]);

  /**
   * Login function
   */
  const login = useCallback(async (email, password) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/portal/login`, {
        email,
        password
      });

      secureStorage.setPortalAuth(
        response.data.access_token,
        response.data.account,
        24 * 60 * 60 // 24 hours
      );

      setUser(response.data.account);
      setIsAuthenticated(true);
      setupTokenMonitoring();

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed. Please try again.'
      };
    }
  }, [setupTokenMonitoring]);

  /**
   * Logout function
   */
  const logout = useCallback(() => {
    // Clear timeouts
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    if (expirationTimeoutRef.current) {
      clearTimeout(expirationTimeoutRef.current);
    }

    secureStorage.clearPortalAuth();
    setUser(null);
    setIsAuthenticated(false);
    navigate('/portal/login');
  }, [navigate]);

  /**
   * Get current authentication token for API calls
   */
  const getAuthToken = useCallback(() => {
    return secureStorage.getPortalToken();
  }, []);

  /**
   * Check if token needs refresh
   */
  const needsRefresh = useCallback(() => {
    return secureStorage.shouldRefreshToken();
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeAuth();
    
    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (expirationTimeoutRef.current) {
        clearTimeout(expirationTimeoutRef.current);
      }
    };
  }, [initializeAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    getAuthToken,
    needsRefresh,
    timeUntilExpiry: secureStorage.getTimeUntilExpiry()
  };
};