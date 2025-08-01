// src/components/LicenseManagementView.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import useToast from '../hooks/useToast';
import { canManageLicenses } from '../utils/permissions';
import complianceService from '../services/complianceService';
import { 
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const LicenseManagementView = ({ handleNav }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState(null);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [contractorLicenses, setContractorLicenses] = useState([]);
  const [showAddLicenseForm, setShowAddLicenseForm] = useState(false);
  const [showEditLicenseForm, setShowEditLicenseForm] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [formData, setFormData] = useState({
    license_type: '',
    license_number: '',
    issuing_authority: '',
    issue_date: '',
    expiration_date: '',
    verification_notes: ''
  });

  // Check permissions
  const hasLicensePermissions = canManageLicenses(user);

  useEffect(() => {
    if (!hasLicensePermissions) {
      showError('Access denied. You need property manager admin privileges to access license management.');
      handleNav('dashboard');
      return;
    }
    
    fetchData();
  }, [hasLicensePermissions]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch overview stats
      const stats = await complianceService.getLicenseOverviewStats();
      setOverviewStats(stats);
      
      // Fetch expiring licenses (30 days)
      const expiring = await complianceService.getExpiringLicenses(30);
      setExpiringLicenses(expiring);
      
    } catch (error) {
      // Handle errors gracefully without console spam
      if (error.response?.status === 403) {
        showError('Access denied. You need property manager admin privileges to access license data.');
        handleNav('dashboard');
        return;
      } else if (error.response?.status === 404) {
        showError('License data not found. Please contact your administrator.');
      } else {
        // Only log detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error fetching license data:', error.message);
        }
        showError('Unable to load license data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchContractorLicenses = async (contractorId) => {
    try {
      const licenses = await complianceService.getContractorLicenses(contractorId);
      setContractorLicenses(licenses);
    } catch (error) {
      // Handle errors gracefully without console spam
      if (error.response?.status === 403) {
        showError('Access denied. You need property manager admin privileges.');
      } else if (error.response?.status === 404) {
        showError('Contractor licenses not found.');
      } else {
        // Only log detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error fetching contractor licenses:', error.message);
        }
        showError('Unable to load contractor licenses. Please try again later.');
      }
    }
  };

  const handleAddLicense = async (e) => {
    e.preventDefault();
    
    if (!selectedContractor) {
      showError('Please select a contractor first');
      return;
    }

    try {
      const licenseData = {
        ...formData,
        contractor_id: selectedContractor.id
      };
      
      await complianceService.createLicense(licenseData);
      showSuccess('License added successfully');
      
      // Refresh data
      await fetchData();
      await fetchContractorLicenses(selectedContractor.id);
      
      // Reset form
      setShowAddLicenseForm(false);
      setFormData({
        license_type: '',
        license_number: '',
        issuing_authority: '',
        issue_date: '',
        expiration_date: '',
        verification_notes: ''
      });
      
    } catch (error) {
      // Handle errors gracefully without console spam
      if (error.response?.status === 403) {
        showError('Access denied. You need property manager admin privileges.');
      } else if (error.response?.status === 400) {
        showError('Invalid license data. Please check your inputs.');
      } else {
        // Only log detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error adding license:', error.message);
        }
        showError('Failed to add license. Please try again later.');
      }
    }
  };

  const handleEditLicense = async (e) => {
    e.preventDefault();
    
    if (!selectedLicense) return;

    try {
      await complianceService.updateLicense(selectedLicense.license_id, formData);
      showSuccess('License updated successfully');
      
      // Refresh data
      await fetchData();
      if (selectedContractor) {
        await fetchContractorLicenses(selectedContractor.id);
      }
      
      // Reset form
      setShowEditLicenseForm(false);
      setSelectedLicense(null);
      
    } catch (error) {
      // Handle errors gracefully without console spam
      if (error.response?.status === 403) {
        showError('Access denied. You need property manager admin privileges.');
      } else if (error.response?.status === 400) {
        showError('Invalid license data. Please check your inputs.');
      } else if (error.response?.status === 404) {
        showError('License not found.');
      } else {
        // Only log detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error updating license:', error.message);
        }
        showError('Failed to update license. Please try again later.');
      }
    }
  };

  const handleRemoveLicense = async (licenseId) => {
    if (!confirm('Are you sure you want to remove this license?')) return;

    try {
      await complianceService.removeLicense(licenseId);
      showSuccess('License removed successfully');
      
      // Refresh data
      await fetchData();
      if (selectedContractor) {
        await fetchContractorLicenses(selectedContractor.id);
      }
      
    } catch (error) {
      // Handle errors gracefully without console spam
      if (error.response?.status === 403) {
        showError('Access denied. You need property manager admin privileges.');
      } else if (error.response?.status === 404) {
        showError('License not found.');
      } else {
        // Only log detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error removing license:', error.message);
        }
        showError('Failed to remove license. Please try again later.');
      }
    }
  };

  const handleVerifyLicense = async (licenseId, status) => {
    try {
      await complianceService.updateLicenseVerification(licenseId, status);
      showSuccess(`License ${status === 'verified' ? 'verified' : 'marked as invalid'} successfully`);
      
      // Refresh data
      await fetchData();
      if (selectedContractor) {
        await fetchContractorLicenses(selectedContractor.id);
      }
      
    } catch (error) {
      // Handle errors gracefully without console spam
      if (error.response?.status === 403) {
        showError('Access denied. You need property manager admin privileges.');
      } else if (error.response?.status === 404) {
        showError('License not found.');
      } else {
        // Only log detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error updating license verification:', error.message);
        }
        showError('Failed to update license verification. Please try again later.');
      }
    }
  };

  const getStatusBadge = (status, expirationDate) => {
    const isExpired = expirationDate && new Date(expirationDate) < new Date();
    const isExpiringSoon = expirationDate && 
      new Date(expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (isExpired || status === 'expired') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircleIcon className="w-4 h-4 mr-1" />
          Expired
        </span>
      );
    }

    if (isExpiringSoon) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
          Expiring Soon
        </span>
      );
    }

    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Verified
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <ClockIcon className="w-4 h-4 mr-1" />
            Pending
          </span>
        );
      case 'invalid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-4 h-4 mr-1" />
            Invalid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <ClockIcon className="w-4 h-4 mr-1" />
            Unknown
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (!hasLicensePermissions) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
              <p className="text-sm text-gray-500">Manage contractor licenses and compliance</p>
            </div>
          </div>
          <button
            onClick={() => handleNav('dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      {overviewStats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BuildingOffice2Icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Contractors</dt>
                    <dd className="text-lg font-medium text-gray-900">{overviewStats.total_contractors}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Eligible Contractors</dt>
                    <dd className="text-lg font-medium text-gray-900">{overviewStats.eligible_contractors}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Expiring Soon</dt>
                    <dd className="text-lg font-medium text-gray-900">{overviewStats.expiring_soon}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Expired</dt>
                    <dd className="text-lg font-medium text-gray-900">{overviewStats.expired_licenses}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Licenses Alert */}
      {expiringLicenses.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">{expiringLicenses.length} licenses</span> are expiring within the next 30 days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Licenses Table */}
      {expiringLicenses.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Licenses Expiring Soon</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contractor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiration Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expiringLicenses.map((license) => (
                  <tr key={license.license_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {license.contractor_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {license.license_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {license.license_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(license.expiration_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(license.verification_status, license.expiration_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedContractor({ id: license.contractor_id, name: license.contractor_name });
                          fetchContractorLicenses(license.contractor_id);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View All
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => handleNav('accounts')}
            className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <BuildingOffice2Icon className="h-6 w-6 text-blue-600 mr-3" />
            <div className="text-left">
              <div className="text-sm font-medium text-blue-900">View All Contractors</div>
              <div className="text-xs text-blue-600">Manage contractor accounts and licenses</div>
            </div>
          </button>
          
          <button
            onClick={() => handleNav('service-requests')}
            className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <ShieldCheckIcon className="h-6 w-6 text-green-600 mr-3" />
            <div className="text-left">
              <div className="text-sm font-medium text-green-900">Service Requests</div>
              <div className="text-xs text-green-600">Review contractor assignments</div>
            </div>
          </button>
        </div>
      </div>

      {/* Selected Contractor Licenses */}
      {selectedContractor && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Licenses for {selectedContractor.name}
              </h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAddLicenseForm(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add License
              </button>
              <button
                onClick={() => setSelectedContractor(null)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issuing Authority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiration Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contractorLicenses.map((license) => (
                  <tr key={license.license_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {license.license_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {license.license_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {license.issuing_authority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(license.expiration_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(license.verification_status, license.expiration_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedLicense(license);
                          setFormData({
                            license_type: license.license_type,
                            license_number: license.license_number,
                            issuing_authority: license.issuing_authority,
                            issue_date: license.issue_date?.split('T')[0] || '',
                            expiration_date: license.expiration_date?.split('T')[0] || '',
                            verification_notes: license.verification_notes || ''
                          });
                          setShowEditLicenseForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      
                      {license.verification_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleVerifyLicense(license.license_id, 'verified')}
                            className="text-green-600 hover:text-green-900"
                            title="Verify License"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleVerifyLicense(license.license_id, 'invalid')}
                            className="text-red-600 hover:text-red-900"
                            title="Mark as Invalid"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => handleRemoveLicense(license.license_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add License Form Modal */}
      {showAddLicenseForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New License</h3>
              <form onSubmit={handleAddLicense}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Type</label>
                    <select
                      value={formData.license_type}
                      onChange={(e) => setFormData({...formData, license_type: e.target.value})}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select license type</option>
                      <option value="electrical">Electrical</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="hvac">HVAC</option>
                      <option value="general_contractor">General Contractor</option>
                      <option value="carpentry">Carpentry</option>
                      <option value="painting">Painting</option>
                      <option value="roofing">Roofing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Issuing Authority</label>
                    <input
                      type="text"
                      value={formData.issuing_authority}
                      onChange={(e) => setFormData({...formData, issuing_authority: e.target.value})}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                    <input
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                    <input
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={formData.verification_notes}
                      onChange={(e) => setFormData({...formData, verification_notes: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddLicenseForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add License
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit License Form Modal */}
      {showEditLicenseForm && selectedLicense && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit License</h3>
              <form onSubmit={handleEditLicense}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Type</label>
                    <select
                      value={formData.license_type}
                      onChange={(e) => setFormData({...formData, license_type: e.target.value})}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select license type</option>
                      <option value="electrical">Electrical</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="hvac">HVAC</option>
                      <option value="general_contractor">General Contractor</option>
                      <option value="carpentry">Carpentry</option>
                      <option value="painting">Painting</option>
                      <option value="roofing">Roofing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Issuing Authority</label>
                    <input
                      type="text"
                      value={formData.issuing_authority}
                      onChange={(e) => setFormData({...formData, issuing_authority: e.target.value})}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                    <input
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                    <input
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={formData.verification_notes}
                      onChange={(e) => setFormData({...formData, verification_notes: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditLicenseForm(false);
                      setSelectedLicense(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Update License
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseManagementView;