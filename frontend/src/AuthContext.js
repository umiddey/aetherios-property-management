// src/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import for navigation
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
  const navigate = useNavigate(); // Add navigate hook

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          // Test with a protected endpoint to validate token and fetch user
          const response = await axios.get(`${API}/users/me`);  // Assume backend adds /users/me to return current user
          setUser(response.data);
        } catch (error) {
          if (error.response?.status === 401) {
            // Invalid token - clear it and redirect to login
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            delete axios.defaults.headers.common['Authorization'];
            navigate('/login'); // Redirect on invalid token
          } else {
            console.error('Token validation error:', error);
          }
        }
      } else {
        navigate('/login'); // No token - redirect to login
      }
      setLoading(false);
    };

    validateToken();
  }, [token, navigate]); // Add navigate to dependencies

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      navigate('/'); // Add this: Redirect to dashboard on success
      
      return { success: true };
    } catch (error) {
      console.log('Login error:', error);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/login'); // Redirect to login on logout
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider, useAuth };