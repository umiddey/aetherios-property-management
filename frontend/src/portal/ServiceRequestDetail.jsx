import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Clock, CheckCircle, AlertCircle, Phone, Mail } from 'lucide-react';
import { secureStorage } from '../utils/secureStorage';

const ServiceRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completionDialog, setCompletionDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    fetchServiceRequest();
  }, [id]);

  const fetchServiceRequest = async () => {
    try {
      const token = secureStorage.getPortalToken();
      const response = await fetch(`http://localhost:8000/api/v1/service-requests/portal/my-requests/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequest(data);
      } else {
        console.error('Failed to fetch service request:', response.status);
      }
    } catch (error) {
      console.error('Error fetching service request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    try {
      const token = secureStorage.getPortalToken();
      const response = await fetch(`http://localhost:8000/api/v1/service-requests/portal/my-requests/${id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          completion_notes: completionNotes,
          completed_by_tenant: true
        })
      });

      if (response.ok) {
        setCompletionDialog(false);
        fetchServiceRequest(); // Refresh data
        alert('Service request marked as completed. Invoice workflow will begin automatically.');
      } else {
        console.error('Failed to mark as complete:', response.status);
        alert('Failed to mark as complete. Please try again.');
      }
    } catch (error) {
      console.error('Error marking complete:', error);
      alert('Error occurred. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'text-yellow-600 bg-yellow-50';
      case 'assigned': return 'text-blue-600 bg-blue-50';
      case 'in_progress': return 'text-purple-600 bg-purple-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'text-red-600 bg-red-50';
      case 'urgent': return 'text-orange-600 bg-orange-50';
      case 'routine': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading service request...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Service request not found</p>
          <button 
            onClick={() => navigate('/portal/service-requests')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Service Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/portal/service-requests')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Service Requests
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{request.title}</h1>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                  {request.status.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(request.priority)}`}>
                  {request.priority}
                </span>
                <span className="text-gray-500 text-sm">#{request._id?.slice(-8)}</span>
              </div>
            </div>
            
            {request.status === 'in_progress' && (
              <button
                onClick={() => setCompletionDialog(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Mark as Complete
              </button>
            )}
          </div>

          <div className="prose max-w-none mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
          </div>

          {/* Service Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Service Information</h3>
              
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Service Type</p>
                  <p className="font-medium">{request.service_type}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="font-medium">{new Date(request.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {request.location_details && (
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 text-gray-400 mt-0.5">📍</div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{request.location_details}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Appointment Status</h3>
              
              {request.appointment_confirmed_datetime ? (
                <>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-500">Scheduled for</p>
                      <p className="font-medium text-green-700">
                        {formatDateTime(request.appointment_confirmed_datetime)}
                      </p>
                    </div>
                  </div>

                  {request.contractor_email && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Contractor Information</h4>
                      <div className="flex items-center gap-2 text-blue-700">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{request.contractor_email}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Appointment Status</p>
                    <p className="font-medium text-gray-600">
                      {request.contractor_email_sent_at 
                        ? 'Contractor contacted - awaiting scheduling' 
                        : 'Processing request'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preferred Time Slots */}
          {request.tenant_preferred_slots && request.tenant_preferred_slots.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Your Preferred Time Slots</h4>
              <div className="space-y-2">
                {request.tenant_preferred_slots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2 text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{formatDateTime(slot)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeline/Updates Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Timeline</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Request Submitted</p>
                <p className="text-sm text-gray-500">{new Date(request.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            {request.contractor_email_sent_at && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Contractor Contacted</p>
                  <p className="text-sm text-gray-500">{new Date(request.contractor_email_sent_at).toLocaleString()}</p>
                </div>
              </div>
            )}

            {request.appointment_confirmed_datetime && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Appointment Scheduled</p>
                  <p className="text-sm text-gray-500">For {formatDateTime(request.appointment_confirmed_datetime)}</p>
                </div>
              </div>
            )}

            {request.status === 'completed' && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Service Completed</p>
                  <p className="text-sm text-gray-500">Invoice processing initiated</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completion Dialog */}
      {completionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Mark Service as Complete</h3>
            <p className="text-gray-600 mb-4">
              Was the service completed to your satisfaction? This will trigger the invoice workflow.
            </p>
            
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Optional: Add any notes about the completed service..."
              className="w-full p-3 border rounded-lg mb-4 resize-none"
              rows="3"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setCompletionDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkComplete}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRequestDetail;