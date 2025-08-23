import React, { useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { PROFESSIONAL_FORM_CLASSES, getProfessionalInputClasses, getProfessionalSelectClasses, getProfessionalTextareaClasses } from './ui/ProfessionalFormStandards';
import Button from './ui/Button';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateAccountForm = ({ onBack, onSuccess }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    account_type: 'tenant', // Default to tenant
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    // Tenant-specific fields
    date_of_birth: '',
    gender: '',
    bank_account: '',
    // Employee-specific fields
    employee_id: '',
    department: '',
    position: '',
    start_date: '',
    salary: '',
    // Contractor-specific fields
    company_name: '',
    tax_id: '',
    contract_type: '',
    hourly_rate: '',
    services_offered: [], // Critical field for service matching
    specializations: [], // Additional contractor skills
    service_areas: [], // Geographic coverage areas
    license_number: '', // Professional license info
    insurance_info: '', // Insurance details
    // Common fields
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate contractor services_offered requirement
      if (formData.account_type === 'contractor' && formData.services_offered.length === 0) {
        setError('Please select at least one service for contractor accounts to enable job assignments');
        return;
      }

      // Build profile data based on account type
      let profile_data = {};
      
      if (formData.account_type === 'tenant') {
        profile_data = {
          date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth).toISOString() : null,
          gender: formData.gender,
          bank_account: formData.bank_account
        };
      } else if (formData.account_type === 'employee') {
        profile_data = {
          employee_id: formData.employee_id,
          department: formData.department,
          position: formData.position,
          hire_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
          salary: formData.salary ? parseFloat(formData.salary) : null
        };
      } else if (formData.account_type === 'contractor') {
        profile_data = {
          business_name: formData.company_name,
          tax_id: formData.tax_id,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          services_offered: formData.services_offered, // Critical for service matching
          specializations: formData.specializations,
          service_areas: formData.service_areas,
          license_number: formData.license_number,
          insurance_info: formData.insurance_info
        };
      }

      const submitData = {
        account_type: formData.account_type,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        profile_data
      };

      await axios.post(`${API}/v2/accounts/`, submitData);
      onSuccess();
    } catch (error) {
      // Error creating account - not logged for security
      setError(error.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getAccountTypeIcon = (accountType) => {
    switch (accountType) {
      case 'tenant':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'employee':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6" />
          </svg>
        );
      case 'contractor':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getAccountTypeColor = (accountType) => {
    switch (accountType) {
      case 'tenant':
        return 'from-purple-500 to-pink-500';
      case 'employee':
        return 'from-blue-500 to-indigo-500';
      case 'contractor':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors duration-200 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {t('forms.backTo')} {t('navigation.accounts')}
      </button>
      
      <div className={PROFESSIONAL_FORM_CLASSES.container}>
        <div className="flex items-center mb-8">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            {getAccountTypeIcon(formData.account_type)}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('accounts.addAccount')}</h2>
        </div>
        
        {error && (
          <div className={PROFESSIONAL_FORM_CLASSES.alertError}>
            <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Type Selection */}
          <div className="mt-8 mb-6">
            <div className="flex items-center mb-4">
              <div className="w-6 h-6 text-gray-600 mr-2 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('accounts.type')}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['tenant', 'employee', 'contractor'].map((type) => (
                <label key={type} className="cursor-pointer">
                  <input
                    type="radio"
                    name="account_type"
                    value={type}
                    checked={formData.account_type === type}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={`p-4 rounded-md border-2 transition-all duration-200 ${
                    formData.account_type === type 
                      ? `border-blue-500 bg-blue-50 shadow-lg` 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}>
                    <div className="flex items-center">
                      <div className="w-6 h-6 text-gray-600 mr-2 flex items-center justify-center">
                        {getAccountTypeIcon(type)}
                      </div>
                      <span className="font-medium text-gray-900">{t(`accounts.${type}`)}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-6 h-6 text-gray-600 mr-2 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createTenant.personalInfo')}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createTenant.firstName')} *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createTenant.lastName')} *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
                required
              />
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-6 h-6 text-gray-600 mr-2 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createTenant.contactInfo')}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createTenant.email')} *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('forms.createTenant.phone')}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('forms.createTenant.address')} *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            />
          </div>

          {/* Type-Specific Fields */}
          {formData.account_type === 'tenant' && (
            <>
              <div className="mt-8 mb-6">
                <div className="flex items-center">
                  <div className="w-6 h-6 text-gray-600 mr-2 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{t('accounts.tenant')} Details</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {t('forms.createTenant.dateOfBirth')}
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {t('forms.createTenant.gender')}
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                  >
                    <option value="">{t('forms.createTenant.selectGender')}</option>
                    <option value="male">{t('tenants.male')}</option>
                    <option value="female">{t('tenants.female')}</option>
                    <option value="other">{t('tenants.other')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t('forms.createTenant.bankAccount')}
                </label>
                <input
                  type="text"
                  name="bank_account"
                  value={formData.bank_account}
                  onChange={handleChange}
                  className={getProfessionalInputClasses()}
                  placeholder={t('forms.createTenant.bankAccountPlaceholder')}
                />
              </div>
            </>
          )}

          {formData.account_type === 'employee' && (
            <>
              <div className="mt-8 mb-6">
                <div className="flex items-center">
                  <div className="w-6 h-6 text-gray-600 mr-2 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{t('accounts.employee')} Details</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Position
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Salary (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  className={getProfessionalInputClasses()}
                />
              </div>
            </>
          )}

          {formData.account_type === 'contractor' && (
            <>
              <div className="mt-8 mb-6">
                <div className="flex items-center">
                  <div className="w-6 h-6 text-gray-600 mr-2 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{t('accounts.contractor')} Details</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Contract Type
                  </label>
                  <select
                    name="contract_type"
                    value={formData.contract_type}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                  >
                    <option value="">Select Contract Type</option>
                    <option value="freelance">Freelance</option>
                    <option value="consulting">Consulting</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="construction">Construction</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Hourly Rate (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="hourly_rate"
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                  />
                </div>
              </div>

              {/* Services Offered - CRITICAL for contractor matching */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Services Offered * (Required for job assignments)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { value: 'plumbing', label: 'Plumbing', icon: '🔧' },
                    { value: 'electrical', label: 'Electrical', icon: '⚡' },
                    { value: 'hvac', label: 'HVAC', icon: '❄️' },
                    { value: 'appliance_repair', label: 'Appliance Repair', icon: '🏠' },
                    { value: 'general_maintenance', label: 'General Maintenance', icon: '🔨' },
                    { value: 'cleaning', label: 'Cleaning', icon: '🧹' },
                    { value: 'security', label: 'Security', icon: '🔒' }
                  ].map((service) => (
                    <label key={service.value} className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.services_offered.includes(service.value)}
                        onChange={(e) => {
                          const newServices = e.target.checked
                            ? [...formData.services_offered, service.value]
                            : formData.services_offered.filter(s => s !== service.value);
                          setFormData({ ...formData, services_offered: newServices });
                        }}
                        className="sr-only"
                      />
                      <div className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        formData.services_offered.includes(service.value)
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{service.icon}</span>
                          <span className="text-sm font-medium text-gray-900">{service.label}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {formData.services_offered.length === 0 && (
                  <p className="text-red-500 text-sm mt-1">Please select at least one service to enable job assignments</p>
                )}
              </div>

              {/* Additional Contractor Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    License Number
                  </label>
                  <input
                    type="text"
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                    placeholder="Professional license number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Insurance Info
                  </label>
                  <input
                    type="text"
                    name="insurance_info"
                    value={formData.insurance_info}
                    onChange={handleChange}
                    className={getProfessionalInputClasses()}
                    placeholder="Insurance provider and policy"
                  />
                </div>
              </div>

              {/* Service Areas */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Service Areas
                </label>
                <input
                  type="text"
                  value={formData.service_areas.join(', ')}
                  onChange={(e) => {
                    const areas = e.target.value.split(',').map(area => area.trim()).filter(area => area);
                    setFormData({ ...formData, service_areas: areas });
                  }}
                  className={getProfessionalInputClasses()}
                  placeholder="Cities or postal codes (comma separated): Munich, 80331, Augsburg"
                />
              </div>

              {/* Specializations */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Specializations
                </label>
                <input
                  type="text"
                  value={formData.specializations.join(', ')}
                  onChange={(e) => {
                    const specs = e.target.value.split(',').map(spec => spec.trim()).filter(spec => spec);
                    setFormData({ ...formData, specializations: specs });
                  }}
                  className={getProfessionalInputClasses()}
                  placeholder="Specific skills (comma separated): Emergency repairs, Solar installation, Industrial HVAC"
                />
              </div>
            </>
          )}

          {/* Notes Section */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('forms.createTenant.notes')}
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              rows="3"
              placeholder={`Additional notes about this ${formData.account_type}...`}
            />
          </div>

          <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-700 bg-blue-600 rounded-md hover:from-gray-200 hover:to-gray-300 transition-all duration-300 font-medium"
            >
              {t('forms.cancelButton')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('forms.createButton')} {t(`accounts.${formData.account_type}`)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAccountForm;