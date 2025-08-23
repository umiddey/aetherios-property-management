import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import cachedAxios, { invalidateCache } from '../utils/cachedAxios';
import { PROFESSIONAL_FORM_CLASSES, getProfessionalInputClasses, getProfessionalSelectClasses, getProfessionalTextareaClasses } from './ui/ProfessionalFormStandards';
import Button from './ui/Button';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateInvoiceForm = ({ onBack, onSuccess }) => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { showError } = useToast();
  
  const [formData, setFormData] = useState({
    contract_id: '',
    contract_title: '',
    tenant_id: '',
    property_id: '',
    amount: '',
    description: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'pending'
  });
  const [contracts, setContracts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [error, setError] = useState('');
  const [isContractBased, setIsContractBased] = useState(false);

  // Load data and set prefilled data from contract if available
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load contracts, tenants, and properties for dropdowns
        const [contractsRes, tenantsRes, propertiesRes] = await Promise.all([
          cachedAxios.get(`${API}/v1/contracts`),
          cachedAxios.get(`${API}/v2/accounts/?account_type=tenant`),
          cachedAxios.get(`${API}/v1/properties`)
        ]);
        setContracts(contractsRes.data);
        setTenants(tenantsRes.data);
        setAllProperties(propertiesRes.data);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();

    if (location.state?.prefilledData?.contract_id) {
      // Set prefilled data from contract
      const contractData = location.state.prefilledData;
      setIsContractBased(true);
      setFormData(prev => ({
        ...prev,
        contract_id: contractData.contract_id,
        contract_title: contractData.contract_title,
        property_id: contractData.property_id || '',
        tenant_id: contractData.other_party_id || '',
        description: `Invoice for ${contractData.contract_title} (${contractData.contract_type})`
      }));
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        invoice_date: new Date(formData.invoice_date).toISOString(),
        due_date: new Date(formData.due_date).toISOString()
      };

      await axios.post(`${API}/v1/invoices/`, submitData);
      
      // Invalidate cache for invoices and related data
      invalidateCache('/api/v1/invoices');
      invalidateCache('/api/v2/accounts');
      
      onSuccess();
    } catch (error) {
      // Error creating invoice - not logged for security
      setError(error.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Auto-fill contract title when contract is selected
    if (name === 'contract_id' && value) {
      const selectedContract = contracts.find(c => c.id === value);
      if (selectedContract) {
        setFormData(prev => ({
          ...prev,
          contract_id: value,
          contract_title: selectedContract.title,
          tenant_id: selectedContract.other_party_id || '',
          property_id: selectedContract.property_id || '',
          description: `Invoice for ${selectedContract.title} (${selectedContract.contract_type})`
        }));
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-md hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
{t('forms.backTo')} {t('navigation.invoices')}
      </button>
      
      <div className="bg-white shadow-lg rounded-lg p-8 border border-gray-100">
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-md flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('forms.createInvoice.title')}</h2>
        </div>
        
        {error && (
          <div className="${PROFESSIONAL_FORM_CLASSES.alertError}">
            <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Recipients Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createInvoice.invoiceRecipients')}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isContractBased && (
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t('forms.createInvoice.contract')} (Optional)
                </label>
                <select
                  name="contract_id"
                  value={formData.contract_id}
                  onChange={handleChange}
                  className={getProfessionalSelectClasses()}
                >
                  <option value="">{t('forms.createInvoice.selectContract')}</option>
                  {contracts.map(contract => (
                    <option key={contract.id} value={contract.id}>
                      {contract.title} ({contract.contract_type})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
{t('forms.createInvoice.tenant')} *
              </label>
              <select
                name="tenant_id"
                value={formData.tenant_id}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
                required
              >
                <option value="">{t('forms.createInvoice.selectTenant')}</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.first_name} {tenant.last_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
{t('forms.createInvoice.property')} *
              </label>
              <select
                name="property_id"
                value={formData.property_id}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
                required
                disabled={loadingProperties}
              >
                <option value="">
                  {loadingProperties ? t('forms.createInvoice.loadingProperties') : t('forms.createInvoice.selectProperty')}
                </option>
                {allProperties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Details Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createInvoice.invoiceDetails')}</h3>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
{t('forms.createInvoice.amount')} (€) *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className={getProfessionalInputClasses()}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
{t('forms.createInvoice.description')} *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={getProfessionalInputClasses()}
              rows="3"
              placeholder={t('forms.createInvoice.descriptionPlaceholder')}
              required
            />
          </div>

          {/* Invoice Dates Section */}
          <div className="mt-8 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('forms.createInvoice.invoiceDates')}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
{t('forms.createInvoice.invoiceDate')} *
              </label>
              <input
                type="date"
                name="invoice_date"
                value={formData.invoice_date}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
{t('forms.createInvoice.dueDate')} *
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
                required
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('common.status')} *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={getProfessionalInputClasses()}
              required
            >
              <option value="pending">{t('invoices.pending')}</option>
              <option value="paid">{t('invoices.paid')}</option>
              <option value="overdue">{t('invoices.overdue')}</option>
              <option value="draft">Entwurf</option>
            </select>
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
              className="px-8 py-3 bg-blue-600 text-white rounded-md hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('forms.createInvoice.creating')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('forms.createButton')} {t('invoices.title').slice(0, -1)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInvoiceForm;