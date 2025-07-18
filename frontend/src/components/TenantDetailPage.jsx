import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cachedAxios from '../utils/cachedAxios';
import { useLanguage } from '../contexts/LanguageContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TenantDetailPage = ({ 
  getStatusColor, 
  getPropertyTypeColor, 
  formatDate, 
  formatCurrency, 
  getPropertyName,
  handleNav 
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [tenant, setTenant] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState(null);

  useEffect(() => {
    const fetchTenantDetails = async () => {
      try {
        setLoading(true);
        const [tenantRes, agreementsRes, contractsRes, invoicesRes] = await Promise.all([
          cachedAxios.get(`${API}/v1/tenants/${id}`),
          cachedAxios.get(`${API}/v1/rental-agreements?tenant_id=${id}`),
          cachedAxios.get(`${API}/v1/contracts?contract_type=rental&related_tenant_id=${id}`),
          cachedAxios.get(`${API}/v1/invoices?tenant_id=${id}`)
        ]);
        
        setTenant(tenantRes.data);
        setAgreements(agreementsRes.data);
        setContracts(contractsRes.data);
        setInvoices(invoicesRes.data);
      } catch (error) {
        console.error('Error fetching tenant details:', error);
        setError('Failed to load tenant details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTenantDetails();
    }
  }, [id]);

  const handleClickAgreement = (agreementId) => {
    const agreement = agreements.find(ag => ag.id === agreementId);
    setSelectedAgreement(agreement);
  };

  const handleClickInvoice = (invoiceId) => {
    navigate(`/invoices/${invoiceId}`);
  };

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

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Tenant not found'}</p>
          <button 
            onClick={() => navigate('/tenants')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Back to Tenants
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
            onClick={() => navigate('/tenants')}
            className="mb-4 text-blue-500 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Tenants
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{tenant.first_name} {tenant.last_name}</h1>
          <p className="text-lg text-gray-600">Tenant Details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tenant Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Name:</span>
                <span className="text-gray-900">{tenant.first_name} {tenant.last_name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Email:</span>
                <a href={`mailto:${tenant.email}`} className="text-blue-600 hover:text-blue-800">
                  {tenant.email}
                </a>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Phone:</span>
                <a href={`tel:${tenant.phone}`} className="text-blue-600 hover:text-blue-800">
                  {tenant.phone}
                </a>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Address:</span>
                <span className="text-gray-900 text-right">{tenant.address}</span>
              </div>
              
              {tenant.date_of_birth && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Date of Birth:</span>
                  <span className="text-gray-900">{formatDate(tenant.date_of_birth)}</span>
                </div>
              )}
              
              {tenant.gender && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Gender:</span>
                  <span className="text-gray-900">{tenant.gender}</span>
                </div>
              )}
              
              {tenant.bank_account && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Bank Account:</span>
                  <span className="text-gray-900">{tenant.bank_account}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Created:</span>
                <span className="text-gray-900">{formatDate(tenant.created_at)}</span>
              </div>
              
              {tenant.notes && (
                <div>
                  <span className="font-medium text-gray-700 block mb-2">Notes:</span>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{tenant.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Statistics</h2>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Active Contracts</p>
                    <p className="text-2xl font-bold text-blue-900">{contracts.length}</p>
                  </div>
                  <div className="text-blue-400">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Invoices</p>
                    <p className="text-2xl font-bold text-green-900">{invoices.length}</p>
                  </div>
                  <div className="text-green-400">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Monthly Rent</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {contracts.length > 0 ? formatCurrency(contracts.reduce((total, contract) => total + (contract.type_specific_data?.monthly_rent || 0), 0)) : formatCurrency(0)}
                    </p>
                  </div>
                  <div className="text-purple-400">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rental Contracts */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Rental Contracts</h2>
          
          {contracts.length > 0 ? (
            <div className="space-y-4">
              {contracts.map(contract => (
                <div key={contract.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/contracts/${contract.id}`)}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{contract.title}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(contract.start_date)} - {contract.end_date ? formatDate(contract.end_date) : 'Ongoing'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Status: <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
                          {contract.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">{formatCurrency(contract.type_specific_data?.monthly_rent || 0)}/month</p>
                      <p className="text-sm text-gray-500">Deposit: {formatCurrency(contract.type_specific_data?.security_deposit || 0)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Click to view contract details
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No rental contracts found for this tenant</p>
          )}
        </div>

        {/* Legacy Rental Agreements */}
        {agreements.length > 0 && (
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Legacy Rental Agreements</h2>
            
            <div className="space-y-4">
              {agreements.map(agreement => (
                <div key={agreement.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{getPropertyName(agreement.property_id)}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(agreement.start_date)} - {agreement.end_date ? formatDate(agreement.end_date) : 'Ongoing'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">{formatCurrency(agreement.monthly_rent)}/month</p>
                      <p className="text-sm text-gray-500">Deposit: {formatCurrency(agreement.deposit)}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleClickAgreement(agreement.id)}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    {selectedAgreement?.id === agreement.id ? 'Hide Details' : 'View Details'}
                  </button>
                  
                  {selectedAgreement?.id === agreement.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-md">
                      <h5 className="font-semibold mb-2">Agreement Details</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p><strong>Property:</strong> {getPropertyName(selectedAgreement.property_id)}</p>
                          <p><strong>Start Date:</strong> {formatDate(selectedAgreement.start_date)}</p>
                          <p><strong>End Date:</strong> {selectedAgreement.end_date ? formatDate(selectedAgreement.end_date) : 'Indefinite'}</p>
                        </div>
                        <div>
                          <p><strong>Monthly Rent:</strong> {formatCurrency(selectedAgreement.monthly_rent)}</p>
                          <p><strong>Deposit:</strong> {formatCurrency(selectedAgreement.deposit)}</p>
                          <p><strong>Status:</strong> {selectedAgreement.end_date ? 'Ended' : 'Active'}</p>
                        </div>
                      </div>
                      {selectedAgreement.notes && (
                        <div className="mt-3">
                          <p><strong>Notes:</strong> {selectedAgreement.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoices</h2>
          
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map(invoice => (
                    <tr key={invoice.id} onClick={() => handleClickInvoice(invoice.id)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.invoice_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.due_date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No invoices found for this tenant</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default TenantDetailPage;