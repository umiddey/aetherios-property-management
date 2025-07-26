import React, { useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateTenantForm = ({ onBack, onSuccess }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: '',
    bank_account: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth).toISOString() : null
      };

      await axios.post(`${API}/v2/accounts/`, {
        ...submitData,
        account_type: 'tenant',
        company_id: 'company_1'
      });
      onSuccess();
    } catch (error) {
      // Error creating tenant - not logged for security
      setError(error.response?.data?.detail || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
{t('forms.backTo')} {t('navigation.tenants')}
      </button>
      
      <div className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('forms.createTenant.title')}</h2>
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
          {/* Personal Information Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              required
            />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              >
                <option value="">{t('forms.createTenant.selectGender')}</option>
                <option value="male">{t('tenants.male')}</option>
                <option value="female">{t('tenants.female')}</option>
                <option value="other">{t('tenants.other')}</option>
              </select>
            </div>
          </div>

          {/* Financial Information Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createTenant.financialInfo')}</h3>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              placeholder="{t('forms.createTenant.bankAccountPlaceholder')}"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('forms.createTenant.notes')}
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              rows="3"
              placeholder="{t('forms.createTenant.notesPlaceholder')}"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 font-medium"
            >
              {t('forms.cancelButton')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg hover:shadow-xl flex items-center gap-2"
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
                  {t('forms.createButton')} {t('tenants.title').slice(0, -1)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTenantForm;
