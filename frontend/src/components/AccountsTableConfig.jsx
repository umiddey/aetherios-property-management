export const ACCOUNTS_TABLE_COLUMNS = [
  {
    key: 'id',
    label: 'Account ID',
    width: '120px',
    sortable: true,
    critical: true,
    render: (value) => (
      <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
        {value}
      </code>
    )
  },
  {
    key: 'name',
    label: 'Name',
    width: '200px',
    sortable: true,
    searchable: true,
    critical: true,
    render: (value, row) => (
      <div>
        <div className="text-sm font-medium text-gray-900">
          {row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.name || 'Unnamed'}
        </div>
        {row.company_name && (
          <div className="text-xs text-gray-500">
            {row.company_name}
          </div>
        )}
      </div>
    )
  },
  {
    key: 'email',
    label: 'Contact',
    width: '220px',
    sortable: true,
    searchable: true,
    render: (value, row) => (
      <div>
        <div className="text-sm text-gray-900">{row.email}</div>
        {row.phone && (
          <div className="text-xs text-gray-500">{row.phone}</div>
        )}
      </div>
    )
  },
  {
    key: 'account_type',
    label: 'Type',
    width: '100px',
    sortable: true,
    basicFilter: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'All Types' },
      { value: 'tenant', label: 'Tenant' },
      { value: 'employee', label: 'Employee' },
      { value: 'contractor', label: 'Contractor' }
    ],
    render: (value) => {
      const typeEmojis = {
        tenant: '🏠',
        employee: '👔', 
        contractor: '🤝'
      };
      
      const colors = {
        tenant: 'bg-purple-100 text-purple-800',
        employee: 'bg-blue-100 text-blue-800',
        contractor: 'bg-green-100 text-green-800'
      };
      
      return (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
          <span className="mr-1">{typeEmojis[value] || '👤'}</span>
          {value?.charAt(0).toUpperCase() + value?.slice(1) || 'Unknown'}
        </span>
      );
    }
  },
  {
    key: 'license_status',
    label: 'License',
    width: '110px',
    sortable: true,
    render: (value, row, { contractorLicenses, canUserManageLicenses }) => {
      // Only show for contractors with proper permissions
      if (row.account_type !== 'contractor' || !canUserManageLicenses) {
        return <span className="text-xs text-gray-400">N/A</span>;
      }
      
      const licenseData = contractorLicenses?.[row.id];
      if (!licenseData) {
        return <span className="text-xs text-gray-500">Loading...</span>;
      }
      
      if (licenseData.error) {
        return <span className="text-xs text-gray-400">No data</span>;
      }
      
      if (licenseData.expired_licenses > 0) {
        return <span className="text-xs font-medium text-red-600">Expired</span>;
      } else if (licenseData.expiring_soon > 0) {
        return <span className="text-xs font-medium text-orange-600">Expiring</span>;
      } else if (licenseData.is_eligible_for_assignment) {
        return <span className="text-xs text-green-600">Valid</span>;
      } else {
        return <span className="text-xs text-red-600">Invalid</span>;
      }
    }
  },
  {
    key: 'license_details',
    label: 'License Info',
    width: '140px',
    render: (value, row, { contractorLicenses, canUserManageLicenses }) => {
      // Only show for contractors with proper permissions
      if (row.account_type !== 'contractor' || !canUserManageLicenses) {
        return null;
      }
      
      const licenseData = contractorLicenses?.[row.id];
      if (!licenseData || licenseData.error) {
        return null;
      }
      
      return (
        <div className="text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Valid:</span>
            <span className="text-green-600 font-medium">{licenseData.valid_licenses}</span>
          </div>
          {licenseData.expired_licenses > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Expired:</span>
              <span className="text-red-600 font-medium">{licenseData.expired_licenses}</span>
            </div>
          )}
          {licenseData.expiring_soon > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Expiring:</span>
              <span className="text-orange-600 font-medium">{licenseData.expiring_soon}</span>
            </div>
          )}
        </div>
      );
    }
  },
  {
    key: 'status',
    label: 'Status',
    width: '90px',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'archived', label: 'Archived' }
    ],
    render: (value, row) => {
      const isArchived = row.is_archived;
      const isActive = !isArchived && row.status !== 'inactive';
      
      if (isArchived) {
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
            Archived
          </span>
        );
      }
      
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
          isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      );
    }
  },
  {
    key: 'contact_completeness',
    label: 'Contact',
    width: '100px',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'All Contact Info' },
      { value: 'complete', label: 'Complete' },
      { value: 'missing_phone', label: 'Missing Phone' },
      { value: 'missing_email', label: 'Missing Email' },
      { value: 'incomplete', label: 'Incomplete' }
    ],
    render: (value, row) => {
      const hasEmail = row.email && row.email.trim() !== '';
      const hasPhone = row.phone && row.phone.trim() !== '';
      
      if (hasEmail && hasPhone) {
        return <span className="text-xs text-green-600 font-medium">Complete</span>;
      } else if (hasEmail && !hasPhone) {
        return <span className="text-xs text-orange-600 font-medium">No Phone</span>;
      } else if (!hasEmail && hasPhone) {
        return <span className="text-xs text-orange-600 font-medium">No Email</span>;
      } else {
        return <span className="text-xs text-red-600 font-medium">Incomplete</span>;
      }
    }
  },
  {
    key: 'created_at',
    label: 'Created',
    width: '100px',
    sortable: true,
    filterable: true,
    filterType: 'date_range',
    render: (value) => (
      <span className="text-xs text-gray-600">
        {value ? new Date(value).toLocaleDateString() : 'Unknown'}
      </span>
    )
  },
  {
    key: 'actions',
    label: 'Actions',
    width: '120px',
    render: (value, row, { handleNav, openLicenseModal, canUserManageLicenses }) => (
      <div className="flex space-x-1">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleNav(`accounts/${row.id}`);
          }}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50"
        >
          View
        </button>
        {row.account_type === 'contractor' && canUserManageLicenses && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openLicenseModal(row);
            }}
            className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 rounded hover:bg-green-50"
          >
            License
          </button>
        )}
      </div>
    )
  }
];

// COMPREHENSIVE ACCOUNT FILTERING - BUSINESS-FOCUSED
export const ACCOUNTS_BASIC_FILTERS = [
  {
    key: 'account_type',
    label: 'Account Type',
    type: 'select',
    options: [
      { value: '', label: 'All Types' },
      { value: 'tenant', label: 'Tenants' },
      { value: 'contractor', label: 'Contractors' },
      { value: 'employee', label: 'Employees' }
    ]
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'archived', label: 'Archived' }
    ]
  },
  {
    key: 'license_compliance',
    label: 'License Status',
    type: 'select',
    options: [
      { value: '', label: 'All Contractors' },
      { value: 'valid', label: 'Valid License' },
      { value: 'expiring', label: 'Expiring Soon' },
      { value: 'expired', label: 'Expired' },
      { value: 'missing', label: 'No License Data' }
    ]
  },
  {
    key: 'contact_completeness',
    label: 'Contact Info',
    type: 'select',
    options: [
      { value: '', label: 'All Accounts' },
      { value: 'complete', label: 'Complete (Email + Phone)' },
      { value: 'missing_phone', label: 'Missing Phone' },
      { value: 'missing_email', label: 'Missing Email' },
      { value: 'incomplete', label: 'Incomplete Contact' }
    ]
  },
];

// ADVANCED FILTERS - Complex Business Queries
export const ACCOUNTS_ADVANCED_FILTERS = [
  {
    key: 'created_date_range',
    label: 'Account Created',
    type: 'date_range',
    description: 'Filter by account creation date range'
  },
  {
    key: 'license_expiry_range',
    label: 'License Expiry',
    type: 'date_range',
    description: 'Filter contractors by license expiration dates',
    conditional: { account_type: 'contractor' }
  },
  {
    key: 'name_search',
    label: 'Name Contains',
    type: 'text',
    placeholder: 'Search in first name, last name, company name...',
    description: 'Search across all name fields'
  },
  {
    key: 'contact_method',
    label: 'Preferred Contact',
    type: 'select',
    options: [
      { value: '', label: 'Any Contact Method' },
      { value: 'email_only', label: 'Email Only' },
      { value: 'phone_only', label: 'Phone Only' },
      { value: 'both', label: 'Both Email & Phone' },
      { value: 'none', label: 'No Contact Info' }
    ]
  },
  {
    key: 'business_relationship',
    label: 'Business Relationship',
    type: 'select',
    options: [
      { value: '', label: 'All Relationships' },
      { value: 'new', label: 'New (< 30 days)' },
      { value: 'recent', label: 'Recent (< 90 days)' },
      { value: 'established', label: 'Established (> 6 months)' },
      { value: 'long_term', label: 'Long-term (> 2 years)' }
    ]
  },
  {
    key: 'compliance_risk',
    label: 'Compliance Risk',
    type: 'select',
    options: [
      { value: '', label: 'All Risk Levels' },
      { value: 'low', label: 'Low Risk' },
      { value: 'medium', label: 'Medium Risk' },
      { value: 'high', label: 'High Risk (Missing Data)' },
      { value: 'critical', label: 'Critical (Expired Licenses)' }
    ],
    description: 'Risk assessment based on compliance and data completeness'
  },
  {
    key: 'activity_level',
    label: 'Activity Level',
    type: 'select',
    options: [
      { value: '', label: 'All Activity Levels' },
      { value: 'very_active', label: 'Very Active (Recent)' },
      { value: 'active', label: 'Active (This Month)' },
      { value: 'inactive', label: 'Inactive (> 30 days)' },
      { value: 'dormant', label: 'Dormant (> 90 days)' }
    ]
  }
];