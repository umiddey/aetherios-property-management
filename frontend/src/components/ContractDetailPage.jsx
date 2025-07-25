import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import cachedAxios, { invalidateCache } from '../utils/cachedAxios';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const ContractDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();
  
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProperty, setRelatedProperty] = useState(null);
  const [relatedTenant, setRelatedTenant] = useState(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await cachedAxios.get(`${API}/api/v1/contracts/${id}`);
      setContract(response.data);
      
      // Fetch related entities
      if (response.data.related_property_id) {
        const propertyResponse = await cachedAxios.get(`${API}/api/v1/properties/${response.data.related_property_id}`);
        setRelatedProperty(propertyResponse.data);
      }
      
      if (response.data.related_tenant_id) {
        const tenantResponse = await cachedAxios.get(`${API}/api/v1/tenants/${response.data.related_tenant_id}`);
        setRelatedTenant(tenantResponse.data);
      }
    } catch (error) {
      showError(error, 'Failed to fetch contract details');
      console.error('Error fetching contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'terminated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'rental': return 'bg-blue-100 text-blue-800';
      case 'service': return 'bg-green-100 text-green-800';
      case 'vendor': return 'bg-purple-100 text-purple-800';
      case 'employment': return 'bg-orange-100 text-orange-800';
      case 'financial': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTerminateContract = async () => {
    try {
      // Try passing as query parameter since the endpoint might expect it that way
      const response = await cachedAxios.put(`${API}/api/v1/contracts/${id}/status?new_status=terminated`, {});
      
      // Refresh contract data
      fetchContract();
      
      // Show success message
      console.log('Contract terminated successfully');
      
    } catch (error) {
      showError(error, 'Failed to terminate contract');
      console.error('Error terminating contract:', error);
    }
  };

  const handleGenerateInvoice = async (overrideAmount = null, overrideDescription = null) => {
    try {
      setGeneratingInvoice(true);
      
      const queryParams = new URLSearchParams();
      if (overrideAmount) queryParams.append('override_amount', overrideAmount);
      if (overrideDescription) queryParams.append('override_description', overrideDescription);
      
      const response = await cachedAxios.post(
        `${API}/api/v1/contracts/${id}/generate-invoice?${queryParams.toString()}`
      );
      
      // Invalidate caches
      invalidateCache('/api/v1/invoices');
      invalidateCache('/api/v1/dashboard/stats');
      
      showSuccess(`Invoice generated successfully! Invoice ID: ${response.data.invoice_id.slice(0, 8)}`);
      
      // Navigate to invoices page to see the new invoice
      navigate('/invoices');
    } catch (error) {
      showError(error, 'Failed to generate invoice from contract');
      console.error('Error generating invoice:', error);
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleSetupBilling = async (billingType, billingFrequency = 'monthly') => {
    try {
      const response = await cachedAxios.post(
        `${API}/api/v1/contracts/${id}/setup-billing?billing_type=${billingType}&billing_frequency=${billingFrequency}`
      );
      
      // Refresh contract data to show updated billing settings
      fetchContract();
      
      showSuccess(`Contract billing configured successfully! Next billing: ${new Date(response.data.next_billing_date).toLocaleDateString()}`);
    } catch (error) {
      showError(error, 'Failed to setup contract billing');
      console.error('Error setting up billing:', error);
    }
  };

  const handleDownloadContract = () => {
    if (!contract) return;
    
    // Generate contract text content
    const contractText = `
CONTRACT DETAILS
================

Contract ID: ${contract.id}
Title: ${contract.title}
Type: ${getContractTypeLabel(contract.contract_type)}
Status: ${getStatusLabel(contract.status)}

Basic Information:
- Start Date: ${formatDate(contract.start_date)}
- End Date: ${formatDate(contract.end_date)}
- Value: ${formatCurrency(contract.value)}
- Currency: ${contract.currency}

${contract.description ? `Description:\n${contract.description}\n` : ''}

Parties:
${contract.parties?.map(party => 
  `- ${party.name} (${party.role})${party.contact_email ? ` - ${party.contact_email}` : ''}${party.contact_phone ? ` - ${party.contact_phone}` : ''}`
).join('\n') || 'No parties listed'}

${contract.terms ? `Terms:\n${contract.terms}\n` : ''}

Related Entities:
${relatedProperty ? `- Property: ${relatedProperty.name} (${relatedProperty.address})` : ''}
${relatedTenant ? `- Tenant: ${relatedTenant.first_name} ${relatedTenant.last_name} (${relatedTenant.email})` : ''}

Generated on: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}
    `.trim();

    // Create and download file
    const blob = new Blob([contractText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract_${contract.id.slice(0, 8)}_${contract.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getContractTypeLabel = (type) => {
    const typeMap = {
      rental: t('contracts.types.rental'),
      service: t('contracts.types.service'),
      vendor: t('contracts.types.vendor'),
      employment: t('contracts.types.employment'),
      financial: t('contracts.types.financial')
    };
    return typeMap[type] || type;
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      draft: t('contracts.statuses.draft'),
      active: t('contracts.statuses.active'),
      pending: t('contracts.statuses.pending'),
      expired: t('contracts.statuses.expired'),
      terminated: t('contracts.statuses.terminated')
    };
    return statusMap[status] || status;
  };

  const renderTypeSpecificData = () => {
    if (!contract?.type_specific_data) return null;

    const data = contract.type_specific_data;

    switch (contract.contract_type) {
      case 'rental':
        return (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">{t('contracts.rental.details')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.monthly_rent && (
                <div>
                  <span className="text-sm font-medium text-blue-800">{t('contracts.rental.monthlyRent')}</span>
                  <p className="text-blue-900">{formatCurrency(data.monthly_rent)}</p>
                </div>
              )}
              {data.security_deposit && (
                <div>
                  <span className="text-sm font-medium text-blue-800">{t('contracts.rental.securityDeposit')}</span>
                  <p className="text-blue-900">{formatCurrency(data.security_deposit)}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-blue-800">{t('contracts.rental.utilitiesIncluded')}</span>
                <p className="text-blue-900">{data.utilities_included ? t('common.yes') : t('common.no')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-blue-800">{t('contracts.rental.petAllowed')}</span>
                <p className="text-blue-900">{data.pet_allowed ? t('common.yes') : t('common.no')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-blue-800">{t('contracts.rental.furnished')}</span>
                <p className="text-blue-900">{data.furnished ? t('common.yes') : t('common.no')}</p>
              </div>
            </div>
          </div>
        );
      case 'service':
        return (
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-3">{t('contracts.service.details')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.service_type && (
                <div>
                  <span className="text-sm font-medium text-green-800">{t('contracts.service.serviceType')}</span>
                  <p className="text-green-900">{t(`contracts.service.types.${data.service_type}`)}</p>
                </div>
              )}
              {data.frequency && (
                <div>
                  <span className="text-sm font-medium text-green-800">{t('contracts.service.frequency')}</span>
                  <p className="text-green-900">{t(`contracts.service.frequencies.${data.frequency}`)}</p>
                </div>
              )}
              {data.scope_of_work && (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-green-800">{t('contracts.service.scopeOfWork')}</span>
                  <p className="text-green-900">{data.scope_of_work}</p>
                </div>
              )}
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

  if (!contract) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <p className="text-gray-500">{t('contracts.notFound')}</p>
          <button
            onClick={() => navigate('/contracts')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            {t('contracts.backToContracts')}
          </button>
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
              <span className="ml-4 text-gray-500">{contract.title}</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
            <div className="flex items-center space-x-3 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(contract.contract_type)}`}>
                {getContractTypeLabel(contract.contract_type)}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                {getStatusLabel(contract.status)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{t('contracts.contractId')}</p>
            <p className="font-mono text-sm text-gray-900">{contract.id}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contract Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.basicInformation')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">{t('contracts.startDate')}</span>
                <p className="text-gray-900">{formatDate(contract.start_date)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">{t('contracts.endDate')}</span>
                <p className="text-gray-900">{formatDate(contract.end_date)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">{t('contracts.value')}</span>
                <p className="text-gray-900">{formatCurrency(contract.value)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">{t('contracts.currency')}</span>
                <p className="text-gray-900">{contract.currency}</p>
              </div>
            </div>
            
            {contract.description && (
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-500">{t('contracts.description')}</span>
                <p className="text-gray-900 mt-1">{contract.description}</p>
              </div>
            )}
          </div>

          {/* Parties */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.parties')}</h3>
            <div className="space-y-4">
              {contract.parties?.map((party, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{party.name}</h4>
                      <p className="text-sm text-gray-500">{party.role}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {party.contact_email && <p>{party.contact_email}</p>}
                      {party.contact_phone && <p>{party.contact_phone}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Type-Specific Data */}
          {renderTypeSpecificData()}

          {/* Terms */}
          {contract.terms && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.terms')}</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-line">{contract.terms}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Billing Information */}
          {(contract.billing_type || contract.billing_frequency || contract.next_billing_date) && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">💰 Invoice Generation</h3>
              </div>
              <div className="space-y-3">
                {contract.billing_type && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Billing Type</span>
                    <p className="text-gray-900 capitalize">{contract.billing_type}</p>
                  </div>
                )}
                {contract.billing_frequency && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Frequency</span>
                    <p className="text-gray-900 capitalize">{contract.billing_frequency}</p>
                  </div>
                )}
                {contract.next_billing_date && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Next Billing</span>
                    <p className="text-gray-900">{formatDate(contract.next_billing_date)}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-blue-800 font-medium">
                    Automatic Invoice Generation Active
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  This contract will automatically generate invoices based on the settings above.
                </p>
              </div>
            </div>
          )}

          {/* Related Entities */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.relatedEntities')}</h3>
            <div className="space-y-4">
              {relatedProperty && (
                <div>
                  <span className="text-sm font-medium text-gray-500">{t('contracts.relatedProperty')}</span>
                  <p className="text-gray-900">{relatedProperty.name}</p>
                  <p className="text-sm text-gray-500">{relatedProperty.address}</p>
                </div>
              )}
              
              {relatedTenant && (
                <div>
                  <span className="text-sm font-medium text-gray-500">{t('contracts.relatedTenant')}</span>
                  <p className="text-gray-900">{relatedTenant.first_name} {relatedTenant.last_name}</p>
                  <p className="text-sm text-gray-500">{relatedTenant.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contracts.metadata')}</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">{t('contracts.createdAt')}</span>
                <p className="text-gray-900">{formatDate(contract.created_at)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">{t('contracts.updatedAt')}</span>
                <p className="text-gray-900">{formatDate(contract.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('common.actions')}</h3>
            <div className="space-y-3">
              {/* Contract Management */}
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                onClick={() => navigate(`/contracts/${id}/edit`)}
              >
                {t('contracts.editContract')}
              </button>

              {/* NEW: Contract-Based Invoice Generation */}
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">💰 Invoice Generation</p>
                
                <button 
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium transition-colors mb-2"
                  onClick={() => handleGenerateInvoice()}
                  disabled={generatingInvoice || contract.status !== 'active'}
                >
                  {generatingInvoice ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    '📄 Generate Invoice Now'
                  )}
                </button>

                {!contract.billing_type && contract.status === 'active' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => handleSetupBilling('credit', 'monthly')}
                    >
                      ⬆️ Credit Setup
                    </button>
                    <button 
                      className="bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => handleSetupBilling('debit', 'monthly')}
                    >
                      ⬇️ Debit Setup
                    </button>
                  </div>
                )}

                {contract.status !== 'active' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Invoice generation only available for active contracts
                  </p>
                )}
              </div>

              {/* Legacy Invoice Creation */}
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">📝 Legacy Options</p>
                <button 
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  onClick={() => navigate('/create-invoice', { 
                    state: { 
                      prefilledData: { 
                        contract_id: contract.id, 
                        contract_title: contract.title,
                        contract_type: contract.contract_type,
                        related_property_id: contract.related_property_id,
                        related_tenant_id: contract.related_tenant_id
                      } 
                    } 
                  })}
                >
                  📋 Manual Invoice Form
                </button>
              </div>

              {/* Utility Actions */}
              <div className="border-t pt-3">
                <button 
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors mb-2"
                  onClick={handleDownloadContract}
                >
                  {t('contracts.downloadContract')}
                </button>
                
                <button 
                  className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  onClick={() => {
                    if (window.confirm(t('contracts.confirmTerminate') || 'Are you sure you want to terminate this contract?')) {
                      handleTerminateContract();
                    }
                  }}
                >
                  {t('contracts.terminateContract')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDetailPage;