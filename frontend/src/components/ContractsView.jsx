import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import cachedAxios from '../utils/cachedAxios';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const ContractsView = () => {
  const { t } = useLanguage();
  const { showError } = useToast();
  const navigate = useNavigate();
  
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    contract_type: '',
    status: '',
    search: ''
  });
  
  const [contractTypes, setContractTypes] = useState([]);
  const [contractStatuses, setContractStatuses] = useState([]);

  useEffect(() => {
    fetchContracts();
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [filters]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.contract_type) params.append('contract_type', filters.contract_type);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const response = await cachedAxios.get(`${API}/api/v1/contracts/?${params.toString()}`);
      setContracts(response.data);
    } catch (error) {
      showError(error, 'Failed to fetch contracts');
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [typesResponse, statusesResponse] = await Promise.all([
        cachedAxios.get(`${API}/api/v1/contracts/types/list`),
        cachedAxios.get(`${API}/api/v1/contracts/statuses/list`)
      ]);
      setContractTypes(typesResponse.data);
      setContractStatuses(statusesResponse.data);
    } catch (error) {
      console.error('Error fetching contract metadata:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
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

  const handleCreateContract = () => {
    navigate('/create-contract');
  };

  const handleViewContract = (contractId) => {
    navigate(`/contracts/${contractId}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      {/* Modern Header with Glassmorphism */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  📋 {t('contracts.title')}
                </h1>
                <p className="text-gray-600 mt-1">Manage your contracts with modern efficiency</p>
              </div>
            </div>
            <button
              onClick={handleCreateContract}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>✨ {t('contracts.createContract')}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters with Glassmorphism */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-lg opacity-10"></div>
        <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-xl">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">🔍 Smart Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">📋</span>
                {t('contracts.contractType')}
              </label>
              <div className="relative">
                <select
                  value={filters.contract_type}
                  onChange={(e) => handleFilterChange('contract_type', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                >
                  <option value="">{t('contracts.allTypes')}</option>
                  {contractTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">⚡</span>
                {t('common.status')}
              </label>
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                >
                  <option value="">{t('contracts.allStatuses')}</option>
                  {contractStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">🔍</span>
                {t('common.search')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder={t('contracts.searchPlaceholder')}
                  className="w-full px-4 py-3 pl-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Contracts Grid */}
      {contracts.length === 0 ? (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 rounded-3xl blur-lg opacity-10"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-16 border border-white/30 shadow-xl text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              📝 {t('contracts.noContractsFound')}
            </h3>
            <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
              {t('contracts.noContractsDescription')}
            </p>
            <button
              onClick={handleCreateContract}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>✨ {t('contracts.createFirstContract')}</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {contracts.map((contract, index) => {
            const getContractTypeEmoji = (type) => {
              switch (type) {
                case 'rental': return '🏠';
                case 'service': return '🔧';
                case 'vendor': return '🤝';
                case 'employment': return '👥';
                case 'financial': return '💰';
                default: return '📋';
              }
            };

            const getStatusEmoji = (status) => {
              switch (status) {
                case 'draft': return '✏️';
                case 'active': return '✅';
                case 'pending': return '⏳';
                case 'expired': return '⏰';
                case 'terminated': return '❌';
                default: return '📄';
              }
            };

            return (
              <div
                key={contract.id}
                onClick={() => handleViewContract(contract.id)}
                className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl hover:shadow-2xl transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-500/5 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Floating Elements */}
                <div className="absolute top-4 right-4 w-6 h-6 bg-blue-400/20 rounded-full blur-sm group-hover:animate-pulse"></div>
                <div className="absolute bottom-6 left-6 w-4 h-4 bg-purple-500/20 rounded-full blur-sm group-hover:animate-bounce"></div>

                {/* Contract Header */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl">{getContractTypeEmoji(contract.contract_type)}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-300 truncate">
                          {contract.title}
                        </h3>
                        {contract.description && (
                          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                            {contract.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contract Details Grid */}
                  <div className="space-y-4">
                    {/* Type and Status Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getTypeColor(contract.contract_type)} shadow-sm`}>
                          {getContractTypeEmoji(contract.contract_type)} {contractTypes.find(t => t.value === contract.contract_type)?.label || contract.contract_type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(contract.status)} shadow-sm`}>
                          {getStatusEmoji(contract.status)} {contractStatuses.find(s => s.value === contract.status)?.label || contract.status}
                        </span>
                      </div>
                    </div>

                    {/* Parties */}
                    {contract.parties && contract.parties.length > 0 && (
                      <div className="bg-gray-50/50 rounded-xl p-4">
                        <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                          <span className="mr-2">👥</span>
                          {t('contracts.parties')}
                        </div>
                        <div className="text-sm text-gray-600">
                          {contract.parties.slice(0, 2).map(party => party.name).join(', ')}
                          {contract.parties.length > 2 && (
                            <span className="text-blue-600 font-medium">
                              {' '}+{contract.parties.length - 2} {t('contracts.more')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dates and Value */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50/50 rounded-xl p-4">
                        <div className="text-xs font-semibold text-blue-700 mb-1 flex items-center">
                          <span className="mr-1">📅</span>
                          {t('contracts.startDate')}
                        </div>
                        <div className="text-sm font-medium text-gray-800">{formatDate(contract.start_date)}</div>
                      </div>
                      <div className="bg-purple-50/50 rounded-xl p-4">
                        <div className="text-xs font-semibold text-purple-700 mb-1 flex items-center">
                          <span className="mr-1">🏁</span>
                          {t('contracts.endDate')}
                        </div>
                        <div className="text-sm font-medium text-gray-800">{formatDate(contract.end_date)}</div>
                      </div>
                    </div>

                    {/* Contract Value */}
                    {contract.value && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                        <div className="text-xs font-semibold text-green-700 mb-1 flex items-center">
                          <span className="mr-1">💰</span>
                          {t('contracts.value')}
                        </div>
                        <div className="text-lg font-bold text-green-800">{formatCurrency(contract.value)}</div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-4 border-t border-gray-200/50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewContract(contract.id);
                        }}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>👁️ {t('common.view')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContractsView;