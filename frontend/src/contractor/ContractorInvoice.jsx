/**
 * ContractorInvoice - Token-based Invoice Upload Interface for Contractors
 * Link 2 interface: Contractors upload invoices after service completion
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const ContractorInvoice = () => {
  const { token } = useParams();
  
  const [serviceRequest, setServiceRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Cost thresholds for auto-approval
  const [threshold, setThreshold] = useState(150);
  const [willAutoApprove, setWillAutoApprove] = useState(false);

  // Load service request details using token
  useEffect(() => {
    const loadServiceRequest = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/contractor/invoice/${token}`);
        setServiceRequest(response.data);
        
        // Calculate threshold based on service type and priority
        const thresholds = {
          plumbing: { emergency: 500, urgent: 300, routine: 150 },
          electrical: { emergency: 300, urgent: 250, routine: 150 },
          hvac: { emergency: 800, urgent: 500, routine: 200 },
          appliance: { emergency: 400, urgent: 300, routine: 150 },
          general_maintenance: { emergency: 200, urgent: 150, routine: 100 }
        };
        
        const serviceKey = response.data.request_type.toLowerCase();
        const calculatedThreshold = thresholds[serviceKey]?.[response.data.priority] || 150;
        setThreshold(calculatedThreshold);
        
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
      setError('Invalid invoice upload link');
      setLoading(false);
    }
  }, [token]);

  // Update auto-approval status when amount changes
  useEffect(() => {
    if (invoiceAmount) {
      const amount = parseFloat(invoiceAmount);
      setWillAutoApprove(!isNaN(amount) && amount <= threshold);
    } else {
      setWillAutoApprove(false);
    }
  }, [invoiceAmount, threshold]);

  const handleFileChange = (file) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF or image file (JPG, PNG)');
        return;
      }
      
      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setInvoiceFile(file);
      setError('');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!invoiceFile) {
      setError('Please upload an invoice file');
      return;
    }
    
    if (!invoiceAmount || isNaN(parseFloat(invoiceAmount)) || parseFloat(invoiceAmount) <= 0) {
      setError('Please enter a valid invoice amount');
      return;
    }
    
    if (!invoiceDescription.trim()) {
      setError('Please provide a brief description of the work performed');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Upload file first
      setUploading(true);
      const formData = new FormData();
      formData.append('file', invoiceFile);
      
      const uploadResponse = await axios.post(
        `${BACKEND_URL}/api/v1/contractor/invoice/${token}/upload`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setUploading(false);
      
      // Submit invoice data
      const submitData = {
        file_url: uploadResponse.data.file_url,
        amount: parseFloat(invoiceAmount),
        description: invoiceDescription,
        contractor_notes: notes
      };

      await axios.post(`${BACKEND_URL}/api/v1/contractor/invoice/${token}`, submitData);
      
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting invoice:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to submit invoice. Please try again.'
      );
      setUploading(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service details...</p>
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
          <div className="text-green-500 text-6xl mb-4">💰</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invoice Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Your invoice has been submitted successfully and is being processed.
          </p>
          
          {willAutoApprove ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-700 font-medium">✅ Auto-Approved</p>
              <p className="text-green-600 text-sm">
                Your invoice is under the auto-approval threshold and will be processed immediately.
                Payment expected within 5-7 business days.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-700 font-medium">⏳ Pending Review</p>
              <p className="text-yellow-600 text-sm">
                Your invoice requires property manager approval. 
                You'll be notified once it's reviewed (typically within 2-3 business days).
              </p>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            <p><strong>Invoice Details:</strong></p>
            <p>Amount: {formatCurrency(parseFloat(invoiceAmount))}</p>
            <p>Service: {invoiceDescription}</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">💰 Invoice Submission</h1>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="text-green-800 font-medium mb-2">✅ Service Completed</h3>
            <p className="text-green-700">
              Great job! The service has been marked as completed. 
              Please submit your invoice below for payment processing.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Service</h3>
              <p className="text-lg">{serviceRequest.title}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Type</h3>
              <p className="text-lg">{serviceRequest.request_type.replace('_', ' ')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Property</h3>
              <p className="text-lg">{serviceRequest.property_address || 'Property Details'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Completed</h3>
              <p className="text-lg">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Auto-Processing Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">⚡ Auto-Processing Information</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-800 font-medium">Auto-Approval Threshold:</span>
              <span className="text-blue-900 font-bold text-lg">{formatCurrency(threshold)}</span>
            </div>
            <p className="text-blue-700 text-sm">
              Invoices under this amount are automatically approved and paid within 5-7 business days.
              Invoices over this amount require property manager review (2-3 business days).
            </p>
          </div>
          
          {willAutoApprove && invoiceAmount && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
              <p className="text-green-700 font-medium">
                ✅ Your invoice ({formatCurrency(parseFloat(invoiceAmount))}) will be auto-approved!
              </p>
            </div>
          )}
        </div>

        {/* Invoice Upload Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Submit Your Invoice</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice File (PDF or Image)
            </label>
            
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : invoiceFile 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {invoiceFile ? (
                <div className="text-green-600">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="font-medium">{invoiceFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(invoiceFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setInvoiceFile(null)}
                    className="text-red-600 hover:text-red-700 text-sm mt-2"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="text-gray-500">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="mb-2">Drag and drop your invoice file here, or click to browse</p>
                  <p className="text-sm">Supports PDF, JPG, PNG (max 10MB)</p>
                </div>
              )}
              
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e.target.files[0])}
                className="hidden"
                id="invoice-file"
              />
              
              {!invoiceFile && (
                <label
                  htmlFor="invoice-file"
                  className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                >
                  Choose File
                </label>
              )}
            </div>
          </div>

          {/* Invoice Amount */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Amount (EUR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            {invoiceAmount && (
              <p className="text-sm text-gray-500 mt-1">
                Total: {formatCurrency(parseFloat(invoiceAmount) || 0)}
                {willAutoApprove && (
                  <span className="text-green-600 ml-2">✅ Auto-approved</span>
                )}
              </p>
            )}
          </div>

          {/* Service Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Performed
            </label>
            <textarea
              value={invoiceDescription}
              onChange={(e) => setInvoiceDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the work performed..."
              required
            />
          </div>

          {/* Optional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || uploading || !invoiceFile || !invoiceAmount || !invoiceDescription}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Uploading File...
              </span>
            ) : submitting ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing Invoice...
              </span>
            ) : (
              'Submit Invoice'
            )}
          </button>

          <p className="text-sm text-gray-500 mt-3 text-center">
            Once submitted, you'll receive payment confirmation within 5-7 business days.
          </p>
        </form>
      </div>
    </div>
  );
};

export default ContractorInvoice;