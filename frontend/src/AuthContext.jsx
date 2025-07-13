// src/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import for navigation
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
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

  // 10 minute timeout in milliseconds
  const INACTIVE_TIMEOUT = 10 * 60 * 1000;

  // Define logout function early so it can be used in useEffects
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  // Activity tracking
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(Date.now());
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Initialize lastActivity from localStorage if available
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

    const interval = setInterval(checkInactivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [token, user, lastActivity, INACTIVE_TIMEOUT]);

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        // Check if session expired due to inactivity
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
          // Test with a protected endpoint to validate token and fetch user
          const response = await axios.get(`${API}/users/me`);
          setUser(response.data);
        } catch (error) {
          if (error.response?.status === 401) {
            // Invalid token - clear it and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('lastActivity');
            setToken(null);
            setUser(null);
            delete axios.defaults.headers.common['Authorization'];
            navigate('/login');
          } else {
            console.error('Token validation error:', error);
          }
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    };

    validateToken();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      localStorage.setItem('lastActivity', Date.now().toString());
      setLastActivity(Date.now());
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      navigate('/'); // Add this: Redirect to dashboard on success
      
      return { success: true };
    } catch (error) {
      console.log('Login error:', error);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider, useAuth };