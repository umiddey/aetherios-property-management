import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateRentalAgreementForm = ({ onBack, onSuccess, t, logAction }) => {
  const { t: translate } = useTranslation();
  const [formData, setFormData] = useState({
    property_id: '',
    tenant_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    monthly_rent: '',
    deposit: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch properties and tenants for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [propertiesRes, tenantsRes] = await Promise.all([
          axios.get(`${API}/properties/?archived=false`),
          axios.get(`${API}/tenants/?archived=false`)
        ]);
        
        setProperties(propertiesRes.data);
        setTenants(tenantsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load properties and tenants');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        monthly_rent: parseFloat(formData.monthly_rent),
        deposit: formData.deposit ? parseFloat(formData.deposit) : 0,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
      };

      // Validate required fields
      if (!submitData.property_id || !submitData.tenant_id || !submitData.start_date || !submitData.monthly_rent) {
        throw new Error('Please fill in all required fields');
      }

      if (submitData.monthly_rent <= 0) {
        throw new Error('Monthly rent must be greater than 0');
      }

      if (submitData.deposit < 0) {
        throw new Error('Deposit cannot be negative');
      }

      if (submitData.end_date && new Date(submitData.end_date) <= new Date(submitData.start_date)) {
        throw new Error('End date must be after start date');
      }

      await axios.post(`${API}/v1/rental-agreements/`, submitData);
      
      if (logAction) {
        logAction('create_rental_agreement', { 
          property_id: submitData.property_id, 
          tenant_id: submitData.tenant_id,
          monthly_rent: submitData.monthly_rent
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error creating rental agreement:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to create rental agreement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getPropertyName = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? `${property.name} - ${property.address}` : 'Unknown Property';
  };

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown Tenant';
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="mb-4 text-blue-500 hover:text-blue-700 text-sm font-medium"
        >
          ← Back
        </button>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('Create Rental Agreement')}</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property and Tenant Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Property')} *
                </label>
                <select
                  name="property_id"
                  value={formData.property_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">{t('Select Property')}</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name} - {property.street} {property.house_nr}, {property.city}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Tenant')} *
                </label>
                <select
                  name="tenant_id"
                  value={formData.tenant_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">{t('Select Tenant')}</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name} - {tenant.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Property and Tenant Preview */}
            {formData.property_id && formData.tenant_id && (
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-blue-900 mb-2">{t('Agreement Summary')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>{t('Property')}:</strong> {getPropertyName(formData.property_id)}</p>
                  </div>
                  <div>
                    <p><strong>{t('Tenant')}:</strong> {getTenantName(formData.tenant_id)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Monthly Rent')} ($) *
                </label>
                <input
                  type="number"
                  name="monthly_rent"
                  value={formData.monthly_rent}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="1500.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Security Deposit')} ($)
                </label>
                <input
                  type="number"
                  name="deposit"
                  value={formData.deposit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  step="0.01"
                  min="0"
                  placeholder="3000.00"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Start Date')} *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('End Date')} ({t('Optional - Leave empty for indefinite')})
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={formData.start_date}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('Notes')} ({t('Optional')})
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="4"
                placeholder={t('Additional notes about the rental agreement...')}
              />
            </div>

            {/* Financial Summary */}
            {formData.monthly_rent && (
              <div className="bg-green-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-green-900 mb-2">{t('Financial Summary')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p><strong>{t('Monthly Rent')}:</strong> ${parseFloat(formData.monthly_rent || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p><strong>{t('Security Deposit')}:</strong> ${parseFloat(formData.deposit || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p><strong>{t('Annual Rent')}:</strong> ${(parseFloat(formData.monthly_rent || 0) * 12).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || !formData.property_id || !formData.tenant_id || !formData.monthly_rent}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('Creating...') : t('Create Rental Agreement')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRentalAgreementForm;