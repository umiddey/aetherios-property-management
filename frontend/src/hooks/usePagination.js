// Custom hook for managing pagination state across different views
import { useState, useCallback } from 'react';

const ITEMS_PER_PAGE = 10;

const usePagination = () => {
  // Pagination state for each view
  const [propertyPage, setPropertyPage] = useState(1);
  const [tenantPage, setTenantPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  const [accountPage, setAccountPage] = useState(1);
  const [userPage, setUserPage] = useState(1);

  // Generic pagination handlers
  const createPageHandler = useCallback((setPage) => (page) => {
    setPage(page);
  }, []);

  // Specific page handlers
  const handlePropertyPageChange = createPageHandler(setPropertyPage);
  const handleTenantPageChange = createPageHandler(setTenantPage);
  const handleInvoicePageChange = createPageHandler(setInvoicePage);
  const handleTaskPageChange = createPageHandler(setTaskPage);
  const handleAccountPageChange = createPageHandler(setAccountPage);
  const handleUserPageChange = createPageHandler(setUserPage);

  // Calculate total pages helper
  const calculateTotalPages = useCallback((totalItems) => {
    return Math.ceil(totalItems / ITEMS_PER_PAGE);
  }, []);

  // Get paginated slice of data
  const getPaginatedData = useCallback((data, currentPage) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return Array.isArray(data) ? data.slice(startIndex, endIndex) : [];
  }, []);

  // Reset all pagination
  const resetPagination = useCallback(() => {
    setPropertyPage(1);
    setTenantPage(1);
    setInvoicePage(1);
    setTaskPage(1);
    setAccountPage(1);
    setUserPage(1);
  }, []);

  return {
    // Current pages
    propertyPage,
    tenantPage,
    invoicePage,
    taskPage,
    accountPage,
    userPage,
    
    // Page handlers
    handlePropertyPageChange,
    handleTenantPageChange,
    handleInvoicePageChange,
    handleTaskPageChange,
    handleAccountPageChange,
    handleUserPageChange,
    
    // Utilities
    ITEMS_PER_PAGE,
    calculateTotalPages,
    getPaginatedData,
    resetPagination
  };
};

export default usePagination;