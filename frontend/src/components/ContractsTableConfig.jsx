export const CONTRACTS_TABLE_COLUMNS = [
  {
    key: 'id',
    label: 'Contract ID',
    width: '120px',
    sortable: true,
    render: (value) => (
      <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
        {value}
      </code>
    )
  },
  {
    key: 'title',
    label: 'Contract Title',
    width: '250px',
    sortable: true,
    searchable: true,
    critical: true,
    render: (value, row) => (
      <div>
        <div className="text-sm font-medium text-gray-900">
          {value || 'Untitled Contract'}
        </div>
        {row.description && (
          <div className="text-xs text-gray-500 truncate max-w-xs">
            {row.description}
          </div>
        )}
      </div>
    )
  },
  {
    key: 'contract_type',
    label: 'Type',
    width: '120px',
    sortable: true,
    basicFilter: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'All Types' },
      { value: 'rental', label: 'Rental' },
      { value: 'service', label: 'Service' },
      { value: 'vendor', label: 'Vendor' },
      { value: 'employment', label: 'Employment' },
      { value: 'financial', label: 'Financial' }
    ],
    render: (value) => {
      const typeEmojis = {
        rental: '🏠',
        service: '🔧',
        vendor: '🤝',
        employment: '👥',
        financial: '💰'
      };
      
      const colors = {
        rental: 'bg-blue-100 text-blue-800',
        service: 'bg-green-100 text-green-800',
        vendor: 'bg-purple-100 text-purple-800',
        employment: 'bg-orange-100 text-orange-800',
        financial: 'bg-indigo-100 text-indigo-800'
      };
      
      return (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
          <span className="mr-1">{typeEmojis[value] || '📋'}</span>
          {value?.charAt(0).toUpperCase() + value?.slice(1) || 'Unknown'}
        </span>
      );
    }
  },
  {
    key: 'status',
    label: 'Status',
    width: '100px',
    sortable: true,
    basicFilter: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'All Statuses' },
      { value: 'draft', label: 'Draft' },
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'expired', label: 'Expired' },
      { value: 'terminated', label: 'Terminated' }
    ],
    render: (value) => {
      const statusEmojis = {
        draft: '✏️',
        active: '✅',
        pending: '⏳',
        expired: '⏰',
        terminated: '❌'
      };
      
      const colors = {
        draft: 'bg-gray-100 text-gray-800',
        active: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        expired: 'bg-red-100 text-red-800',
        terminated: 'bg-purple-100 text-purple-800'
      };
      
      return (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
          <span className="mr-1">{statusEmojis[value] || '📄'}</span>
          {value?.charAt(0).toUpperCase() + value?.slice(1) || 'Unknown'}
        </span>
      );
    }
  },
  {
    key: 'parties',
    label: 'Parties',
    width: '180px',
    render: (value, row) => {
      if (!value || !Array.isArray(value) || value.length === 0) {
        return <span className="text-xs text-gray-500">No parties</span>;
      }
      
      const displayParties = value.slice(0, 2).map(party => party.name || 'Unnamed').join(', ');
      const additionalCount = value.length > 2 ? value.length - 2 : 0;
      
      return (
        <div className="text-xs text-gray-900">
          {displayParties}
          {additionalCount > 0 && (
            <span className="text-blue-600 font-medium">
              {' '}+{additionalCount} more
            </span>
          )}
        </div>
      );
    }
  },
  {
    key: 'start_date',
    label: 'Start Date',
    width: '100px',
    sortable: true,
    render: (value) => (
      <span className="text-xs text-gray-600">
        {value ? new Date(value).toLocaleDateString('de-DE') : 'N/A'}
      </span>
    )
  },
  {
    key: 'end_date',
    label: 'End Date',
    width: '100px',
    sortable: true,
    render: (value) => {
      const isExpired = value && new Date(value) < new Date();
      return (
        <span className={`text-xs ${isExpired ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
          {value ? new Date(value).toLocaleDateString('de-DE') : 'N/A'}
        </span>
      );
    }
  },
  {
    key: 'value',
    label: 'Value',
    width: '120px',
    sortable: true,
    align: 'right',
    render: (value) => {
      if (!value) return <span className="text-xs text-gray-500">N/A</span>;
      
      const formatted = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(value);
      
      return (
        <span className="text-sm font-semibold text-gray-900">
          {formatted}
        </span>
      );
    }
  }
];

export const CONTRACTS_BASIC_FILTERS = [
  {
    key: 'contract_type',
    label: 'Contract Type',
    type: 'select',
    options: [
      { value: '', label: 'All Types' },
      { value: 'rental', label: 'Rental' },
      { value: 'service', label: 'Service' },
      { value: 'vendor', label: 'Vendor' },
      { value: 'employment', label: 'Employment' },
      { value: 'financial', label: 'Financial' }
    ]
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All Statuses' },
      { value: 'draft', label: 'Draft' },
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'expired', label: 'Expired' },
      { value: 'terminated', label: 'Terminated' }
    ]
  }
];

export const CONTRACTS_ADVANCED_FILTERS = [
  {
    key: 'start_date_from',
    label: 'Start Date From',
    type: 'date'
  },
  {
    key: 'start_date_to', 
    label: 'Start Date To',
    type: 'date'
  },
  {
    key: 'end_date_from',
    label: 'End Date From',
    type: 'date'
  },
  {
    key: 'end_date_to',
    label: 'End Date To', 
    type: 'date'
  },
  {
    key: 'value_min',
    label: 'Min Value (€)',
    type: 'number',
    placeholder: '0'
  },
  {
    key: 'value_max',
    label: 'Max Value (€)',
    type: 'number',
    placeholder: '999999'
  }
];

// Default sort configuration
export const getDefaultSortConfig = () => ({
  key: 'title',
  direction: 'asc'
});

// Search functionality
export const filterContractsBySearch = (contracts, searchTerm) => {
  if (!searchTerm.trim()) return contracts;
  
  const term = searchTerm.toLowerCase();
  
  return contracts.filter(contract => {
    // Search in title
    if (contract.title?.toLowerCase().includes(term)) return true;
    
    // Search in description
    if (contract.description?.toLowerCase().includes(term)) return true;
    
    // Search in contract type
    if (contract.contract_type?.toLowerCase().includes(term)) return true;
    
    // Search in status
    if (contract.status?.toLowerCase().includes(term)) return true;
    
    // Search in parties
    if (contract.parties?.some(party => 
      party.name?.toLowerCase().includes(term)
    )) return true;
    
    return false;
  });
};

// Sort functionality
export const sortContracts = (contracts, sortConfig) => {
  if (!sortConfig.key) return contracts;
  
  return [...contracts].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    // Handle special cases
    if (sortConfig.key === 'parties') {
      aVal = a.parties?.length || 0;
      bVal = b.parties?.length || 0;
    } else if (sortConfig.key === 'start_date' || sortConfig.key === 'end_date') {
      aVal = aVal ? new Date(aVal) : new Date(0);
      bVal = bVal ? new Date(bVal) : new Date(0);
    } else if (sortConfig.key === 'value') {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else {
      // String comparison
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }
    
    if (aVal < bVal) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};