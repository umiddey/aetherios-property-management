import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import { useNavigate, useLocation } from 'react-router-dom';
import cachedAxios from '../utils/cachedAxios';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const CreateContractForm = () => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
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
    related_property_id: '',
    related_tenant_id: '',
    related_user_id: '',
    description: '',
    terms: '',
    type_specific_data: {}
  });

  const [errors, setErrors] = useState({});
  const [isPropertyLocked, setIsPropertyLocked] = useState(false);
  const [partyRolesLocked, setPartyRolesLocked] = useState([false, false]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Handle prefilled data from navigation state
  useEffect(() => {
    if (location.state?.prefilledData) {
      const prefilledData = location.state.prefilledData;
      setFormData(prev => ({
        ...prev,
        ...prefilledData
      }));
      
      // Lock property field if it's pre-selected
      if (prefilledData.related_property_id) {
        setIsPropertyLocked(true);
      }
      
      // Lock party roles when coming from property detail page
      if (prefilledData.contract_type === 'rental' && prefilledData.related_property_id) {
        // For rental contracts from property detail, lock landlord and tenant roles
        setPartyRolesLocked([true, true]);
        setFormData(prev => ({
          ...prev,
          parties: [
            { ...prev.parties[0], role: 'landlord' },
            { ...prev.parties[1], role: 'tenant' }
          ]
        }));
      }
    }
  }, [location.state]);

  const fetchMetadata = async () => {
    try {
      const [typesResponse, propertiesResponse, tenantsResponse, usersResponse] = await Promise.all([
        cachedAxios.get(`${API}/api/v1/contracts/types/list`),
        cachedAxios.get(`${API}/api/v1/properties/`),
        cachedAxios.get(`${API}/api/v1/tenants/`),
        cachedAxios.get(`${API}/api/v1/users/`)
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

  const addParty = () => {
    setFormData(prev => ({
      ...prev,
      parties: [...prev.parties, { name: '', role: '', contact_email: '', contact_phone: '' }]
    }));
  };

  const removeParty = (index) => {
    if (formData.parties.length > 2) {
      const updatedParties = formData.parties.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, parties: updatedParties }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title?.trim()) {
      newErrors.title = t('errors.requiredField');
    }

    if (!formData.contract_type) {
      newErrors.contract_type = t('errors.requiredField');
    }

    if (!formData.start_date) {
      newErrors.start_date = t('errors.requiredField');
    }

    if (formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      newErrors.end_date = t('contracts.errors.invalidEndDate');
    }

    // Validate parties
    formData.parties.forEach((party, index) => {
      if (!party.name?.trim()) {
        newErrors[`party_${index}_name`] = t('errors.requiredField');
      }
      if (!party.role?.trim()) {
        newErrors[`party_${index}_role`] = t('errors.requiredField');
      }
    });

    if (formData.parties.length < 2) {
      newErrors.parties = t('contracts.errors.minimumParties');
    }

    if (formData.value && parseFloat(formData.value) < 0) {
      newErrors.value = t('contracts.errors.invalidValue');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        value: formData.value ? parseFloat(formData.value) : null,
        related_property_id: formData.related_property_id || null,
        related_tenant_id: formData.related_tenant_id || null,
        related_user_id: formData.related_user_id || null
      };

      const response = await cachedAxios.post(`${API}/api/v1/contracts/`, submitData);
      
      showSuccess(t('contracts.messages.contractCreated'));
      navigate('/contracts');
    } catch (error) {
      showError(error, t('contracts.messages.createError'));
    } finally {
      setLoading(false);
    }
  };

  const getContractTypeRoles = () => {
    switch (formData.contract_type) {
      case 'rental':
        return [
          { value: 'landlord', label: '🏠 Landlord/Property Owner' },
          { value: 'tenant', label: '👤 Tenant/Renter' },
          { value: 'property_manager', label: '🏢 Property Manager' },
          { value: 'guarantor', label: '🛡️ Guarantor' }
        ];
      case 'service':
        return [
          { value: 'client', label: '👥 Client/Customer' },
          { value: 'service_provider', label: '🔧 Service Provider' },
          { value: 'contractor', label: '🏗️ Contractor' },
          { value: 'subcontractor', label: '⚙️ Subcontractor' }
        ];
      case 'vendor':
        return [
          { value: 'buyer', label: '🛒 Buyer/Purchaser' },
          { value: 'supplier', label: '📦 Supplier/Vendor' },
          { value: 'distributor', label: '🚚 Distributor' },
          { value: 'manufacturer', label: '🏭 Manufacturer' }
        ];
      case 'employment':
        return [
          { value: 'employer', label: '🏢 Employer/Company' },
          { value: 'employee', label: '👔 Employee' },
          { value: 'hr_representative', label: '📋 HR Representative' },
          { value: 'manager', label: '👨‍💼 Manager/Supervisor' }
        ];
      case 'financial':
        return [
          { value: 'lender', label: '🏦 Lender/Bank' },
          { value: 'borrower', label: '💳 Borrower' },
          { value: 'guarantor', label: '🛡️ Guarantor' },
          { value: 'financial_advisor', label: '📊 Financial Advisor' }
        ];
      default:
        return [
          { value: 'party_a', label: '📄 Party A' },
          { value: 'party_b', label: '📄 Party B' },
          { value: 'witness', label: '👁️ Witness' },
          { value: 'other', label: '📝 Other' }
        ];
    }
  };

  const getContractTypeSpecificFields = () => {
    if (!formData.contract_type) return null;

    switch (formData.contract_type) {
      case 'rental':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-4">🏠 Rental Agreement Details</h4>
              
              {/* Property and Tenant Selection - Most Important */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    🏢 Property * (Required)
                    {isPropertyLocked && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Pre-selected
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      value={formData.related_property_id}
                      onChange={(e) => handleInputChange('related_property_id', e.target.value)}
                      className={`w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isPropertyLocked ? 'bg-blue-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isPropertyLocked}
                      required
                    >
                      <option value="">Select Property...</option>
                      {properties.map(property => (
                        <option key={property.id} value={property.id}>
                          {property.name} - {property.address}
                        </option>
                      ))}
                    </select>
                    {isPropertyLocked && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {isPropertyLocked && (
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-sm text-blue-600">
                        Property pre-selected from {location.state?.prefilledData?.property_name || 'property detail page'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsPropertyLocked(false)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Change Property
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    👤 Tenant * (Required)
                  </label>
                  <select
                    value={formData.related_tenant_id}
                    onChange={(e) => handleInputChange('related_tenant_id', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Tenant...</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.first_name} {tenant.last_name} - {tenant.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Financial Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    💰 Monthly Rent (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.type_specific_data?.monthly_rent || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      monthly_rent: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1500.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    🛡️ Security Deposit (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.type_specific_data?.security_deposit || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      security_deposit: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3000.00"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="utilities_included"
                  checked={formData.type_specific_data?.utilities_included || false}
                  onChange={(e) => handleInputChange('type_specific_data', {
                    ...formData.type_specific_data,
                    utilities_included: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="utilities_included" className="ml-2 block text-sm text-gray-700">
                  {t('contracts.rental.utilitiesIncluded')}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pet_allowed"
                  checked={formData.type_specific_data?.pet_allowed || false}
                  onChange={(e) => handleInputChange('type_specific_data', {
                    ...formData.type_specific_data,
                    pet_allowed: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="pet_allowed" className="ml-2 block text-sm text-gray-700">
                  {t('contracts.rental.petAllowed')}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="furnished"
                  checked={formData.type_specific_data?.furnished || false}
                  onChange={(e) => handleInputChange('type_specific_data', {
                    ...formData.type_specific_data,
                    furnished: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="furnished" className="ml-2 block text-sm text-gray-700">
                  {t('contracts.rental.furnished')}
                </label>
              </div>
            </div>
          </div>
        );
      case 'service':
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-4">🔧 Service Contract Details</h4>
              
              {/* Service Provider Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-2">
                    🏢 Related Property (Optional)
                  </label>
                  <select
                    value={formData.related_property_id}
                    onChange={(e) => handleInputChange('related_property_id', e.target.value)}
                    className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Property (if applicable)...</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name} - {property.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-2">
                    ⚙️ Service Type *
                  </label>
                  <select
                    value={formData.type_specific_data?.service_type || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      service_type: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select Service Type...</option>
                    <option value="maintenance">🔧 Maintenance</option>
                    <option value="cleaning">🧹 Cleaning</option>
                    <option value="security">🛡️ Security</option>
                    <option value="landscaping">🌱 Landscaping</option>
                  </select>
                </div>
              </div>

              {/* Service Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-2">
                    📅 Service Frequency *
                  </label>
                  <select
                    value={formData.type_specific_data?.frequency || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      frequency: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select Frequency...</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_time">One Time</option>
                  </select>
                </div>
              </div>
              
              {/* Scope of Work */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-green-800 mb-2">
                  📋 Scope of Work *
                </label>
                <textarea
                  value={formData.type_specific_data?.scope_of_work || ''}
                  onChange={(e) => handleInputChange('type_specific_data', {
                    ...formData.type_specific_data,
                    scope_of_work: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe the services to be provided..."
                  required
                />
              </div>
            </div>
          </div>
        );
      case 'vendor':
        return (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-4">📦 Vendor/Supplier Contract Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    🏢 Supplier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.type_specific_data?.supplier_name || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      supplier_name: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter supplier company name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    🚚 Delivery Terms
                  </label>
                  <input
                    type="text"
                    value={formData.type_specific_data?.delivery_terms || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      delivery_terms: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., FOB, CIF, delivery within 30 days"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-purple-800 mb-2">
                  📄 Goods/Services Description *
                </label>
                <textarea
                  value={formData.type_specific_data?.goods_services || ''}
                  onChange={(e) => handleInputChange('type_specific_data', {
                    ...formData.type_specific_data,
                    goods_services: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe the goods or services being provided..."
                  required
                />
              </div>
            </div>
          </div>
        );
      case 'employment':
        return (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-900 mb-4">👔 Employment Contract Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    💼 Position/Job Title *
                  </label>
                  <input
                    type="text"
                    value={formData.type_specific_data?.position || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      position: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., Software Engineer, Property Manager"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    🏢 Department
                  </label>
                  <input
                    type="text"
                    value={formData.type_specific_data?.department || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      department: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., IT, Property Management, HR"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    💰 Annual Salary (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.type_specific_data?.salary || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      salary: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="45000.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    ⏰ Working Hours
                  </label>
                  <input
                    type="text"
                    value={formData.type_specific_data?.working_hours || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      working_hours: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., 40 hours/week, 9 AM - 5 PM"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'financial':
        return (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-medium text-indigo-900 mb-4">💳 Financial Contract Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-2">
                    💰 Loan Amount (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.type_specific_data?.loan_amount || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      loan_amount: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="100000.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-2">
                    📊 Interest Rate (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.type_specific_data?.interest_rate || ''}
                    onChange={(e) => handleInputChange('type_specific_data', {
                      ...formData.type_specific_data,
                      interest_rate: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="3.5"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-indigo-800 mb-2">
                  📋 Repayment Terms *
                </label>
                <textarea
                  value={formData.type_specific_data?.repayment_terms || ''}
                  onChange={(e) => handleInputChange('type_specific_data', {
                    ...formData.type_specific_data,
                    repayment_terms: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe repayment schedule, terms, and conditions..."
                  required
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('contracts.createContract')}</h1>
        <p className="text-gray-600 mt-2">{t('contracts.createContractDescription')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.basicInformation')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('contracts.title')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('contracts.titlePlaceholder')}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('contracts.contractType')} *
              </label>
              <select
                value={formData.contract_type}
                onChange={(e) => handleInputChange('contract_type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contract_type ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">{t('common.select')}</option>
                {contractTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.contract_type && <p className="text-red-500 text-sm mt-1">{errors.contract_type}</p>}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('contracts.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('contracts.descriptionPlaceholder')}
            />
          </div>
        </div>

        {/* Parties */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">{t('contracts.parties')}</h3>
            <button
              type="button"
              onClick={addParty}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + {t('contracts.addParty')}
            </button>
          </div>

          <div className="space-y-4">
            {formData.parties.map((party, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    {t('contracts.party')} {index + 1}
                  </h4>
                  {formData.parties.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeParty(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      {t('common.remove')}
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contracts.partyName')} *
                    </label>
                    <input
                      type="text"
                      value={party.name}
                      onChange={(e) => handlePartyChange(index, 'name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[`party_${index}_name`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={t('contracts.partyNamePlaceholder')}
                    />
                    {errors[`party_${index}_name`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`party_${index}_name`]}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contracts.partyRole')} *
                      {partyRolesLocked[index] && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Pre-selected
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={party.role}
                        onChange={(e) => handlePartyChange(index, 'role', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`party_${index}_role`] ? 'border-red-500' : 'border-gray-300'
                        } ${
                          partyRolesLocked[index] ? 'bg-blue-50 cursor-not-allowed' : ''
                        }`}
                        disabled={partyRolesLocked[index]}
                      >
                        <option value="">Select Role...</option>
                        {getContractTypeRoles().map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {partyRolesLocked[index] && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {partyRolesLocked[index] && (
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-sm text-blue-600">
                          Role pre-selected from property detail page
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const newLockedRoles = [...partyRolesLocked];
                            newLockedRoles[index] = false;
                            setPartyRolesLocked(newLockedRoles);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Change Role
                        </button>
                      </div>
                    )}
                    {errors[`party_${index}_role`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`party_${index}_role`]}</p>
                    )}
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
                      placeholder={t('contracts.partyEmailPlaceholder')}
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
                      placeholder={t('contracts.partyPhonePlaceholder')}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {errors.parties && <p className="text-red-500 text-sm mt-2">{errors.parties}</p>}
        </div>

        {/* Dates and Value */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.datesAndValue')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('contracts.startDate')} *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.start_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('contracts.endDate')}
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.end_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('contracts.value')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  className={`w-full px-3 py-2 pr-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.value ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-2 text-gray-500">€</span>
              </div>
              {errors.value && <p className="text-red-500 text-sm mt-1">{errors.value}</p>}
            </div>
          </div>
        </div>


        {/* Contract Details */}
        {getContractTypeSpecificFields() && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📋 Contract Details</h3>
            {getContractTypeSpecificFields()}
          </div>
        )}

        {/* Terms */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.terms')}</h3>
          <textarea
            value={formData.terms}
            onChange={(e) => handleInputChange('terms', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('contracts.termsPlaceholder')}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/contracts')}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? t('common.creating') : t('common.create')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateContractForm;