import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const PortalLogin = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already logged in via portal token
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if portal token exists and is valid
        const portalToken = secureStorage.getPortalToken();
        if (portalToken) {
          // Try to access a portal-specific protected endpoint to verify auth
          await axios.get(`${BACKEND_URL}/api/v1/portal/me`, {
            headers: { Authorization: `Bearer ${portalToken}` }
          });
          console.log('User is already logged in');
          navigate('/portal/dashboard');
        }
      } catch (error) {
        // Not authenticated or token invalid, stay on login page
        secureStorage.clearPortalAuth(); // Clean up invalid token
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/portal/login`, {
        email,
        password
      });
      
      // Store portal token and user info for portal authentication
      if (response.data.access_token && response.data.account) {
        secureStorage.setPortalAuth(response.data.access_token, response.data.account);
      }

      // Redirect to portal dashboard
      navigate('/portal/dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Login failed. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-md shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m5 0v-6a2 2 0 00-2-2H8a2 2 0 00-2 2v6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tenant Portal</h1>
          <p className="text-gray-600">Sign in to access your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Enter your email address"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Need help accessing your account?
          </p>
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              If you received an invitation link, please use that link to activate your account.
            </p>
            <p className="text-xs text-gray-400">
              For support, please contact your property manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;