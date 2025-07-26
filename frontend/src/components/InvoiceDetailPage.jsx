import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cachedAxios from '../utils/cachedAxios';
import { useLanguage } from '../contexts/LanguageContext';
import { generatePDF } from '../utils/exportUtils';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InvoiceDetailPage = ({ 
  getStatusColor, 
  formatDate, 
  formatCurrency, 
  getPropertyName,
  getTenantName,
  handleNav 
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [invoice, setInvoice] = useState(null);
  const [property, setProperty] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        setLoading(true);
        const invoiceRes = await cachedAxios.get(`${API}/v1/invoices/${id}`);
        const invoiceData = invoiceRes.data;
        setInvoice(invoiceData);
        
        // Fetch related data only if IDs are not null
        const promises = [];
        let propertyIndex = -1;
        let tenantIndex = -1;
        let contractIndex = -1;
        
        // Add property fetch if property_id exists
        if (invoiceData.property_id && invoiceData.property_id !== 'null') {
          propertyIndex = promises.length;
          promises.push(cachedAxios.get(`${API}/v1/properties/${invoiceData.property_id}`));
        }
        
        // Add tenant fetch if tenant_id exists
        if (invoiceData.tenant_id && invoiceData.tenant_id !== 'null') {
          tenantIndex = promises.length;
          promises.push(cachedAxios.get(`${API}/v2/accounts/${invoiceData.tenant_id}`));
        }
        
        // Add contract fetch if contract_id exists
        if (invoiceData.contract_id && invoiceData.contract_id !== 'null' && invoiceData.contract_id !== null) {
          contractIndex = promises.length;
          promises.push(cachedAxios.get(`${API}/v1/contracts/${invoiceData.contract_id}`));
        }
        
        if (promises.length > 0) {
          const responses = await Promise.all(promises);
          
          // Set property data if fetched
          if (propertyIndex >= 0) {
            setProperty(responses[propertyIndex].data);
          }
          
          // Set tenant data if fetched
          if (tenantIndex >= 0) {
            setTenant(responses[tenantIndex].data);
          }
          
          // Set contract data if fetched
          if (contractIndex >= 0) {
            setContract(responses[contractIndex].data);
          }
        }
      } catch (error) {
        console.error('Error fetching invoice details:', error);
        setError('Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoiceDetails();
    }
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setStatusUpdating(true);
      await cachedAxios.put(`${API}/v1/invoices/${id}`, {
        ...invoice,
        status: newStatus
      });
      setInvoice(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error('Error updating invoice status:', error);
      setError('Failed to update invoice status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;
    
    // Use centralized PDF generation
    generatePDF(invoice, 'invoice', {
      property,
      tenant,
      contract: contract || null
    });
  };

  const handleSendReminder = () => {
    // Simulate sending reminder (in a real app, this would call an API)
    alert(`Reminder sent for invoice ${invoice.invoice_number} to ${tenant ? tenant.email : 'tenant'}`);
    console.log('Reminder sent for invoice:', invoice.invoice_number);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'overdue':
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const isOverdue = invoice && new Date(invoice.due_date) < new Date() && invoice.status !== 'paid';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Invoice not found'}</p>
          <button 
            onClick={() => navigate('/invoices')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/invoices')}
            className="mb-4 text-blue-500 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Invoices
          </button>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(invoice.status)}
              <h1 className="text-3xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(invoice.status)}`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
            {isOverdue && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                {t('invoices.overdue')}
              </span>
            )}
          </div>
          <p className="text-lg text-gray-600 mt-2">Invoice Details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Invoice Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoice Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(invoice.amount)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                      <div className="flex gap-2">
                        {invoice.status !== 'paid' && (
                          <button
                            onClick={() => handleStatusUpdate('paid')}
                            disabled={statusUpdating}
                            className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 disabled:opacity-50"
                          >
                            {statusUpdating ? 'Updating...' : 'Mark Paid'}
                          </button>
                        )}
                        {invoice.status !== 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate('pending')}
                            disabled={statusUpdating}
                            className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 disabled:opacity-50"
                          >
                            {statusUpdating ? 'Updating...' : 'Mark Pending'}
                          </button>
                        )}
                        {invoice.status !== 'overdue' && (
                          <button
                            onClick={() => handleStatusUpdate('overdue')}
                            disabled={statusUpdating}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 disabled:opacity-50"
                          >
                            {statusUpdating ? 'Updating...' : 'Mark Overdue'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                    <p className="text-gray-900">{formatDate(invoice.invoice_date)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <p className={`${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                      {formatDate(invoice.due_date)}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
                    <p className="text-gray-900">{formatDate(invoice.created_at)}</p>
                  </div>
                  
                  {invoice.updated_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                      <p className="text-gray-900">{formatDate(invoice.updated_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {invoice.description && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-900 whitespace-pre-wrap">{invoice.description}</p>
              </div>
            )}
          </div>

          {/* Related Information */}
          <div className="space-y-6">
            {/* Property Information */}
            {property && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900 font-medium">{property.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="text-gray-900">
                      {property.street} {property.house_nr}<br/>
                      {property.postcode} {property.city}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="text-gray-900">{property.property_type}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/properties/${property.id}`)}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    View Property Details →
                  </button>
                </div>
              </div>
            )}

            {/* Tenant Information */}
            {tenant && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900 font-medium">{tenant.first_name} {tenant.last_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">
                      <a href={`mailto:${tenant.email}`} className="text-blue-600 hover:text-blue-800">
                        {tenant.email}
                      </a>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">
                      <a href={`tel:${tenant.phone}`} className="text-blue-600 hover:text-blue-800">
                        {tenant.phone}
                      </a>
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    View Tenant Details →
                  </button>
                </div>
              </div>
            )}

            {/* NEW: Contract Information */}
            {contract && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 shadow rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">📄 Contract-Based Invoice</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contract Title</label>
                    <p className="text-gray-900 font-medium">{contract.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contract ID</label>
                    <p className="text-gray-600 font-mono text-sm">{contract.id}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {contract.contract_type}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        contract.status === 'active' ? 'bg-green-100 text-green-800' : 
                        contract.status === 'expired' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {contract.status}
                      </span>
                    </div>
                  </div>
                  {invoice.invoice_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Invoice Type</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.invoice_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {invoice.invoice_type === 'credit' ? '⬆️ Credit (Provider Receives)' : '⬇️ Debit (Customer Pays)'}
                      </span>
                    </div>
                  )}
                  {contract.billing_frequency && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Billing Frequency</label>
                      <p className="text-gray-900 capitalize">{contract.billing_frequency}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200">
                    <button
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                      className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                    >
                      View Contract Details →
                    </button>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-blue-800 font-medium">
                      Legal Audit Trail
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    This invoice was automatically generated from the contract above, ensuring legal compliance and complete audit trail.
                  </p>
                </div>
              </div>
            )}

            {/* Legacy Invoice Notice */}
            {!contract && (
              <div className="bg-yellow-50 border border-yellow-200 shadow rounded-lg p-6">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">⚠️ Legacy Invoice</h3>
                </div>
                <p className="text-sm text-yellow-800">
                  This invoice was created manually without a contract relationship. For better legal compliance and audit trails, consider creating invoices from contracts.
                </p>
              </div>
            )}

            {/* Payment Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {invoice.status !== 'paid' && (
                  <button 
                    onClick={() => handleStatusUpdate('paid')}
                    disabled={statusUpdating}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {statusUpdating ? 'Updating...' : 'Mark as Paid'}
                  </button>
                )}
                <button 
                  onClick={() => handleDownloadPDF()}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Download PDF
                </button>
                <button 
                  onClick={() => handleSendReminder()}
                  className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Send Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;