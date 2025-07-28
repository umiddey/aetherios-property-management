/**
 * ContractorScheduling - Token-based Scheduling Interface for Contractors
 * Link 1 interface: Contractors accept/reject tenant slots or propose new ones
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const ContractorScheduling = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [serviceRequest, setServiceRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedAction, setSelectedAction] = useState(''); // 'accept' or 'propose'
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedTime, setSelectedTime] = useState(''); // New: time selection for accepted day
  const [proposedDateTime, setProposedDateTime] = useState('');
  const [notes, setNotes] = useState('');

  // Load service request details using token
  useEffect(() => {
    const loadServiceRequest = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/contractor/schedule/${token}`);
        setServiceRequest(response.data);
      } catch (err) {
        console.error('Error loading service request:', err);
        setError(
          err.response?.data?.detail || 
          'Unable to load service request. The link may be expired or invalid.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadServiceRequest();
    } else {
      setError('Invalid scheduling link');
      setLoading(false);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAction) {
      setError('Please select an action (accept slot or propose new time)');
      return;
    }
    
    if (selectedAction === 'accept' && !selectedSlot) {
      setError('Please select a tenant preferred day to accept');
      return;
    }
    
    if (selectedAction === 'accept' && !selectedTime) {
      setError('Please select a 30-minute time window for the chosen day');
      return;
    }
    
    if (selectedAction === 'propose' && !proposedDateTime) {
      setError('Please specify your proposed date and time');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const submitData = {
        action: selectedAction,
        selected_slot: selectedAction === 'accept' ? 
          new Date(selectedSlot.split('T')[0] + 'T' + selectedTime).toISOString() : null,
        proposed_datetime: selectedAction === 'propose' ? proposedDateTime : null,
        contractor_notes: notes
      };

      await axios.post(`${BACKEND_URL}/api/v1/contractor/schedule/${token}`, submitData);
      
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting scheduling response:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to submit scheduling response. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'text-red-600 bg-red-50';
      case 'urgent': return 'text-yellow-600 bg-yellow-50';
      case 'routine': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'emergency': return '🚨';
      case 'urgent': return '⚠️';
      case 'routine': return '🟢';
      default: return '📋';
    }
  };

  const getConstraintText = (priority) => {
    switch (priority) {
      case 'emergency': return 'Must be scheduled within 24 hours';
      case 'urgent': return 'Should be scheduled within 3-5 working days';
      case 'routine': return 'Can be scheduled within 2 months';
      default: return 'Standard scheduling applies';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service request details...</p>
        </div>
      </div>
    );
  }

  if (error && !serviceRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Link Invalid</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact property management if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Response Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Your scheduling response has been submitted successfully. 
            The tenant and property management have been notified.
          </p>
          <div className="text-sm text-gray-500">
            <p><strong>What happens next?</strong></p>
            <ul className="mt-2 text-left">
              <li>• Tenant will be notified of the confirmed appointment</li>
              <li>• You'll receive service details closer to the date</li>
              <li>• After completion, you'll get an invoice upload link</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">🔧 Service Request Scheduling</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(serviceRequest.priority)}`}>
              {getPriorityIcon(serviceRequest.priority)} {serviceRequest.priority.toUpperCase()}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Service Type</h3>
              <p className="text-lg">{serviceRequest.request_type.replace('_', ' ')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Property</h3>
              <p className="text-lg">{serviceRequest.property_address || 'Property Details'}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Issue Description</h3>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{serviceRequest.title}</h2>
            <p className="text-gray-700">{serviceRequest.description}</p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-1">⏰ Scheduling Constraint</h3>
            <p className="text-yellow-700">{getConstraintText(serviceRequest.priority)}</p>
          </div>
        </div>

        {/* Tenant Preferred Days */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📅 Tenant's Preferred Days</h2>
          
          {serviceRequest.tenant_preferred_slots && serviceRequest.tenant_preferred_slots.length > 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-2">Tenant requested these days:</p>
                  <ul className="space-y-1">
                    {serviceRequest.tenant_preferred_slots.map((slot, index) => (
                      <li key={index} className="flex items-center">
                        <span className="font-medium">Day {index + 1}:</span>
                        <span className="ml-2">
                          {new Date(slot).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-blue-600 font-medium">
                    💡 You can accept one of these days or suggest a different time below
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-500 italic flex items-center">
                <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Tenant didn't specify preferred days - please suggest available times
              </p>
            </div>
          )}
        </div>

        {/* Scheduling Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Response</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Action Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Choose Your Action</label>
            
            {/* Only show Accept option if tenant provided preferred days */}
            {serviceRequest.tenant_preferred_slots && serviceRequest.tenant_preferred_slots.length > 0 && (
              <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-300 mb-3">
                <input
                  type="radio"
                  name="action"
                  value="accept"
                  checked={selectedAction === 'accept'}
                  onChange={(e) => {
                    setSelectedAction(e.target.value);
                    if (e.target.value !== 'accept') {
                      setSelectedSlot(''); // Clear selected slot when switching away from accept
                      setSelectedTime(''); // Clear selected time when switching away from accept
                    }
                  }}
                  className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                />
                <div className="ml-3">
                  <div className="text-green-700 font-medium">✅ Accept One of Tenant's Preferred Days</div>
                  <div className="text-sm text-green-600">I can work on one of the days they requested</div>
                </div>
              </label>
            )}

            {/* Day Selection UI - appears when Accept is selected */}
            {selectedAction === 'accept' && serviceRequest.tenant_preferred_slots && serviceRequest.tenant_preferred_slots.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-green-800 mb-3">📅 Which day works for you?</h4>
                <div className="space-y-2">
                  {serviceRequest.tenant_preferred_slots.map((slot, index) => (
                    <label key={index} className="flex items-center p-3 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 bg-white">
                      <input
                        type="radio"
                        name="preferredSlot"
                        value={slot}
                        checked={selectedSlot === slot}
                        onChange={(e) => {
                          setSelectedSlot(e.target.value);
                          setSelectedTime(''); // Clear time when day changes
                        }}
                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-green-900">
                          Day {index + 1}: {new Date(slot).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-green-600 mt-2">💡 Select the day that works best for your schedule</p>
              </div>
            )}

            {/* Time Selection UI - appears after day is selected */}
            {selectedAction === 'accept' && selectedSlot && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-blue-800 mb-3">🕐 What time works on {new Date(selectedSlot).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}?</h4>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    Select 30-minute appointment window
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a time range...</option>
                    <option value="08:00">8:00 AM - 8:30 AM</option>
                    <option value="08:30">8:30 AM - 9:00 AM</option>
                    <option value="09:00">9:00 AM - 9:30 AM</option>
                    <option value="09:30">9:30 AM - 10:00 AM</option>
                    <option value="10:00">10:00 AM - 10:30 AM</option>
                    <option value="10:30">10:30 AM - 11:00 AM</option>
                    <option value="11:00">11:00 AM - 11:30 AM</option>
                    <option value="11:30">11:30 AM - 12:00 PM</option>
                    <option value="12:00">12:00 PM - 12:30 PM</option>
                    <option value="12:30">12:30 PM - 1:00 PM</option>
                    <option value="13:00">1:00 PM - 1:30 PM</option>
                    <option value="13:30">1:30 PM - 2:00 PM</option>
                    <option value="14:00">2:00 PM - 2:30 PM</option>
                    <option value="14:30">2:30 PM - 3:00 PM</option>
                    <option value="15:00">3:00 PM - 3:30 PM</option>
                    <option value="15:30">3:30 PM - 4:00 PM</option>
                    <option value="16:00">4:00 PM - 4:30 PM</option>
                    <option value="16:30">4:30 PM - 5:00 PM</option>
                    <option value="17:00">5:00 PM - 5:30 PM</option>
                    <option value="17:30">5:30 PM - 6:00 PM</option>
                  </select>
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Each appointment is a 30-minute window during business hours
                  </p>
                </div>
              </div>
            )}
            
            <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300">
              <input
                type="radio"
                name="action"
                value="propose"
                checked={selectedAction === 'propose'}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  if (e.target.value !== 'accept') {
                    setSelectedSlot(''); // Clear selected slot when switching to propose
                    setSelectedTime(''); // Clear selected time when switching to propose
                  }
                }}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="ml-3">
                <div className="text-blue-700 font-medium">📅 Propose Different Time</div>
                <div className="text-sm text-blue-600">
                  {serviceRequest.tenant_preferred_slots && serviceRequest.tenant_preferred_slots.length > 0 
                    ? "Their preferred days don't work - suggest alternative"
                    : "Suggest an available date and time"
                  }
                </div>
              </div>
            </label>
          </div>

          {/* Proposed DateTime Input */}
          {selectedAction === 'propose' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proposed Date & Time
              </label>
              <input
                type="datetime-local"
                value={proposedDateTime}
                onChange={(e) => setProposedDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Respect the scheduling constraint: {getConstraintText(serviceRequest.priority)}
              </p>
            </div>
          )}

          {/* Optional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information for the tenant or property management..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !selectedAction}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting Response...
              </span>
            ) : (
              'Submit Scheduling Response'
            )}
          </button>

          <p className="text-sm text-gray-500 mt-3 text-center">
            This action will notify the tenant and property management of your scheduling decision.
          </p>
        </form>
      </div>
    </div>
  );
};

export default ContractorScheduling;