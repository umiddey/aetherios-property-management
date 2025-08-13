import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cachedAxios from '../utils/cachedAxios';
import apiCache from '../utils/cache';
import { useLanguage } from '../contexts/LanguageContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AccountDetailPage = ({ 
  getPriorityColor,
  getStatusColor,
  formatDate, 
  formatCurrency, 
  handleNav 
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [account, setAccount] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        setLoading(true);
        const [accountRes, tasksRes] = await Promise.all([
          cachedAxios.get(`${API}/v2/accounts/${id}`),
          cachedAxios.get(`${API}/v1/tasks?customer_id=${id}`)
        ]);
        
        setAccount(accountRes.data);
        setTasks(tasksRes.data);
      } catch (error) {
        console.error('Error fetching account details:', error);
        setError('Failed to load account details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAccountDetails();
    }
  }, [id]);

  const generatePortalCode = async () => {
    try {
      setGeneratingCode(true);
      const response = await cachedAxios.post(`${API}/v2/accounts/${id}/portal-code`);
      
      // Update the account with the new portal code
      setAccount(prev => ({
        ...prev,
        portal_code: response.data.portal_code
      }));
      
      // Invalidate cache for this account so future navigation shows updated data
      apiCache.delete(`${API}/v2/accounts/${id}`);
      
    } catch (error) {
      console.error('Error generating portal code:', error);
      setError('Failed to generate portal code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyInvitationLink = async () => {
    if (!account.portal_code) return;
    
    const invitationLink = `${window.location.origin}/portal/invite/${account.portal_code}`;
    
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = invitationLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Account not found'}</p>
          <button 
            onClick={() => navigate('/accounts')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const overdueTasks = tasks.filter(task => 
    new Date(task.due_date) < new Date() && task.status !== 'completed'
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/accounts')}
            className="mb-4 text-blue-500 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Accounts
          </button>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h1 className="text-3xl font-bold text-gray-900">{account.full_name || `${account.first_name} ${account.last_name}`}</h1>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {account.account_type?.toUpperCase() || 'ACCOUNT'}
            </span>
            {account.status && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                account.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {account.status.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-lg text-gray-600 mt-2">Account Management & Portal Access</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Account Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <p className="text-lg font-semibold text-gray-900">{account.full_name || `${account.first_name} ${account.last_name}`}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                    <p className="text-gray-900">{account.account_type?.charAt(0).toUpperCase() + account.account_type?.slice(1) || 'Unknown'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      account.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {account.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">
                      <a href={`mailto:${account.email}`} className="text-blue-600 hover:text-blue-800">
                        {account.email}
                      </a>
                    </p>
                  </div>
                  
                  {account.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-gray-900">
                        <a href={`tel:${account.phone}`} className="text-blue-600 hover:text-blue-800">
                          {account.phone}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {account.address && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <p className="text-gray-900 whitespace-pre-line">{account.address}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
                    <p className="text-gray-900">{formatDate(account.created_at)}</p>
                  </div>
                  
                  {account.updated_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                      <p className="text-gray-900">{formatDate(account.updated_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Portal Access Section - Only for Tenants */}
            {account.account_type === 'tenant' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">🏠 Tenant Portal Access</h2>
                
                <div className="space-y-6">
                  {/* Portal Code Display */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-blue-900">Portal Access Code</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={generatePortalCode}
                          disabled={generatingCode}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            generatingCode
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {generatingCode ? 'Generating...' : account.portal_code ? 'Regenerate' : 'Generate'}
                        </button>
                      </div>
                    </div>
                    
                    {account.portal_code ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-xl font-bold text-blue-800 bg-white px-3 py-2 rounded border">
                            {account.portal_code}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            account.portal_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {account.portal_active ? 'Active' : 'Pending Activation'}
                          </span>
                        </div>
                        <p className="text-sm text-blue-700">
                          {account.portal_active 
                            ? 'Tenant has activated their portal account and can log in.'
                            : 'Send this invitation link to the tenant to activate their portal account.'
                          }
                        </p>
                      </div>
                    ) : (
                      <p className="text-blue-700">
                        Click "Generate" to create a portal access code for this tenant.
                      </p>
                    )}
                  </div>

                  {/* Invitation Link */}
                  {account.portal_code && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-green-900 mb-3">📧 Invitation Link</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/portal/invite/${account.portal_code}`}
                            className="flex-1 px-3 py-2 border border-green-300 rounded-md bg-white text-sm font-mono"
                          />
                          <button
                            onClick={copyInvitationLink}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              copySuccess
                                ? 'bg-green-600 text-white'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {copySuccess ? 'Copied!' : 'Copy Link'}
                          </button>
                        </div>
                        <div className="bg-green-100 rounded-md p-3">
                          <p className="text-sm text-green-800">
                            <strong>📋 Instructions for tenant:</strong>
                          </p>
                          <ol className="text-sm text-green-700 mt-2 space-y-1 list-decimal list-inside">
                            <li>Click the invitation link above</li>
                            <li>Enter their email address and create a password</li>
                            <li>Access their tenant portal to submit service requests</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Portal Activity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Portal Status</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Code Status:</span>
                          <span className={account.portal_code ? 'text-green-600' : 'text-gray-400'}>
                            {account.portal_code ? 'Generated' : 'Not Generated'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Account Status:</span>
                          <span className={account.portal_active ? 'text-green-600' : 'text-yellow-600'}>
                            {account.portal_active ? 'Activated' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Last Activity</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Login:</span>
                          <span className="text-gray-500">
                            {account.portal_last_login ? formatDate(account.portal_last_login) : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Code Created:</span>
                          <span className="text-gray-500">
                            {account.portal_code ? formatDate(account.created_at) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {account.notes && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
                <p className="text-gray-900 whitespace-pre-wrap">{account.notes}</p>
              </div>
            )}

            {/* Tasks */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Tasks</h2>
              
              {tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map(task => (
                    <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{task.subject}</h3>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Due: {formatDate(task.due_date)}</span>
                        {task.hourly_rate && task.estimated_hours && (
                          <span>Est. Cost: {formatCurrency(task.hourly_rate * task.estimated_hours)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No tasks found for this customer</p>
              )}
            </div>
          </div>

          {/* Statistics & Actions */}
          <div className="space-y-6">
            {/* Statistics */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Statistics</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Tasks</p>
                      <p className="text-2xl font-bold text-blue-900">{tasks.length}</p>
                    </div>
                    <div className="text-blue-400">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Completed</p>
                      <p className="text-2xl font-bold text-green-900">{completedTasks}</p>
                    </div>
                    <div className="text-green-400">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600">In Progress</p>
                      <p className="text-2xl font-bold text-yellow-900">{inProgressTasks}</p>
                    </div>
                    <div className="text-yellow-400">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{pendingTasks}</p>
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                {overdueTasks > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">Overdue</p>
                        <p className="text-2xl font-bold text-red-900">{overdueTasks}</p>
                      </div>
                      <div className="text-red-400">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/create-task', { state: { customerId: account.id } })}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create New Task
                </button>
                <button className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">
                  Edit Account
                </button>
                <button className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">
                  Send Email
                </button>
                <button className="w-full bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors">
                  Generate Report
                </button>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${account.email}`} className="text-blue-600 hover:text-blue-800">
                    {account.email}
                  </a>
                </div>
                
                {account.phone && (
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${account.phone}`} className="text-blue-600 hover:text-blue-800">
                      {account.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailPage;