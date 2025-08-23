// Enterprise Properties Table Column Configuration
// Professional, information-dense table columns with intelligent typography hierarchy

import React from 'react';

// Typography Hierarchy for Information Scanning
const TYPOGRAPHY_HIERARCHY = {
  critical: 'text-sm font-semibold text-gray-900',     // Property names, amounts, urgent alerts
  important: 'text-sm font-medium text-gray-700',     // Status, tenant names, key data
  secondary: 'text-xs text-gray-600',                 // Dates, IDs, supporting info
  metadata: 'text-xs text-gray-500',                  // Descriptions, notes, details
  alerts: 'text-xs font-medium text-red-700',         // Urgent items requiring attention
  success: 'text-xs font-medium text-green-700'       // Positive status indicators
};

export const PROPERTIES_TABLE_COLUMNS = [
  {
    key: 'id',
    label: 'Property ID',
    width: '120px',
    sortable: true,
    render: (value) => (
      <code className={`${TYPOGRAPHY_HIERARCHY.metadata} bg-gray-100 px-2 py-1 rounded`}>
        {value}
      </code>
    )
  },
  {
    key: 'name',
    label: 'Property Name', 
    width: '180px',
    sortable: true,
    searchable: true,
    critical: true,
    editable: true,
    inputType: 'text',
    filterable: true,
    filterType: 'text',
    filterHint: 'Search by property name',
    render: (value, row) => (
      <div>
        <div className={TYPOGRAPHY_HIERARCHY.critical}>
          {value || 'Unnamed Property'}
        </div>
        {row.property_type && (
          <div className={TYPOGRAPHY_HIERARCHY.metadata}>
            {row.property_type}
          </div>
        )}
      </div>
    )
  },
  {
    key: 'address',
    label: 'Address',
    width: '220px',
    sortable: true,
    searchable: true,
    render: (value, row) => {
      const fullAddress = [row.street, row.house_nr, row.city].filter(Boolean).join(', ');
      return (
        <div>
          <div className={TYPOGRAPHY_HIERARCHY.important}>
            {fullAddress || 'No address'}
          </div>
          {row.postcode && (
            <div className={TYPOGRAPHY_HIERARCHY.metadata}>
              {row.postcode}
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
    filterHint: 'Filter by occupancy status',
    basicFilter: true,
    basicFilterType: 'select',
    basicFilterHint: 'Quick filter by property status',
    render: (value) => {
      const isAvailable = value === 'available' || value === 'vacant';
      const isOccupied = value === 'occupied' || value === 'rented';
      const statusClass = isAvailable ? 'bg-green-100 text-green-800' : 
                         isOccupied ? 'bg-blue-100 text-blue-800' : 
                         'bg-gray-100 text-gray-800';
      
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusClass}`}>
          {value || 'Unknown'}
        </span>
      );
    }
  },
  {
    key: 'surface_area',
    label: 'Size (m²)',
    width: '90px',
    sortable: true,
    align: 'right',
    editable: true,
    inputType: 'number',
    min: 0,
    step: 1,
    filterable: true,
    filterType: 'number_range',
    filterHint: 'Filter by surface area range',
    render: (value) => (
      <span className={TYPOGRAPHY_HIERARCHY.important}>
        {value ? `${value} m²` : 'N/A'}
      </span>
    )
  },
  {
    key: 'rooms',
    label: 'Rooms',
    width: '70px',
    sortable: true,
    align: 'center',
    editable: true,
    inputType: 'number',
    min: 0,
    step: 1,
    filterable: true,
    filterType: 'select',
    filterHint: 'Filter by room count',
    render: (value) => (
      <span className={TYPOGRAPHY_HIERARCHY.important}>
        {value || '—'}
      </span>
    )
  },
  {
    key: 'rent',
    label: 'Rent (€)',
    width: '100px',
    sortable: true,
    align: 'right',
    critical: true,
    editable: true,
    inputType: 'number',
    min: 0,
    step: 50,
    filterable: true,
    filterType: 'number_range',
    filterHint: 'Filter by rent amount range',
    render: (value, row) => {
      const rent = value || (row.cold_rent) || (row.rent_per_sqm && row.surface_area ? row.rent_per_sqm * row.surface_area : null);
      
      if (!rent) {
        return <span className={TYPOGRAPHY_HIERARCHY.metadata}>N/A</span>;
      }
      
      return (
        <div className="text-right">
          <div className={TYPOGRAPHY_HIERARCHY.critical}>
            €{Number(rent).toLocaleString()}
          </div>
          {row.rent_per_sqm && (
            <div className={TYPOGRAPHY_HIERARCHY.metadata}>
              €{row.rent_per_sqm}/m²
            </div>
          )}
        </div>
      );
    }
  },
  {
    key: 'tenant_info',
    label: 'Tenant',
    width: '140px',
    sortable: false,
    render: (value, row) => {
      const tenantName = row.tenant_name || row.current_tenant;
      
      if (!tenantName) {
        return (
          <span className={`${TYPOGRAPHY_HIERARCHY.alerts} bg-yellow-100 px-2 py-1 rounded`}>
            Vacant
          </span>
        );
      }
      
      return (
        <div>
          <div className={TYPOGRAPHY_HIERARCHY.important}>
            {tenantName}
          </div>
          <div className={TYPOGRAPHY_HIERARCHY.success}>
            Active
          </div>
        </div>
      );
    }
  },
  {
    key: 'rent_status',
    label: 'Rent Status',
    width: '100px',
    sortable: false,
    render: (value, row) => {
      // Calculate days overdue for rent payments
      const calculateDaysOverdue = (lastPayment) => {
        if (!lastPayment) return 0;
        const today = new Date();
        const paymentDate = new Date(lastPayment);
        const diffTime = today - paymentDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 30 ? diffDays - 30 : 0;
      };
      
      const daysOverdue = calculateDaysOverdue(row.last_payment);
      if (daysOverdue > 0) {
        return (
          <span className={TYPOGRAPHY_HIERARCHY.alerts}>
            {daysOverdue}d overdue
          </span>
        );
      }
      return (
        <span className={TYPOGRAPHY_HIERARCHY.success}>
          Current
        </span>
      );
    }
  },
  {
    key: 'lease_expiry',
    label: 'Lease End',
    width: '90px',
    sortable: false,
    render: (value, row) => {
      // Calculate days until lease expiry
      const calculateDaysUntilExpiry = (leaseEndDate) => {
        if (!leaseEndDate) return null;
        const today = new Date();
        const expiryDate = new Date(leaseEndDate);
        const diffTime = expiryDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };
      
      const daysUntilExpiry = calculateDaysUntilExpiry(row.lease_end_date);
      if (daysUntilExpiry === null) {
        return <span className={TYPOGRAPHY_HIERARCHY.metadata}>N/A</span>;
      }
      
      if (daysUntilExpiry < 90) {
        return (
          <span className={TYPOGRAPHY_HIERARCHY.alerts}>
            {daysUntilExpiry}d left
          </span>
        );
      }
      return (
        <span className={TYPOGRAPHY_HIERARCHY.secondary}>
          {daysUntilExpiry}d left
        </span>
      );
    }
  },
  {
    key: 'maintenance_status',
    label: 'Issues',
    width: '70px',
    sortable: false,
    render: (value, row) => {
      const openIssues = row.open_maintenance_requests || row.maintenance_requests || 0;
      if (openIssues > 0) {
        return (
          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-medium">
            {openIssues}
          </span>
        );
      }
      return (
        <span className={TYPOGRAPHY_HIERARCHY.metadata}>—</span>
      );
    }
  },
  {
    key: 'archived',
    label: 'Archived',
    width: '80px',
    basicFilter: true,
    basicFilterType: 'toggle',
    basicFilterLabel: 'Show archived properties',
    render: (value, row) => (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
        value ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
      }`}>
        {value ? 'Archived' : 'Active'}
      </span>
    )
  },
  {
    key: 'actions',
    label: 'Actions',
    width: '100px',
    render: (value, row) => (
      <div className="flex items-center space-x-1">
        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          View
        </button>
        <span className={TYPOGRAPHY_HIERARCHY.metadata}>•</span>
        <button className="text-xs text-gray-600 hover:text-gray-800">
          Edit
        </button>
      </div>
    )
  }
];

// Sort configuration helper
export const getDefaultSortConfig = () => ({
  key: 'name',
  direction: 'asc'
});

// Search configuration - which fields to search in
export const SEARCHABLE_FIELDS = ['name', 'street', 'house_nr', 'city', 'postcode', 'id'];

// Filter properties based on search term
export const filterPropertiesBySearch = (properties, searchTerm) => {
  if (!searchTerm) return properties;
  
  const term = searchTerm.toLowerCase();
  return properties.filter(property => 
    SEARCHABLE_FIELDS.some(field => {
      const value = property[field];
      return value && value.toString().toLowerCase().includes(term);
    })
  );
};

// Filter properties by Units (new hierarchy: property_type='unit' + unit_type filtering)
export const filterPropertiesByUnits = (properties, unitTypeFilter) => {
  if (!unitTypeFilter || !Array.isArray(unitTypeFilter)) return properties;
  
  return properties.filter(property => 
    property.property_type === 'unit' && unitTypeFilter.includes(property.unit_type)
  );
};

// Sort properties by column
export const sortProperties = (properties, sortConfig) => {
  if (!sortConfig) return properties;
  
  return [...properties].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // Handle null/undefined values
    if (aValue == null) aValue = '';
    if (bValue == null) bValue = '';
    
    // Handle numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Handle strings
    const aStr = aValue.toString().toLowerCase();
    const bStr = bValue.toString().toLowerCase();
    
    if (aStr < bStr) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aStr > bStr) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};