import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreatePropertyForm = ({ onBack, onSuccess, properties = [] }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    property_type: 'apartment',
    street: '',
    house_nr: '',
    postcode: '',
    city: '',
    floor: '',
    surface_area: '',
    number_of_rooms: '',
    num_toilets: '',
    max_tenants: '',
    description: '',
    rent_per_sqm: '',
    cold_rent: '',
    status: 'empty',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    parent_id: '',
    manager_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [idValidationError, setIdValidationError] = useState('');
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch users for manager dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/v1/users/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setError('Failed to load property managers');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const surface = parseFloat(formData.surface_area) || 0;
    const perSqm = parseFloat(formData.rent_per_sqm) || 0;
    const calculatedColdRent = (surface * perSqm).toFixed(2);
    setFormData(prev => ({ ...prev, cold_rent: calculatedColdRent }));
  }, [formData.surface_area, formData.rent_per_sqm]);

  // Auto-generate property ID when name and type are filled
  useEffect(() => {
    if (formData.name && formData.property_type && !isGeneratingId) {
      generatePropertyId();
    }
  }, [formData.name, formData.property_type]);

  const generatePropertyId = async () => {
    setIsGeneratingId(true);
    try {
      // Extract first two words from property name for better uniqueness
      const nameParts = formData.name.trim().split(/[\s-_]+/).filter(part => part.length > 0);
      const namePrefix = nameParts.length >= 2 
        ? `${nameParts[0]}_${nameParts[1]}`.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '')
        : nameParts[0].toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      
      // Get property type
      const propertyType = formData.property_type.toLowerCase();
      
      // Calculate current quarter
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // getMonth() returns 0-11
      const quarter = Math.ceil(month / 3).toString().padStart(2, '0');
      
      // Create base prefix
      const basePrefix = `${namePrefix}_${propertyType}_${year}${quarter}`;
      
      // Query backend to find existing properties with this prefix to get next sequential number
      const response = await axios.get(`${API}/v1/properties`, {
        params: {
          search: basePrefix,
          limit: 1000 // Get all matching to count them
        }
      });
      
      // Count existing properties with this prefix
      const existingCount = response.data.filter(prop => 
        prop.id && prop.id.startsWith(basePrefix)
      ).length;
      
      // Generate next sequential number (starting from 001)
      const sequentialNumber = (existingCount + 1).toString().padStart(3, '0');
      
      // Create final property ID
      const generatedId = `${basePrefix}${sequentialNumber}`;
      
      // Update the form data
      setFormData(prev => ({ ...prev, id: generatedId }));
      setIdValidationError(''); // Clear any existing errors
      
    } catch (error) {
      console.error('Error generating property ID:', error);
      // Fallback to simple generation if API fails
      const nameParts = formData.name.trim().split(/[\s-_]+/).filter(part => part.length > 0);
      const namePrefix = nameParts.length >= 2 
        ? `${nameParts[0]}_${nameParts[1]}`.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '')
        : nameParts[0].toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      const propertyType = formData.property_type.toLowerCase();
      const now = new Date();
      const year = now.getFullYear();
      const quarter = Math.ceil((now.getMonth() + 1) / 3).toString().padStart(2, '0');
      const fallbackId = `${namePrefix}_${propertyType}_${year}${quarter}001`;
      setFormData(prev => ({ ...prev, id: fallbackId }));
    } finally {
      setIsGeneratingId(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        surface_area: parseFloat(formData.surface_area),
        number_of_rooms: parseInt(formData.number_of_rooms),
        num_toilets: formData.num_toilets ? parseInt(formData.num_toilets) : null,
        max_tenants: formData.max_tenants ? parseInt(formData.max_tenants) : null,
        rent_per_sqm: formData.rent_per_sqm ? parseFloat(formData.rent_per_sqm) : null,
        cold_rent: formData.cold_rent ? parseFloat(formData.cold_rent) : null,
        parent_id: formData.parent_id || null
      };

      await axios.post(`${API}/v1/properties/`, submitData);
      onSuccess();
    } catch (error) {
      console.log(error);
      
      // Handle validation errors from FastAPI
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Handle validation error array
          const errorMessages = error.response.data.detail.map(err => 
            `${err.loc.join('.')}: ${err.msg}`
          ).join(', ');
          setError(`Validation errors: ${errorMessages}`);
        } else {
          setError(error.response.data.detail);
        }
      } else {
        setError('Failed to create property');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
{t('forms.backTo')} {t('navigation.properties')}
      </button>
      
      <div className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('forms.createProperty.title')}</h2>
        </div>
        
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
{t('forms.createProperty.propertyId')} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <input
                type="text"
                name="id"
                value={formData.id}
                readOnly
                className={`w-full pl-10 px-4 py-3 border rounded-xl transition-all duration-200 bg-gray-50 ${
                  idValidationError 
                    ? 'border-red-300' 
                    : 'border-gray-300'
                }`}
                placeholder={isGeneratingId ? "Generating ID..." : "Auto-generated based on name and type"}
              />
              {isGeneratingId && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            {idValidationError && (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {idValidationError}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated: [first]_[last]_[type]_[YYYYQQ###] (e.g., jordan_smith_apartment_202503001)
            </p>
          </div>
          
          {/* Basic Information Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createProperty.basicInfo')}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
{t('forms.createProperty.propertyName')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.propertyType')} *
              </label>
              <select
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              >
                <option value="apartment">{t('properties.apartment')}</option>
                <option value="house">{t('properties.house')}</option>
                <option value="office">{t('properties.office')}</option>
                <option value="commercial">{t('properties.commercial')}</option>
                <option value="building">{t('properties.building')}</option>
                <option value="complex">Komplex</option>
              </select>
            </div>
          </div>

          {/* Address Information Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createProperty.addressInfo')}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.street')} *
              </label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.houseNumber')} *
              </label>
              <input
                type="text"
                name="house_nr"
                value={formData.house_nr}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.postcode')} *
              </label>
              <input
                type="text"
                name="postcode"
                value={formData.postcode}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.city')} *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Property Details Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createProperty.propertyDetails')}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.floor')}
              </label>
              <input
                type="text"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="e.g., 2nd, Ground"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.surfaceArea')} (m²) *
              </label>
              <input
                type="number"
                name="surface_area"
                value={formData.surface_area}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                step="0.01"
                min="0"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.numberOfRooms')} *
              </label>
              <input
                type="number"
                name="number_of_rooms"
                value={formData.number_of_rooms}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                min="1"
                required
              />
            </div>
          </div>

          {/* Rental Information Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createProperty.rentalInfo')}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.numberOfToilets')}
              </label>
              <input
                type="number"
                name="num_toilets"
                value={formData.num_toilets}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.maxTenants')}
              </label>
              <input
                type="number"
                name="max_tenants"
                value={formData.max_tenants}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                min="1"
                placeholder="Leave empty for no limit"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.rentPerSqm')} (€) *
              </label>
              <input
                type="number"
                name="rent_per_sqm"
                value={formData.rent_per_sqm}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.coldRent')}
              </label>
              <input
                type="text"
                value={formData.cold_rent}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createProperty.additionalInfo')}</h3>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('common.description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder={t('forms.createProperty.additionalDetailsPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('common.status')} *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="empty">{t('forms.createProperty.empty')}</option>
              <option value="active">{t('forms.createProperty.active')}</option>
              <option value="cancel">{t('forms.createProperty.cancelled')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('forms.createProperty.parentProperty')}
            </label>
            <select
              name="parent_id"
              value={formData.parent_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('forms.createProperty.none')}</option>
              {properties.map(property => (
                <option key={property.id || property._id} value={property.id || property._id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          {/* Property Manager Selection */}
          <div className="mt-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Property Manager *</h3>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Assign Property Manager
              </label>
              {loadingUsers ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500">
                  Loading property managers...
                </div>
              ) : (
                <select
                  name="manager_id"
                  value={formData.manager_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  required
                >
                  <option value="">Select a property manager</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.role})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                This manager will receive service requests for this property
              </p>
            </div>
          </div>

          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createProperty.ownerInfo')}</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.ownerName')}
              </label>
              <input
                type="text"
                name="owner_name"
                value={formData.owner_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createProperty.ownerEmail')}
              </label>
              <input
                type="email"
                name="owner_email"
                value={formData.owner_email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('forms.createProperty.ownerPhone')}
            </label>
            <input
              type="tel"
              name="owner_phone"
              value={formData.owner_phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('forms.createTenant.creating')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('forms.createButton')} {t('properties.title').slice(0, -1)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePropertyForm;