import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import cachedAxios from '../utils/cachedAxios';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const ContractDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showError } = useToast();
  
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProperty, setRelatedProperty] = useState(null);
  const [relatedTenant, setRelatedTenant] = useState(null);

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
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                {t('contracts.editContract')}
              </button>
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">
                {t('contracts.downloadContract')}
              </button>
              <button className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors">
                {t('contracts.terminateContract')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDetailPage;