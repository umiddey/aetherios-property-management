import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cachedAxios from '../utils/cachedAxios';
import { useLanguage } from '../contexts/LanguageContext';

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
        
        // Fetch related property and tenant data
        const [propertyRes, tenantRes] = await Promise.all([
          cachedAxios.get(`${API}/v1/properties/${invoiceData.property_id}`),
          cachedAxios.get(`${API}/v1/tenants/${invoiceData.tenant_id}`)
        ]);
        
        setProperty(propertyRes.data);
        setTenant(tenantRes.data);
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

            {/* Payment Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {invoice.status !== 'paid' && (
                  <button className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">
                    Mark as Paid
                  </button>
                )}
                <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
                  Download PDF
                </button>
                <button className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">
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