// src/components/ServiceRequestManagementModal.jsx
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import cachedAxios, { invalidateCache } from '../utils/cachedAxios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceRequestManagementModal = ({
  selectedRequest,
  onClose,
  onRequestUpdated,
  logAction
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('status');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form states for different tabs
  const [statusForm, setStatusForm] = useState({
    status: selectedRequest?.status || '',
    priority: selectedRequest?.priority || '',
    estimated_completion: selectedRequest?.estimated_completion || '',
    completion_notes: ''
  });
  
  const [assignmentForm, setAssignmentForm] = useState({
    contractor_email: selectedRequest?.contractor_email || '',
    assigned_user_id: selectedRequest?.assigned_user_id || '',
    reassignment_reason: ''
  });
  
  const [notesForm, setNotesForm] = useState({
    internal_notes: selectedRequest?.internal_notes || '',
    new_note: ''
  });
  
  const [financialForm, setFinancialForm] = useState({
    cost_estimate: selectedRequest?.cost_estimate || '',
    invoice_approval_notes: ''
  });

  // Tab configuration
  const tabs = [
    { id: 'status', label: 'Status & Completion', icon: '📋' },
    { id: 'assignment', label: 'Assignment & Contractors', icon: '👷' },
    { id: 'notes', label: 'Documentation & Notes', icon: '📝' },
    { id: 'financial', label: 'Financial & Invoices', icon: '💰' }
  ];

  // Available options
  const statusOptions = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'closed', label: 'Closed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const priorityOptions = [
    { value: 'routine', label: 'Routine', color: 'text-green-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-yellow-600' },
    { value: 'emergency', label: 'Emergency', color: 'text-red-600' }
  ];

  // Handler functions
  const handleMarkComplete = async () => {
    if (!selectedRequest?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await cachedAxios.post(
        `${API}/v1/service-requests/${selectedRequest.id}/complete`,
        { notes: statusForm.completion_notes }
      );
      logAction('Service request marked complete', { 
        requestId: selectedRequest.id,
        title: selectedRequest.title 
      });
      
      // Invalidate cache and notify parent
      invalidateCache();
      onRequestUpdated && onRequestUpdated();
      onClose();
      
    } catch (error) {

      setError(error.response?.data?.detail || 'Failed to mark request as complete');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    // TODO: Implement status update endpoint
    setError('Status update feature coming soon');
  };

  const handleUpdatePriority = async () => {
    // TODO: Implement priority update endpoint  
    setError('Priority update feature coming soon');
  };

  const handleReassignContractor = async () => {
    // TODO: Implement contractor reassignment endpoint
    setError('Contractor reassignment feature coming soon');
  };

  const handleAddNote = async () => {
    // TODO: Implement add note endpoint
    setError('Add note feature coming soon');
  };

  const handleUpdateCostEstimate = async () => {
    // TODO: Implement cost estimate update endpoint
    setError('Cost estimate feature coming soon');
  };

  const renderStatusTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button
            onClick={handleMarkComplete}
            disabled={loading || selectedRequest?.status === 'completed'}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Marking Complete...' : 'Mark Job Complete'}
          </button>
          
          <textarea
            value={statusForm.completion_notes}
            onChange={(e) => setStatusForm({...statusForm, completion_notes: e.target.value})}
            placeholder="Optional completion notes..."
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={statusForm.status}
            onChange={(e) => setStatusForm({...statusForm, status: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            value={statusForm.priority}
            onChange={(e) => setStatusForm({...statusForm, priority: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Completion</label>
        <input
          type="datetime-local"
          value={statusForm.estimated_completion}
          onChange={(e) => setStatusForm({...statusForm, estimated_completion: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleUpdateStatus}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Update Status
        </button>
        <button
          onClick={handleUpdatePriority}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
        >
          Update Priority
        </button>
      </div>
    </div>
  );

  const renderAssignmentTab = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4">Current Assignment</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p><span className="font-medium">Contractor:</span> {selectedRequest?.contractor_email || 'Not assigned'}</p>
          <p><span className="font-medium">Assigned User:</span> {selectedRequest?.assigned_user_id || 'Not assigned'}</p>
          <p><span className="font-medium">Appointment:</span> {selectedRequest?.appointment_confirmed_datetime ? new Date(selectedRequest.appointment_confirmed_datetime).toLocaleString() : 'Not scheduled'}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Reassign Contractor</label>
        <input
          type="email"
          value={assignmentForm.contractor_email}
          onChange={(e) => setAssignmentForm({...assignmentForm, contractor_email: e.target.value})}
          placeholder="Enter contractor email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Reassignment Reason</label>
        <textarea
          value={assignmentForm.reassignment_reason}
          onChange={(e) => setAssignmentForm({...assignmentForm, reassignment_reason: e.target.value})}
          placeholder="Why is this contractor being reassigned?"
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <button
        onClick={handleReassignContractor}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        Reassign Contractor
      </button>
    </div>
  );

  const renderNotesTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Current Internal Notes</label>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 min-h-[80px]">
          {selectedRequest?.internal_notes || 'No internal notes yet'}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Add New Note</label>
        <textarea
          value={notesForm.new_note}
          onChange={(e) => setNotesForm({...notesForm, new_note: e.target.value})}
          placeholder="Add internal note for property management team..."
          rows="4"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <button
        onClick={handleAddNote}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        Add Note
      </button>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Audit Trail</h3>
        <div className="text-sm text-gray-600">
          <p>• Request submitted: {selectedRequest?.submitted_at ? new Date(selectedRequest.submitted_at).toLocaleString() : 'Unknown'}</p>
          {selectedRequest?.approved_at && (
            <p>• Approved: {new Date(selectedRequest.approved_at).toLocaleString()}</p>
          )}
          {selectedRequest?.appointment_confirmed_datetime && (
            <p>• Appointment scheduled: {new Date(selectedRequest.appointment_confirmed_datetime).toLocaleString()}</p>
          )}
          {selectedRequest?.completed_at && (
            <p>• Completed: {new Date(selectedRequest.completed_at).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderFinancialTab = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-900 mb-3">Financial Overview</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p><span className="font-medium">Current Cost Estimate:</span> €{selectedRequest?.cost_estimate || 'Not set'}</p>
          <p><span className="font-medium">Invoice Status:</span> {selectedRequest?.invoice_submitted ? 'Submitted' : 'Pending'}</p>
          <p><span className="font-medium">Invoice Amount:</span> €{selectedRequest?.invoice_amount || 'N/A'}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Update Cost Estimate (€)</label>
        <input
          type="number"
          step="0.01"
          value={financialForm.cost_estimate}
          onChange={(e) => setFinancialForm({...financialForm, cost_estimate: e.target.value})}
          placeholder="Enter estimated cost in EUR"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <button
        onClick={handleUpdateCostEstimate}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Update Cost Estimate
      </button>

      {selectedRequest?.invoice_submitted && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">Invoice Review</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><span className="font-medium">Amount:</span> €{selectedRequest.invoice_amount}</p>
            <p><span className="font-medium">Submitted:</span> {selectedRequest.invoice_submitted_at ? new Date(selectedRequest.invoice_submitted_at).toLocaleString() : 'Unknown'}</p>
            <p><span className="font-medium">Auto-approved:</span> {selectedRequest.invoice_auto_approved ? 'Yes' : 'No'}</p>
          </div>
          
          {!selectedRequest.invoice_auto_approved && (
            <div className="mt-4 space-y-3">
              <textarea
                value={financialForm.invoice_approval_notes}
                onChange={(e) => setFinancialForm({...financialForm, invoice_approval_notes: e.target.value})}
                placeholder="Invoice approval/rejection notes..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                  Approve Invoice
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                  Reject Invoice
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'status': return renderStatusTab();
      case 'assignment': return renderAssignmentTab();
      case 'notes': return renderNotesTab();
      case 'financial': return renderFinancialTab();
      default: return renderStatusTab();
    }
  };

  if (!selectedRequest) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Manage Service Request
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Title:</span> {selectedRequest.title}</p>
            <p><span className="font-medium">Type:</span> {selectedRequest.request_type?.replace('_', ' ').toUpperCase()}</p>
            <p><span className="font-medium">Status:</span> {selectedRequest.status}</p>
            <p><span className="font-medium">Priority:</span> <span className={priorityOptions.find(p => p.value === selectedRequest.priority)?.color || 'text-gray-600'}>{selectedRequest.priority}</span></p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Last updated: {selectedRequest.updated_at ? new Date(selectedRequest.updated_at).toLocaleString() : 'Unknown'}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestManagementModal;