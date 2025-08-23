/**
 * ServiceRequestForm - Tenant Service Request Submission Component
 * Mobile-first design for customer portal service request creation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { secureStorage } from '../../utils/secureStorage';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const ServiceRequestForm = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    request_type: '',
    priority: 'routine',
    title: '',
    description: '',
    contract_id: '',  // NEW: Selected contract for this service request
    related_furnished_item_id: '',  // NEW: Optional furnished item selection
    attachments: [],
    preferred_slots: []  // NEW: Calendar widget preferred appointment days (date strings)
  });
  
  const [requestTypes, setRequestTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [contracts, setContracts] = useState([]);  // NEW: Available contracts for this tenant
  const [furnishedItems, setFurnishedItems] = useState([]);  // NEW: Furnished items for selected property
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load service request types, priorities, and tenant's contracts
  useEffect(() => {
    const loadFormData = async () => {
      try {
        // Get current tenant account from secure storage
        const account = secureStorage.getPortalUser();
        if (!account) {
          setError('Please log in to submit service requests.');
          return;
        }

        // Fetch form options and tenant's contracts in parallel
        const token = secureStorage.getPortalToken();
        const authHeaders = { Authorization: `Bearer ${token}` };
        
        const [metadataResponse, contractsResponse] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/v1/portal/service-request-metadata`, {
            headers: authHeaders
          }),
          axios.get(`${BACKEND_URL}/api/v1/portal/contracts`, {
            headers: authHeaders
          })
        ]);
        
        // Extract types and priorities from metadata response
        setRequestTypes(metadataResponse.data.types || []);
        setPriorities(metadataResponse.data.priorities || []);
        setContracts(contractsResponse.data || []);
        
        // Auto-select contract if only one active contract
        if (contractsResponse.data && contractsResponse.data.length === 1) {
          setFormData(prev => ({
            ...prev,
            contract_id: contractsResponse.data[0].id
          }));
        }
        
      } catch (error) {
        console.error('Failed to load form data:', error);
        setError('Failed to load form options. Please refresh the page.');
      }
    };
    
    loadFormData();
  }, []);

  // Load furnished items when contract is selected
  useEffect(() => {
    const loadFurnishedItems = async () => {
      if (!formData.contract_id) {
        setFurnishedItems([]);
        return;
      }

      try {
        // Get property_id from selected contract
        const selectedContract = contracts.find(c => c.id === formData.contract_id);
        if (!selectedContract?.property_id) return;

        const token = secureStorage.getPortalToken();
        const response = await axios.get(
          `${BACKEND_URL}/api/v1/portal/furnished-items/property/${selectedContract.property_id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        setFurnishedItems(response.data || []);
      } catch (error) {
        console.warn('Could not load furnished items:', error);
        setFurnishedItems([]);
      }
    };

    loadFurnishedItems();
  }, [formData.contract_id, contracts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    // For now, we'll just store file names - file upload implementation would be added later
    setFormData(prev => ({
      ...prev,
      attachments: files.map(file => file.name)
    }));
  };

  const validateForm = () => {
    if (!formData.request_type) {
      setError('Please select a request type.');
      return false;
    }
    if (!formData.contract_id && contracts.length > 0) {
      setError('Please select which property needs service.');
      return false;
    }
    if (contracts.length === 0) {
      setError('You must have an active contract to submit service requests.');
      return false;
    }
    if (!formData.title.trim()) {
      setError('Please enter a title for your request.');
      return false;
    }
    if (formData.title.length < 5) {
      setError('Title must be at least 5 characters long.');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Please provide a description of the issue.');
      return false;
    }
    if (formData.description.length < 10) {
      setError('Description must be at least 10 characters long.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = secureStorage.getPortalToken();
      if (!token) {
        navigate('/portal/login');
        return;
      }
      
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Convert preferred slots to ISO datetime strings (00:00 time for day-only selection)
      const tenant_preferred_slots = formData.preferred_slots
        .filter(date => date)
        .map(date => new Date(date + 'T00:00:00').toISOString());

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/service-requests/portal/submit`,
        {
          request_type: formData.request_type,
          priority: formData.priority,
          title: formData.title.trim(),
          description: formData.description.trim(),
          related_furnished_item_id: formData.related_furnished_item_id || null,
          tenant_preferred_slots: tenant_preferred_slots
        },
        { headers }
      );
      
      if (response.status === 201) {
        setSuccess(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/portal/dashboard');
        }, 2000);
      }
      
    } catch (error) {
      console.error('Service request submission failed:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => navigate('/portal/login'), 2000);
      } else if (error.response?.status === 400) {
        setError(error.response.data?.detail || 'Please check your input and try again.');
      } else {
        setError('Failed to submit service request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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

  const getPriorityColor = (priority) => {
    const colorMap = {
      emergency: 'text-red-600',
      urgent: 'text-orange-600', 
      routine: 'text-green-600'
    };
    return colorMap[priority] || 'text-green-600';
  };

  const formatRequestType = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-md shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h1>
          <p className="text-gray-600 mb-4">
            Your service request has been submitted successfully. You will be notified when it's assigned to our maintenance team.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to dashboard...
          </p>
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
            <h1 className="text-xl font-semibold text-gray-900">Submit Service Request</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Request Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What type of issue are you experiencing? *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {requestTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleInputChange({ target: { name: 'request_type', value: type } })}
                    className={`flex flex-col items-center p-4 border rounded-lg transition-all ${
                      formData.request_type === type
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span className="text-2xl mb-2">{getRequestTypeIcon(type)}</span>
                    <span className="text-sm font-medium text-center">
                      {formatRequestType(type)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Property/Contract Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Which property needs service? *
              </label>
              {contracts.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-700">
                      You don't have any active contracts. Please contact your property manager.
                    </span>
                  </div>
                </div>
              ) : contracts.length === 1 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-blue-700 font-medium">Service request for: </span>
                      <span className="text-blue-900">
                        {contracts[0].property_details?.street} {contracts[0].property_details?.house_nr}, {contracts[0].property_details?.city}
                        {contracts[0].title && ` (${contracts[0].title})`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {contracts.map((contract) => (
                    <label
                      key={contract.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.contract_id === contract.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="contract_id"
                        value={contract.id}
                        checked={formData.contract_id === contract.id}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                        formData.contract_id === contract.id
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.contract_id === contract.id && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {contract.property_details?.street} {contract.property_details?.house_nr}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contract.property_details?.city} • {contract.title || 'Rental Contract'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Furnished Items Selection (Optional) */}
            {furnishedItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Is this issue related to a specific furnished item? (Optional)
                </label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-800">
                    💡 Selecting a furnished item helps us determine responsibility and prioritize your request according to German rental law.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                    <input
                      type="radio"
                      name="related_furnished_item_id"
                      value=""
                      checked={formData.related_furnished_item_id === ''}
                      onChange={handleInputChange}
                      className="mr-3 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">General property issue</div>
                      <div className="text-sm text-gray-600">Not related to a specific furnished item</div>
                    </div>
                  </label>
                  {furnishedItems.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                        formData.related_furnished_item_id === item.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="related_furnished_item_id"
                        value={item.id}
                        checked={formData.related_furnished_item_id === item.id}
                        onChange={handleInputChange}
                        className="mr-3 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.ownership === 'landlord' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.ownership === 'landlord' ? '🏠 Landlord' : '👤 Tenant'}
                            </span>
                            {item.is_essential && (
                              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                ⚠️ Essential
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="capitalize">{item.category}</span>
                          {item.brand && <span> • {item.brand}</span>}
                          {item.condition && <span> • {item.condition} condition</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {formData.related_furnished_item_id && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-green-800 font-medium">
                        Item selected - We'll determine responsibility according to German rental law
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Priority Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How urgent is this issue? *
              </label>
              <div className="space-y-2">
                {priorities.map((priority) => (
                  <label key={priority} className="flex items-center">
                    <input
                      type="radio"
                      name="priority"
                      value={priority}
                      checked={formData.priority === priority}
                      onChange={handleInputChange}
                      className="mr-3 text-purple-600 focus:ring-purple-500"
                    />
                    <span className={`font-medium ${getPriorityColor(priority)}`}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {priority === 'emergency' && '(Response within 2 hours)'}
                      {priority === 'urgent' && '(Response within 24 hours)'}
                      {priority === 'routine' && '(Response within 3-5 days)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preferred Appointment Times */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preferred appointment days (optional)
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Help us schedule faster!</p>
                    <p>Select 1-3 preferred appointment days. If none work for our contractor, they'll suggest specific times based on urgency:</p>
                    <ul className="mt-2 space-y-1">
                      <li><span className="font-medium text-red-600">Emergency:</span> Next 1 working day</li>
                      <li><span className="font-medium text-orange-600">Urgent:</span> Next 3-5 working days</li>
                      <li><span className="font-medium text-green-600">Routine:</span> Up to 2 months out</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Calendar Widget */}
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500 w-20">
                      {index === 0 ? 'Option 1:' : index === 1 ? 'Option 2:' : 'Option 3:'}
                    </span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Preferred Day</label>
                      <input
                        type="date"
                        value={formData.preferred_slots[index] || ''}
                        onChange={(e) => {
                          const newSlots = [...formData.preferred_slots];
                          newSlots[index] = e.target.value;
                          setFormData(prev => ({ ...prev, preferred_slots: newSlots }));
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                    {formData.preferred_slots[index] && (
                      <button
                        type="button"
                        onClick={() => {
                          const newSlots = [...formData.preferred_slots];
                          newSlots[index] = '';
                          setFormData(prev => ({ ...prev, preferred_slots: newSlots }));
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Selected slots preview */}
              {formData.preferred_slots.some(date => date) && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Selected appointment preferences:</h4>
                  <ul className="space-y-1">
                    {formData.preferred_slots
                      .filter(date => date)
                      .map((date, index) => (
                        <li key={index} className="text-sm text-green-700">
                          {new Date(date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Brief description of the issue *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Kitchen faucet is leaking"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                maxLength={100}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.title.length}/100 characters
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Detailed description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={5}
                placeholder="Please provide as much detail as possible about the issue, including when it started, where exactly it's located, and any other relevant information that might help our maintenance team."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                maxLength={1000}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </div>
            </div>

            {/* File Upload (placeholder for future implementation) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-sm text-gray-500">
                  Photo upload feature coming soon
                </p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/portal/dashboard')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-700 text-sm mb-3">
            If you're experiencing an emergency (gas leak, electrical hazard, water flooding), 
            please call our emergency hotline immediately and then submit this form.
          </p>
          <div className="text-blue-900 font-semibold">
            Emergency Hotline: (555) 123-HELP
          </div>
        </div>
      </main>
    </div>
  );
};

export default ServiceRequestForm;