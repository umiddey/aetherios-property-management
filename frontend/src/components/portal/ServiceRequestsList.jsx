/**
 * ServiceRequestsList - Tenant Service Requests History Component  
 * Mobile-first design for viewing submitted service requests
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { secureStorage } from '../../utils/secureStorage';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const ServiceRequestsList = () => {
  const navigate = useNavigate();
  
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchServiceRequests();
  }, []);

  const fetchServiceRequests = async () => {
    try {
      const token = secureStorage.getPortalToken();
      if (!token) {
        navigate('/portal/login');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(
        `${BACKEND_URL}/api/v1/service-requests/portal/my-requests`,
        { headers }
      );
      
      setServiceRequests(response.data || []);
    } catch (error) {
      console.error('Failed to fetch service requests:', error);
      
      if (error.response?.status === 401) {
        navigate('/portal/login');
      } else {
        setError('Failed to load service requests. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      submitted: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityIcon = (priority) => {
    const iconMap = {
      emergency: '🚨',
      urgent: '⚡',
      routine: '📝'
    };
    return iconMap[priority] || '📝';
  };

  const getRequestTypeIcon = (type) => {
    const iconMap = {
      plumbing: '🔧',
      electrical: '⚡',
      hvac: '❄️',
      appliance: '🏠',
      general_maintenance: '🔨',
      cleaning: '🧹',
      security: '🔒',
      other: '📝'
    };
    return iconMap[type] || '📝';
  };

  const formatRequestType = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = serviceRequests.filter(request => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['submitted', 'assigned', 'in_progress'].includes(request.status);
    if (filter === 'completed') return ['completed', 'closed'].includes(request.status);
    return request.status === filter;
  });

  const getFilterCounts = () => {
    return {
      all: serviceRequests.length,
      active: serviceRequests.filter(r => ['submitted', 'assigned', 'in_progress'].includes(r.status)).length,
      completed: serviceRequests.filter(r => ['completed', 'closed'].includes(r.status)).length
    };
  };

  const counts = getFilterCounts();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your service requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/portal/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-xl font-semibold text-gray-900">My Service Requests</h1>
            <button
              onClick={() => navigate('/portal/service-request/new')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              New Request
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                filter === 'all' 
                  ? 'border-purple-500 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                filter === 'active' 
                  ? 'border-purple-500 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Active ({counts.active})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                filter === 'completed' 
                  ? 'border-purple-500 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Completed ({counts.completed})
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Service Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No service requests yet' : `No ${filter} requests`}
            </h3>
            <p className="text-gray-500 mb-4">
              {filter === 'all' 
                ? 'Submit your first service request to get started.'
                : `You don't have any ${filter} service requests.`
              }
            </p>
            <button
              onClick={() => navigate('/portal/service-request/new')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Submit Request
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="text-2xl">
                      {getRequestTypeIcon(request.request_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {request.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center">
                          <span className="mr-1">{getPriorityIcon(request.priority)}</span>
                          {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                        </span>
                        <span>
                          {formatRequestType(request.request_type)}
                        </span>
                        <span>
                          {formatDate(request.submitted_at)}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 text-sm line-clamp-2">
                        {request.description}
                      </p>
                      
                      {request.estimated_completion && (
                        <div className="mt-3 flex items-center text-sm text-blue-600">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Expected completion: {formatDate(request.estimated_completion)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button className="ml-4 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ServiceRequestsList;