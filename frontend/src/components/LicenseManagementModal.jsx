import React, { useState, useEffect } from 'react';
import complianceService from '../services/complianceService';

const LicenseManagementModal = ({ 
  isOpen, 
  onClose, 
  contractor, 
  onLicenseUpdate 
}) => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [error, setError] = useState(null);

  // Form state for adding/editing licenses
  const [formData, setFormData] = useState({
    license_type: 'electrical',
    license_number: '',
    issuing_authority: '',
    issue_date: '',
    expiration_date: '',
    verification_notes: ''
  });

  // Fetch contractor licenses when modal opens
  useEffect(() => {
    if (isOpen && contractor) {
      fetchLicenses();
    }
  }, [isOpen, contractor]);

  const fetchLicenses = async () => {
    if (!contractor) return;
    
    setLoading(true);
    setError(null);
    try {
      const licenseData = await complianceService.getContractorLicenses(contractor.id);
      setLicenses(licenseData);
    } catch (err) {
      console.error('Error fetching contractor licenses:', err);
      setError('Failed to load licenses');
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLicense = async (e) => {
    e.preventDefault();
    if (!contractor) return;

    setLoading(true);
    setError(null);
    try {
      const licenseData = {
        contractor_id: contractor.id,
        ...formData
      };
      
      await complianceService.createLicense(licenseData);
      await fetchLicenses(); // Refresh the list
      setShowAddForm(false);
      resetForm();
      if (onLicenseUpdate) onLicenseUpdate();
    } catch (err) {
      console.error('Error creating license:', err);
      setError('Failed to create license');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLicense = async (e) => {
    e.preventDefault();
    if (!editingLicense) return;

    setLoading(true);
    setError(null);
    try {
      await complianceService.updateLicense(editingLicense.license_id, formData);
      await fetchLicenses(); // Refresh the list
      setEditingLicense(null);
      resetForm();
      if (onLicenseUpdate) onLicenseUpdate();
    } catch (err) {
      console.error('Error updating license:', err);
      setError('Failed to update license');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLicense = async (licenseId) => {
    if (!confirm('Are you sure you want to remove this license?')) return;

    setLoading(true);
    setError(null);
    try {
      await complianceService.removeLicense(licenseId);
      await fetchLicenses(); // Refresh the list
      if (onLicenseUpdate) onLicenseUpdate();
    } catch (err) {
      console.error('Error removing license:', err);
      setError('Failed to remove license');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLicense = async (licenseId, verificationStatus) => {
    setLoading(true);
    setError(null);
    try {
      await complianceService.updateLicenseVerification(licenseId, {
        verification_status: verificationStatus,
        verification_notes: `Status updated to ${verificationStatus} by admin`
      });
      await fetchLicenses(); // Refresh the list
      if (onLicenseUpdate) onLicenseUpdate();
    } catch (err) {
      console.error('Error updating license verification:', err);
      setError('Failed to update verification status');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      license_type: 'electrical',
      license_number: '',
      issuing_authority: '',
      issue_date: '',
      expiration_date: '',
      verification_notes: ''
    });
  };

  const startEdit = (license) => {
    setEditingLicense(license);
    setFormData({
      license_type: license.license_type,
      license_number: license.license_number,
      issuing_authority: license.issuing_authority,
      issue_date: license.issue_date.split('T')[0], // Convert to date input format
      expiration_date: license.expiration_date.split('T')[0],
      verification_notes: license.verification_notes || ''
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingLicense(null);
    setShowAddForm(false);
    resetForm();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-yellow-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">License Management</h2>
                <p className="text-amber-100">
                  {contractor ? `${contractor.first_name} ${contractor.last_name}` : 'Loading...'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {/* Add License Button */}
          {!showAddForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddForm(true)}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add New License</span>
              </button>
            </div>
          )}

          {/* Add/Edit License Form */}
          {showAddForm && (
            <div className="mb-6 bg-gray-50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                {editingLicense ? 'Edit License' : 'Add New License'}
              </h3>
              <form onSubmit={editingLicense ? handleUpdateLicense : handleAddLicense} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">License Type</label>
                    <select
                      value={formData.license_type}
                      onChange={(e) => setFormData({...formData, license_type: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    >
                      <option value="electrical">Electrical</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="hvac">HVAC</option>
                      <option value="general_contractor">General Contractor</option>
                      <option value="roofing">Roofing</option>
                      <option value="flooring">Flooring</option>
                      <option value="painting">Painting</option>
                      <option value="landscaping">Landscaping</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">License Number</label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Enter license number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Issuing Authority</label>
                    <input
                      type="text"
                      value={formData.issuing_authority}
                      onChange={(e) => setFormData({...formData, issuing_authority: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="e.g., State Board of Contractors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Date</label>
                    <input
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Expiration Date</label>
                    <input
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={formData.verification_notes}
                      onChange={(e) => setFormData({...formData, verification_notes: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      rows="3"
                      placeholder="Optional notes about the license"
                    />
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (editingLicense ? 'Update License' : 'Add License')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Licenses List */}
          {loading && !showAddForm ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              <p className="mt-2 text-gray-600">Loading licenses...</p>
            </div>
          ) : licenses.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-gray-600">No licenses found for this contractor</p>
            </div>
          ) : (
            <div className="space-y-4">
              {licenses.map((license) => (
                <div key={license.license_id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${complianceService.getLicenseStatusColor(license)}`}>
                          {license.license_type}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${complianceService.getLicenseStatusColor(license)}`}>
                          {complianceService.getLicenseStatusText(license)}
                        </div>
                        {license.is_expired && (
                          <div className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 animate-pulse">
                            EXPIRED
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-semibold text-gray-700">License #:</span>
                          <span className="ml-2 text-gray-600">{license.license_number}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Issuing Authority:</span>
                          <span className="ml-2 text-gray-600">{license.issuing_authority}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Issue Date:</span>
                          <span className="ml-2 text-gray-600">{formatDate(license.issue_date)}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Expiration:</span>
                          <span className={`ml-2 font-medium ${license.is_expired ? 'text-red-600' : license.days_until_expiration <= 30 ? 'text-yellow-600' : 'text-gray-600'}`}>
                            {formatDate(license.expiration_date)}
                            {license.days_until_expiration > 0 && (
                              <span className="text-xs ml-1">
                                ({license.days_until_expiration} days)
                              </span>
                            )}
                          </span>
                        </div>
                        {license.verification_notes && (
                          <div className="md:col-span-2">
                            <span className="font-semibold text-gray-700">Notes:</span>
                            <span className="ml-2 text-gray-600">{license.verification_notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      {license.verification_status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleVerifyLicense(license.license_id, 'verified')}
                            disabled={loading}
                            className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleVerifyLicense(license.license_id, 'invalid')}
                            disabled={loading}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            Mark Invalid
                          </button>
                        </div>
                      )}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(license)}
                          disabled={loading}
                          className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLicense(license.license_id)}
                          disabled={loading}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LicenseManagementModal;