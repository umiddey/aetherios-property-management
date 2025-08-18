import React, { useState } from 'react';

/**
 * Property Portfolio Dashboard Table - Core Business Intelligence Component
 * 
 * BUSINESS PURPOSE: Show 12-15 properties with actionable business data
 * INFORMATION DENSITY: 15 properties vs current 0 visible on dashboard
 * TARGET: Property managers see occupancy, rent, alerts, lease status instantly
 */
const PropertyPortfolioTable = ({ 
  properties = [], 
  onRowClick, 
  formatCurrency, 
  formatDate, 
  getStatusColor 
}) => {
  
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Sort properties based on current config
  const sortedProperties = React.useMemo(() => {
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
      
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [properties, sortConfig]);

  const handleSort = (key) => {
    const direction = sortConfig?.key === key && sortConfig?.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig?.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  // Calculate rent from property data
  const calculateRent = (property) => {
    if (property.cold_rent) return property.cold_rent;
    if (property.rent_per_sqm && property.surface_area) {
      return (property.rent_per_sqm * property.surface_area).toFixed(0);
    }
    return null;
  };

  // Get tenant name from property
  const getTenantName = (property) => {
    if (property.tenant_name) return property.tenant_name;
    if (property.current_tenant) return property.current_tenant;
    return null;
  };

  // Get occupancy status with business intelligence
  const getOccupancyStatus = (property) => {
    if (getTenantName(property)) {
      return { status: 'occupied', color: 'bg-green-100 text-green-800' };
    }
    if (property.status === 'available' || property.status === 'empty') {
      return { status: 'vacant', color: 'bg-red-100 text-red-800' };
    }
    return { status: 'unknown', color: 'bg-gray-100 text-gray-800' };
  };

  // Calculate days overdue for rent payments
  const calculateDaysOverdue = (lastPayment) => {
    if (!lastPayment) return 0;
    const today = new Date();
    const paymentDate = new Date(lastPayment);
    const diffTime = today - paymentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30 ? diffDays - 30 : 0; // Assume 30-day payment cycle
  };

  // Calculate days until lease expiry
  const calculateDaysUntilExpiry = (leaseEndDate) => {
    if (!leaseEndDate) return null;
    const today = new Date();
    const expiryDate = new Date(leaseEndDate);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get rent payment status
  const getRentStatus = (property) => {
    const daysOverdue = calculateDaysOverdue(property.last_payment);
    if (daysOverdue > 0) {
      return {
        status: `${daysOverdue}d overdue`,
        color: 'text-red-600 text-xs font-medium'
      };
    }
    return {
      status: 'Current',
      color: 'text-green-600 text-xs'
    };
  };

  // Get lease expiry status
  const getLeaseExpiryStatus = (property) => {
    const daysUntilExpiry = calculateDaysUntilExpiry(property.lease_end_date);
    if (daysUntilExpiry === null) return { status: 'N/A', color: 'text-gray-400 text-xs' };
    
    if (daysUntilExpiry < 90) {
      return {
        status: `${daysUntilExpiry}d left`,
        color: 'text-orange-600 font-medium text-xs'
      };
    }
    return {
      status: `${daysUntilExpiry}d left`,
      color: 'text-gray-600 text-xs'
    };
  };

  // Get maintenance status
  const getMaintenanceStatus = (property) => {
    const openIssues = property.open_maintenance_requests || property.maintenance_requests || 0;
    if (openIssues > 0) {
      return {
        status: openIssues,
        color: 'bg-red-100 text-red-800 text-xs px-2 py-1 rounded'
      };
    }
    return {
      status: '—',
      color: 'text-xs text-gray-400'
    };
  };

  // Get alerts for property (legacy - kept for compatibility)
  const getPropertyAlerts = (property) => {
    const alerts = [];
    
    // Maintenance alerts
    if (property.maintenance_requests > 0) {
      alerts.push({ type: 'maintenance', count: property.maintenance_requests, color: 'bg-red-100 text-red-800' });
    }
    
    return alerts;
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Property', 
      width: '180px', 
      sortable: true 
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '80px', 
      sortable: true 
    },
    { 
      key: 'tenant', 
      label: 'Tenant', 
      width: '130px', 
      sortable: false 
    },
    { 
      key: 'rent', 
      label: 'Rent (€)', 
      width: '90px', 
      sortable: true 
    },
    { 
      key: 'rent_status', 
      label: 'Rent Status', 
      width: '100px', 
      sortable: false 
    },
    { 
      key: 'lease_expiry', 
      label: 'Lease End', 
      width: '90px', 
      sortable: false 
    },
    { 
      key: 'maintenance_status', 
      label: 'Issues', 
      width: '70px', 
      sortable: false 
    },
    { 
      key: 'surface_area', 
      label: 'Size (m²)', 
      width: '80px', 
      sortable: true 
    },
    { 
      key: 'last_inspection', 
      label: 'Inspection', 
      width: '100px', 
      sortable: false 
    }
  ];

  if (!properties || properties.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-lg font-medium mb-2">No Properties Found</p>
        <p className="text-sm">Add your first property to see portfolio data</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                }`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.label}</span>
                  {column.sortable && getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedProperties.slice(0, 15).map((property) => {
            const occupancyStatus = getOccupancyStatus(property);
            const rent = calculateRent(property);
            const tenantName = getTenantName(property);
            const rentStatus = getRentStatus(property);
            const leaseExpiryStatus = getLeaseExpiryStatus(property);
            const maintenanceStatus = getMaintenanceStatus(property);
            
            return (
              <tr 
                key={property.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onRowClick && onRowClick(property)}
              >
                {/* Property Name & Address */}
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {property.name || 'Unnamed Property'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {property.street} {property.house_nr}, {property.city}
                    </div>
                  </div>
                </td>

                {/* Occupancy Status */}
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${occupancyStatus.color}`}>
                    {occupancyStatus.status}
                  </span>
                </td>

                {/* Tenant Information */}
                <td className="px-4 py-3">
                  {tenantName ? (
                    <div>
                      <div className="text-sm text-gray-900">{tenantName}</div>
                      <div className="text-xs text-gray-500">Active</div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Vacant</span>
                  )}
                </td>

                {/* Rent Information */}
                <td className="px-4 py-3 text-right">
                  {rent ? (
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        €{Number(rent).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {property.rent_per_sqm ? `€${property.rent_per_sqm}/m²` : 'monthly'}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td>

                {/* NEW: Rent Payment Status */}
                <td className="px-4 py-3">
                  <span className={rentStatus.color}>
                    {rentStatus.status}
                  </span>
                </td>

                {/* NEW: Lease Expiry Status */}
                <td className="px-4 py-3">
                  <span className={leaseExpiryStatus.color}>
                    {leaseExpiryStatus.status}
                  </span>
                </td>

                {/* NEW: Maintenance Status */}
                <td className="px-4 py-3">
                  <span className={maintenanceStatus.color}>
                    {maintenanceStatus.status}
                  </span>
                </td>

                {/* Surface Area */}
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-gray-900">
                    {property.surface_area ? `${property.surface_area} m²` : 'N/A'}
                  </span>
                </td>

                {/* Last Inspection */}
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">
                    {property.last_inspection ? formatDate(property.last_inspection) : 'No data'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PropertyPortfolioTable;