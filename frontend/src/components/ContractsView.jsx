import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import cachedAxios from '../utils/cachedAxios';
import { useNavigate } from 'react-router-dom';
import EnterpriseDataTable from './ui/EnterpriseDataTable';
import EnterpriseSearchBar from './ui/EnterpriseSearchBar';
import BulkActionsToolbar from './ui/BulkActionsToolbar';
import { 
  CONTRACTS_TABLE_COLUMNS, 
  CONTRACTS_BASIC_FILTERS,
  CONTRACTS_ADVANCED_FILTERS,
  getDefaultSortConfig, 
  filterContractsBySearch, 
  sortContracts 
} from './ContractsTableConfig.jsx';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState(getDefaultSortConfig());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [tableDensity, setTableDensity] = useState('compact');
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [exportProgress, setExportProgress] = useState({ progress: 0, message: '', isExporting: false });

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
      showError(error, t('contracts.messages.fetchError'));
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

  // Process contracts: filter by search, then sort
  const processedContracts = useMemo(() => {
    let filtered = filterContractsBySearch(contracts, searchTerm);
    return sortContracts(filtered, sortConfig);
  }, [contracts, searchTerm, sortConfig]);

  const handleSort = (newSortConfig) => {
    setSortConfig(newSortConfig);
  };

  const handleRowClick = (contract) => {
    navigate(`/contracts/${contract.id}`);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleToggleFilters = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
  };

  const handleDensityChange = (newDensity) => {
    setTableDensity(newDensity);
  };

  const handleSelectionChange = (selectedIds) => {
    setSelectedContracts(selectedIds);
  };

  // Bulk action handlers
  const handleBulkExport = async (selectedItems, format) => {
    const itemsToExport = processedContracts.filter(c => selectedItems.includes(c.id));
    
    if (itemsToExport.length === 0) {
      alert('No items to export');
      return;
    }

    // Simple CSV export for now
    const csvContent = [
      ['ID', 'Title', 'Type', 'Status', 'Start Date', 'End Date', 'Value'].join(','),
      ...itemsToExport.map(contract => [
        contract.id,
        `"${contract.title || ''}"`,
        contract.contract_type || '',
        contract.status || '',
        contract.start_date ? new Date(contract.start_date).toLocaleDateString('de-DE') : '',
        contract.end_date ? new Date(contract.end_date).toLocaleDateString('de-DE') : '',
        contract.value || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async (selectedItems) => {
    if (!confirm(`Are you sure you want to delete ${selectedItems.length} contracts?`)) {
      return;
    }
    
    // TODO: Implement bulk delete API call
    console.log('Bulk delete not implemented yet:', selectedItems);
  };

  const bulkActions = [
    {
      id: 'export-csv',
      label: 'Export CSV',
      icon: '📊',
      action: (selectedItems) => handleBulkExport(selectedItems, 'csv')
    },
    {
      id: 'export-excel', 
      label: 'Export Excel',
      icon: '📈',
      action: (selectedItems) => handleBulkExport(selectedItems, 'xlsx')
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      action: handleBulkDelete,
      variant: 'danger'
    }
  ];

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
    <div className="space-y-6">
      {/* Professional Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{t('contracts.title')}</h1>
              <p className="text-sm text-gray-600 mt-1">{t('accounts.manageContractsEfficiency')}</p>
            </div>
          </div>
          <button
            onClick={handleCreateContract}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{t('contracts.createContract')}</span>
          </button>
        </div>
      </div>

      {/* Enterprise Search and Bulk Actions */}
      <div>
        <EnterpriseSearchBar
          searchTerm={searchTerm}
          onSearch={handleSearch}
          placeholder={t('contracts.searchPlaceholder')}
          showAdvancedFilters={showAdvancedFilters}
          onToggleFilters={handleToggleFilters}
          basicFilters={CONTRACTS_BASIC_FILTERS}
          advancedFilters={CONTRACTS_ADVANCED_FILTERS}
          onFilterChange={handleFilterChange}
          filters={filters}
        />
        
        {selectedContracts.length > 0 && (
          <BulkActionsToolbar
            selectedItems={selectedContracts}
            totalItems={processedContracts.length}
            onClearSelection={() => setSelectedContracts([])}
            actions={bulkActions}
            exportProgress={exportProgress}
          />
        )}
      </div>

      {/* Enterprise Data Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">{t('common.loading')}</span>
          </div>
        </div>
      ) : processedContracts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('contracts.noContractsFound')}</h3>
          <p className="text-gray-600 mb-6">{t('contracts.noContractsDescription')}</p>
          <button
            onClick={handleCreateContract}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('contracts.createFirstContract')}
          </button>
        </div>
      ) : (
        <EnterpriseDataTable
          columns={CONTRACTS_TABLE_COLUMNS}
          data={processedContracts}
          onSort={handleSort}
          sortConfig={sortConfig}
          onRowClick={handleRowClick}
          density={tableDensity}
          onDensityChange={handleDensityChange}
          selectable={true}
          selectedItems={selectedContracts}
          onSelectionChange={handleSelectionChange}
          itemsPerPage={20}
        />
      )}
    </div>
  );
};

export default ContractsView;