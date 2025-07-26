import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const PortalInvitation = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  
  const [invitationData, setInvitationData] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/portal/invite/${inviteCode}`);
        
        if (!response.data.is_valid) {
          setError('This invitation has already been used. Please use the regular login.');
          return;
        }
        
        setInvitationData(response.data);
        // Pre-fill email with the account's email
        setEmail(response.data.email || '');
      } catch (error) {
        console.error('Invitation fetch error:', error);
        if (error.response?.status === 404) {
          setError('Invalid invitation code. Please check the link and try again.');
        } else {
          setError('Unable to load invitation. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (inviteCode) {
      fetchInvitation();
    }
  }, [inviteCode]);

  const handleActivation = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setActivating(true);
    setError('');
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/portal/activate`, {
        portal_code: inviteCode,
        email: email,  // Send the chosen email
        password: password
      });
      
      // Store the access token securely (protects against XSS)
      secureStorage.setPortalAuth(
        response.data.access_token, 
        response.data.account,
        24 * 60 * 60 // 24 hours expiration
      );
      
      // Redirect to portal dashboard
      navigate('/portal/dashboard');
      
    } catch (error) {
      console.error('Activation error:', error);
      if (error.response?.status === 400) {
        setError('Account already activated. Please use regular login.');
      } else if (error.response?.status === 404) {
        setError('Invalid invitation code.');
      } else {
        setError('Activation failed. Please try again.');
      }
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/portal/login')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Portal!</h1>
          <p className="text-gray-600">You've been invited to create your tenant portal account</p>
        </div>

        {invitationData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {invitationData.first_name} {invitationData.last_name}</div>
              <div><span className="font-medium">Email:</span> {invitationData.email}</div>
              {invitationData.address && (
                <div><span className="font-medium">Address:</span> {invitationData.address}</div>
              )}
              <div><span className="font-medium">Account Type:</span> {invitationData.account_type}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleActivation} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address for Portal Login
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Choose your login email"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Pre-filled with your account email. You can change this if you prefer a different email for portal access.
            </p>
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Create Password *
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Enter a secure password (min 8 characters)"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Confirm your password"
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
            disabled={activating || !password || !confirmPassword}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            {activating ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Activating Account...
              </span>
            ) : (
              'Activate Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/portal/login')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortalInvitation;