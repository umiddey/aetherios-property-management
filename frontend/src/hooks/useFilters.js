// Custom hook for managing filter state across different views
import { useState, useCallback } from 'react';

const useFilters = () => {
  // Filter state for each view
  const [propertyFilters, setPropertyFilters] = useState({
    property_type: 'complex',
    min_rooms: '',
    max_rooms: '',
    min_surface: '',
    max_surface: '',
    archived: false,
    search: ''
  });

  const [tenantFilters, setTenantFilters] = useState({
    archived: false,
    search: '',
    status: ''
  });

  const [accountFilters, setAccountFilters] = useState({
    archived: false,
    search: '',
    account_type: ''
  });

  const [invoiceFilters, setInvoiceFilters] = useState({
    status: '',
    tenant_id: '',
    property_id: '',
    archived: false,
    search: ''
  });

  // Generic filter change handler
  const createFilterHandler = useCallback((setFilter) => (field, value) => {
    setFilter(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Specific filter handlers
  const handlePropertyFilterChange = createFilterHandler(setPropertyFilters);
  const handleTenantFilterChange = createFilterHandler(setTenantFilters);
  const handleAccountFilterChange = createFilterHandler(setAccountFilters);
  const handleInvoiceFilterChange = createFilterHandler(setInvoiceFilters);

  // Reset specific filters
  const resetPropertyFilters = useCallback(() => {
    setPropertyFilters({
      property_type: 'complex',
      min_rooms: '',
      max_rooms: '',
      min_surface: '',
      max_surface: '',
      archived: false,
      search: ''
    });
  }, []);

  const resetTenantFilters = useCallback(() => {
    setTenantFilters({
      archived: false,
      search: '',
      status: ''
    });
  }, []);

  const resetAccountFilters = useCallback(() => {
    setAccountFilters({
      archived: false,
      search: '',
      account_type: ''
    });
  }, []);

  const resetInvoiceFilters = useCallback(() => {
    setInvoiceFilters({
      status: '',
      tenant_id: '',
      property_id: '',
      archived: false,
      search: ''
    });
  }, []);

  // Reset all filters
  const resetAllFilters = useCallback(() => {
    resetPropertyFilters();
    resetTenantFilters();
    resetAccountFilters();
    resetInvoiceFilters();
  }, [resetPropertyFilters, resetTenantFilters, resetAccountFilters, resetInvoiceFilters]);

  // Get active filter count for UI indicators
  const getActiveFilterCount = useCallback((filters, defaultValues = {}) => {
    return Object.entries(filters).reduce((count, [key, value]) => {
      const defaultValue = defaultValues[key];
      if (value !== defaultValue && value !== '' && value !== false) {
        return count + 1;
      }
      return count;
    }, 0);
  }, []);

  return {
    // Filter states
    propertyFilters,
    tenantFilters,
    accountFilters,
    invoiceFilters,
    
    // Filter handlers
    handlePropertyFilterChange,
    handleTenantFilterChange,
    handleAccountFilterChange,
    handleInvoiceFilterChange,
    
    // Reset functions
    resetPropertyFilters,
    resetTenantFilters,
    resetAccountFilters,
    resetInvoiceFilters,
    resetAllFilters,
    
    // Utilities
    getActiveFilterCount
  };
};

export default useFilters;