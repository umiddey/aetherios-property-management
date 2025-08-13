import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import cachedAxios, { invalidateCache } from '../utils/cachedAxios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const ContractEditPage = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contractTypes, setContractTypes] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    contract_type: '',
    parties: [
      { name: '', role: '', contact_email: '', contact_phone: '' },
      { name: '', role: '', contact_email: '', contact_phone: '' }
    ],
    start_date: '',
    end_date: '',
    value: '',
    currency: 'EUR',
    property_id: '',
    other_party_id: '',
    related_user_id: '',
    description: '',
    terms: '',
    type_specific_data: {}
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchContract();
    fetchMetadata();
  }, [id]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await cachedAxios.get(`${API}/v1/contracts/${id}`);
      const contract = response.data;
      
      setFormData({
        title: contract.title || '',
        contract_type: contract.contract_type || '',
        parties: contract.parties || [
          { name: '', role: '', contact_email: '', contact_phone: '' },
          { name: '', role: '', contact_email: '', contact_phone: '' }
        ],
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        value: contract.value || '',
        currency: contract.currency || 'EUR',
        property_id: contract.property_id || '',
        other_party_id: contract.other_party_id || '',
        related_user_id: contract.related_user_id || '',
        description: contract.description || '',
        terms: contract.terms || '',
        type_specific_data: contract.type_specific_data || {}
      });
    } catch (error) {
      showError(error, 'Failed to fetch contract details');
      console.error('Error fetching contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [typesResponse, propertiesResponse, tenantsResponse, usersResponse] = await Promise.all([
        cachedAxios.get(`${API}/v1/contracts/types/list`),
        cachedAxios.get(`${API}/v1/properties/`),
        cachedAxios.get(`${API}/v2/accounts/?account_type=tenant`),
        cachedAxios.get(`${API}/v1/users/`)
      ]);
      
      setContractTypes(typesResponse.data);
      setProperties(propertiesResponse.data);
      setTenants(tenantsResponse.data);
      setUsers(usersResponse.data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handlePartyChange = (index, field, value) => {
    const updatedParties = [...formData.parties];
    updatedParties[index] = { ...updatedParties[index], [field]: value };
    setFormData(prev => ({ ...prev, parties: updatedParties }));
  };

  const handleTypeSpecificDataChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      type_specific_data: {
        ...prev.type_specific_data,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = t('validation.required');
    if (!formData.contract_type) newErrors.contract_type = t('validation.required');
    if (!formData.start_date) newErrors.start_date = t('validation.required');
    if (!formData.end_date) newErrors.end_date = t('validation.required');
    if (!formData.value || formData.value <= 0) newErrors.value = t('validation.required');

    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      newErrors.end_date = t('contracts.validation.endDateAfterStart');
    }

    formData.parties.forEach((party, index) => {
      if (!party.name.trim()) newErrors[`party_${index}_name`] = t('validation.required');
      if (!party.role.trim()) newErrors[`party_${index}_role`] = t('validation.required');
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError(null, t('validation.pleaseFillRequired'));
      return;
    }

    try {
      setSaving(true);
      
      const response = await cachedAxios.put(`${API}/v1/contracts/${id}`, formData);
      
      invalidateCache(`${API}/v1/contracts/`);
      invalidateCache(`${API}/v1/contracts/${id}`);
      
      showSuccess(t('contracts.contractUpdated'));
      navigate(`/contracts/${id}`);
    } catch (error) {
      showError(error, t('contracts.updateFailed'));
      console.error('Error updating contract:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderTypeSpecificFields = () => {
    if (!formData.contract_type) return null;

    switch (formData.contract_type) {
      case 'rental':
        return (
          <div className="bg-blue-50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-blue-900">{t('contracts.rental.details')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  {t('contracts.rental.monthlyRent')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.type_specific_data.monthly_rent || ''}
                  onChange={(e) => handleTypeSpecificDataChange('monthly_rent', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  {t('contracts.rental.securityDeposit')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.type_specific_data.security_deposit || ''}
                  onChange={(e) => handleTypeSpecificDataChange('security_deposit', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="utilities_included"
                  checked={formData.type_specific_data.utilities_included || false}
                  onChange={(e) => handleTypeSpecificDataChange('utilities_included', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="utilities_included" className="text-sm text-blue-800">
                  {t('contracts.rental.utilitiesIncluded')}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pet_allowed"
                  checked={formData.type_specific_data.pet_allowed || false}
                  onChange={(e) => handleTypeSpecificDataChange('pet_allowed', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="pet_allowed" className="text-sm text-blue-800">
                  {t('contracts.rental.petAllowed')}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="furnished"
                  checked={formData.type_specific_data.furnished || false}
                  onChange={(e) => handleTypeSpecificDataChange('furnished', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="furnished" className="text-sm text-blue-800">
                  {t('contracts.rental.furnished')}
                </label>
              </div>
            </div>
          </div>
        );
      case 'service':
        return (
          <div className="bg-green-50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-green-900">{t('contracts.service.details')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-green-800 mb-1">
                  {t('contracts.service.serviceType')}
                </label>
                <select
                  value={formData.type_specific_data.service_type || ''}
                  onChange={(e) => handleTypeSpecificDataChange('service_type', e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{t('common.select')}...</option>
                  <option value="maintenance">{t('contracts.service.types.maintenance')}</option>
                  <option value="cleaning">{t('contracts.service.types.cleaning')}</option>
                  <option value="landscaping">{t('contracts.service.types.landscaping')}</option>
                  <option value="repair">{t('contracts.service.types.repair')}</option>
                  <option value="security">{t('contracts.service.types.security')}</option>
                  <option value="other">{t('contracts.service.types.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-green-800 mb-1">
                  {t('contracts.service.frequency')}
                </label>
                <select
                  value={formData.type_specific_data.frequency || ''}
                  onChange={(e) => handleTypeSpecificDataChange('frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{t('common.select')}...</option>
                  <option value="once">{t('contracts.service.frequencies.once')}</option>
                  <option value="weekly">{t('contracts.service.frequencies.weekly')}</option>
                  <option value="monthly">{t('contracts.service.frequencies.monthly')}</option>
                  <option value="quarterly">{t('contracts.service.frequencies.quarterly')}</option>
                  <option value="annually">{t('contracts.service.frequencies.annually')}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-green-800 mb-1">
                  {t('contracts.service.scopeOfWork')}
                </label>
                <textarea
                  value={formData.type_specific_data.scope_of_work || ''}
                  onChange={(e) => handleTypeSpecificDataChange('scope_of_work', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-4">
          <li>
            <button
              onClick={() => navigate('/contracts')}
              className="text-gray-500 hover:text-gray-700"
            >
              {t('contracts.title')}
            </button>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <button
                onClick={() => navigate(`/contracts/${id}`)}
                className="ml-4 text-gray-500 hover:text-gray-700"
              >
                {formData.title || t('contracts.contractDetails')}
              </button>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-4 text-gray-500">{t('contracts.editContract')}</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('contracts.editContract')}</h1>
            <p className="text-gray-600 mt-1">{t('contracts.editDescription')}</p>
          </div>
          <button
            onClick={() => navigate(`/contracts/${id}`)}
            className="text-gray-500 hover:text-gray-700 px-4 py-2 border border-gray-300 rounded-lg"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.basicInformation')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contracts.title')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contracts.contractType')} *
              </label>
              <select
                value={formData.contract_type}
                onChange={(e) => handleInputChange('contract_type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contract_type ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">{t('common.select')}...</option>
                {contractTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.contract_type && <p className="text-red-500 text-sm mt-1">{errors.contract_type}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contracts.currency')}
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contracts.startDate')} *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.start_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contracts.endDate')} *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.end_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contracts.value')} *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => handleInputChange('value', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.value ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.value && <p className="text-red-500 text-sm mt-1">{errors.value}</p>}
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.parties')}</h3>
          <div className="space-y-4">
            {formData.parties.map((party, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  {t('contracts.party')} {index + 1}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contracts.partyName')} *
                    </label>
                    <input
                      type="text"
                      value={party.name}
                      onChange={(e) => handlePartyChange(index, 'name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[`party_${index}_name`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors[`party_${index}_name`] && <p className="text-red-500 text-sm mt-1">{errors[`party_${index}_name`]}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contracts.partyRole')} *
                    </label>
                    <input
                      type="text"
                      value={party.role}
                      onChange={(e) => handlePartyChange(index, 'role', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[`party_${index}_role`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors[`party_${index}_role`] && <p className="text-red-500 text-sm mt-1">{errors[`party_${index}_role`]}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contracts.partyEmail')}
                    </label>
                    <input
                      type="email"
                      value={party.contact_email}
                      onChange={(e) => handlePartyChange(index, 'contact_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contracts.partyPhone')}
                    </label>
                    <input
                      type="tel"
                      value={party.contact_phone}
                      onChange={(e) => handlePartyChange(index, 'contact_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Related Entities */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.relatedEntities')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contracts.relatedProperty')}
              </label>
              <select
                value={formData.property_id}
                onChange={(e) => handleInputChange('property_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('common.select')}...</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contracts.relatedTenant')}
              </label>
              <select
                value={formData.other_party_id}
                onChange={(e) => handleInputChange('other_party_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('common.select')}...</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.first_name} {tenant.last_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contracts.relatedUser')}
              </label>
              <select
                value={formData.related_user_id}
                onChange={(e) => handleInputChange('related_user_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('common.select')}...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.username})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Type-Specific Data */}
        {renderTypeSpecificFields()}

        {/* Description */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.description')}</h3>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('contracts.descriptionPlaceholder')}
          />
        </div>

        {/* Terms */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.terms')}</h3>
          <textarea
            value={formData.terms}
            onChange={(e) => handleInputChange('terms', e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('contracts.termsPlaceholder')}
          />
        </div>

        {/* Submit Button */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/contracts/${id}`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('contracts.updateContract')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ContractEditPage;