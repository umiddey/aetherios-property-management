// Authentication Context with JWT token management and session handling

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import cachedAxios from './utils/cachedAxios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(() => {
    const savedActivity = localStorage.getItem('lastActivity');
    return savedActivity ? parseInt(savedActivity) : Date.now();
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const INACTIVE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    delete axios.defaults.headers.common['Authorization'];
    
    // Only redirect to admin login if not on portal routes
    if (!location.pathname.startsWith('/portal')) {
      navigate('/login');
    }
  };

  // Track user activity for auto-logout
  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now();
      setLastActivity(now);
      localStorage.setItem('lastActivity', now.toString());
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    const storedActivity = localStorage.getItem('lastActivity');
    if (storedActivity) {
      setLastActivity(parseInt(storedActivity));
    }

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

  // Check for inactivity timeout
  useEffect(() => {
    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (token && user && timeSinceLastActivity > INACTIVE_TIMEOUT) {
        console.log('Session expired due to inactivity');
        logout();
      }
    };

    const interval = setInterval(checkInactivity, 60000);
    return () => clearInterval(interval);
  }, [token, user, lastActivity, INACTIVE_TIMEOUT]);

  // Validate token on startup and token changes
  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        const storedActivity = localStorage.getItem('lastActivity');
        if (storedActivity) {
          const timeSinceLastActivity = Date.now() - parseInt(storedActivity);
          if (timeSinceLastActivity > INACTIVE_TIMEOUT) {
            logout();
            return;
          }
        }

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        try {
          const response = await cachedAxios.get(`${API}/v1/users/me`);
          setUser(response.data);
        } catch (error) {
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('lastActivity');
            setToken(null);
            setUser(null);
            delete axios.defaults.headers.common['Authorization'];
            
            // Only redirect to admin login if not on portal routes
            if (!location.pathname.startsWith('/portal')) {
              navigate('/login');
            }
          } else {
            console.error('Token validation error:', error);
          }
        }
      } else {
        // Only redirect to admin login if not on portal routes
        if (!location.pathname.startsWith('/portal')) {
          navigate('/login');
        }
      }
      setLoading(false);
    };

    validateToken();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/v1/auth/login`, { username, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      localStorage.setItem('lastActivity', Date.now().toString());
      setLastActivity(Date.now());
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      navigate('/');
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider, useAuth };