// src/components/ServiceRequestsView.jsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import cachedAxios, { invalidateCache } from '../utils/cachedAxios';
import { useLanguage } from '../contexts/LanguageContext';
import Pagination from './Pagination';
import ServiceRequestManagementModal from './ServiceRequestManagementModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceRequestsView = ({
  handleNav,
  formatDate,
  logAction
}) => {
  const { t } = useLanguage();
  const location = useLocation();
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    request_type: ''
  });
  const [approvalModal, setApprovalModal] = useState(null);
  const [approving, setApproving] = useState(false);
  const [managementModalOpen, setManagementModalOpen] = useState(false);

  // Available filter options
  const statusOptions = ['submitted', 'pending_approval', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled'];
  const priorityOptions = ['routine', 'urgent', 'emergency'];
  const typeOptions = ['plumbing', 'electrical', 'hvac', 'appliances', 'general_maintenance', 'pest_control', 'locks_keys', 'exterior'];

  useEffect(() => {
    fetchServiceRequests();
  }, [currentPage, filters]);

  // Handle notification navigation - auto-open specific request detail
  useEffect(() => {
    const selectedRequestId = location.state?.selectedRequestId;
    if (selectedRequestId && serviceRequests.length > 0) {
      // Find the request in the current list
      const targetRequest = serviceRequests.find(request => request.id === selectedRequestId);
      if (targetRequest) {
        // Auto-open the detail modal for this specific request
        console.log(`🎯 Auto-opening detail modal for notification request: ${targetRequest.title}`);
        setSelectedRequest(targetRequest);
        
        // Clear the state to prevent re-opening on subsequent renders
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        // If request not found in current page, try to fetch it directly
        console.log(`🔍 Request ${selectedRequestId} not found in current page, fetching directly...`);
        fetchSpecificRequest(selectedRequestId);
      }
    }
  }, [serviceRequests, location.state]);

  const fetchSpecificRequest = async (requestId) => {
    try {
      const response = await cachedAxios.get(`${API}/v1/service-requests/${requestId}`);
      console.log(`✅ Fetched specific request: ${response.data.title}`);
      setSelectedRequest(response.data);
      
      // Clear the state
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error) {
      console.error(`❌ Failed to fetch request ${requestId}:`, error);
      setError(`Could not find the requested service request`);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        skip: (currentPage - 1) * 20,
        limit: 20
      });

      // Add filters to params
      if (filters.status) params.append('status_filter', filters.status);
      if (filters.priority) params.append('priority_filter', filters.priority);
      if (filters.request_type) params.append('type_filter', filters.request_type);

      const response = await cachedAxios.get(`${API}/v1/service-requests/?${params}`);
      setServiceRequests(response.data);
      
      // Calculate total pages (approximate)
      setTotalPages(Math.ceil(response.data.length / 20));
      setError(null);
    } catch (error) {
      console.error('Error fetching service requests:', error);
      setError('Failed to load service requests');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleApproval = (requestId, action) => {
    // Set up approval modal with request details
    const request = serviceRequests.find(r => r.id === requestId);
    setApprovalModal({
      requestId,
      action,
      request,
      notes: ''
    });
  };

  const submitApproval = async () => {
    if (!approvalModal) return;
    
    setApproving(true);
    try {
      const approval = {
        approval_status: approvalModal.action,
        approval_notes: approvalModal.notes || null
      };

      const response = await cachedAxios.put(
        `${API}/v1/service-requests/${approvalModal.requestId}/approve`,
        approval
      );

      // Clear cache to force fresh data
      invalidateCache('service-requests');
      
      // Refresh the service requests list
      await fetchServiceRequests();
      
      // Close modal AND detail modal
      setApprovalModal(null);
      setSelectedRequest(null);
      
      // Show success message
      console.log(`Service request ${approvalModal.action} successfully`);
    } catch (error) {
      console.error('Error approving service request:', error);
      setError(`Failed to ${approvalModal.action} service request`);
    } finally {
      setApproving(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'routine': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending_approval': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'assigned': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatRequestType = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100 p-6">
      {/* Modern Header with Glassmorphism */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Service Requests
                </h1>
                <p className="text-gray-600 mt-1">Manage tenant maintenance requests</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="flex gap-4">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                <div className="text-2xl font-bold text-indigo-600">{serviceRequests.length}</div>
                <div className="text-sm text-gray-600">Total Requests</div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                <div className="text-2xl font-bold text-orange-600">
                  {serviceRequests.filter(r => r.approval_status === 'pending_approval').length}
                </div>
                <div className="text-sm text-gray-600">Pending Approval</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              {priorityOptions.map(priority => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filters.request_type}
              onChange={(e) => handleFilterChange('request_type', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {typeOptions.map(type => (
                <option key={type} value={type}>
                  {formatRequestType(type)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Service Requests Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-600">Loading service requests...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
          </div>
        ) : serviceRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No service requests found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {serviceRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-indigo-50/50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(request.submitted_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{request.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatRequestType(request.request_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                          {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                          {request.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {request.property_address || 'Property N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={async () => {
                              try {
                                const response = await cachedAxios.get(`${API}/v1/service-requests/${request.id}`);
                                setSelectedRequest(response.data);
                              } catch (error) {
                                console.error('Error fetching service request details:', error);
                                setSelectedRequest(request); // Fallback to summary data
                              }
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Details
                          </button>
                          
                          {/* Show approval buttons for pending_approval approval_status */}
                          {request.approval_status === 'pending_approval' && (
                            <>
                              <button
                                onClick={() => handleApproval(request.id, 'approved')}
                                className="text-green-600 hover:text-green-900 px-2 py-1 rounded text-xs bg-green-50 hover:bg-green-100"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproval(request.id, 'rejected')}
                                className="text-red-600 hover:text-red-900 px-2 py-1 rounded text-xs bg-red-50 hover:bg-red-100"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Service Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Service Request Details</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-sm text-gray-900">{formatRequestType(selectedRequest.request_type)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selectedRequest.priority)}`}>
                      {selectedRequest.priority.charAt(0).toUpperCase() + selectedRequest.priority.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submitted</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedRequest.submitted_at)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Property</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.property_address || 'Property address not available'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedRequest.description || 'No description provided'}</p>
                </div>

                {/* Contractor Workflow Information */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contractor Workflow</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Assigned Contractor</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.contractor_email || 'Not assigned'}</p>
                    </div>
                    
                    {selectedRequest.contractor_response_token && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contractor Scheduling Link (Link 1)</label>
                        <div className="mt-1 flex items-center space-x-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={`http://localhost:3000/contractor/schedule/${selectedRequest.contractor_response_token}`}
                            className="flex-1 text-xs bg-gray-100 border border-gray-300 rounded px-2 py-1"
                          />
                          <button 
                            onClick={() => navigator.clipboard.writeText(`http://localhost:3000/contractor/schedule/${selectedRequest.contractor_response_token}`)}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Copy
                          </button>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            selectedRequest.schedule_link_accessed ? 
                            'bg-green-100 text-green-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedRequest.schedule_link_accessed ? '✅ Used' : '⏳ Pending'}
                          </span>
                        </div>
                        {selectedRequest.schedule_link_accessed_at && (
                          <p className="mt-1 text-xs text-gray-500">
                            Last accessed: {formatDate(selectedRequest.schedule_link_accessed_at)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {selectedRequest.invoice_upload_token && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contractor Invoice Link (Link 2)</label>
                        <div className="mt-1 flex items-center space-x-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={`http://localhost:3000/contractor/invoice/${selectedRequest.invoice_upload_token}`}
                            className="flex-1 text-xs bg-gray-100 border border-gray-300 rounded px-2 py-1"
                          />
                          <button 
                            onClick={() => navigator.clipboard.writeText(`http://localhost:3000/contractor/invoice/${selectedRequest.invoice_upload_token}`)}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Copy
                          </button>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            selectedRequest.invoice_link_accessed ? 
                            'bg-green-100 text-green-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedRequest.invoice_link_accessed ? '✅ Used' : '⏳ Pending'}
                          </span>
                        </div>
                        {selectedRequest.invoice_link_accessed_at && (
                          <p className="mt-1 text-xs text-gray-500">
                            Last accessed: {formatDate(selectedRequest.invoice_link_accessed_at)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {selectedRequest.appointment_confirmed_datetime && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Appointment Scheduled</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedRequest.appointment_confirmed_datetime)}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Completion Status</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.completion_status || 'pending'}</p>
                    </div>
                  </div>
                </div>
              {/* Approval buttons for pending requests */}
                {selectedRequest.approval_status === 'pending_approval' && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Actions</h3>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleApproval(selectedRequest.id, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproval(selectedRequest.id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                )}

              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => setManagementModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Manage Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {approvalModal.action === 'approved' ? 'Approve' : 'Reject'} Service Request
                </h2>
                <button
                  onClick={() => setApprovalModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">{approvalModal.request?.title}</h3>
                <p className="text-sm text-gray-600">{approvalModal.request?.description}</p>
                <div className="mt-2 flex space-x-2">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(approvalModal.request?.priority)}`}>
                    {approvalModal.request?.priority?.charAt(0).toUpperCase() + approvalModal.request?.priority?.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatRequestType(approvalModal.request?.request_type)}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {approvalModal.action === 'approved' ? 'Approval Notes (Optional)' : 'Rejection Reason (Optional)'}
                </label>
                <textarea
                  value={approvalModal.notes}
                  onChange={(e) => setApprovalModal(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder={approvalModal.action === 'approved' ? 'Add approval notes...' : 'Explain why this request is being rejected...'}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setApprovalModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={approving}
                >
                  Cancel
                </button>
                <button
                  onClick={submitApproval}
                  disabled={approving}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    approvalModal.action === 'approved' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                >
                  {approving ? 'Processing...' : 
                    (approvalModal.action === 'approved' ? 'Approve Request' : 'Reject Request')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Management Modal */}
      {managementModalOpen && selectedRequest && (
        <ServiceRequestManagementModal
          selectedRequest={selectedRequest}
          onClose={() => setManagementModalOpen(false)}
          onRequestUpdated={() => {
            fetchServiceRequests();
            setManagementModalOpen(false);
            setSelectedRequest(null);
          }}
          logAction={logAction}
        />
      )}
    </div>
  );
};

export default ServiceRequestsView;