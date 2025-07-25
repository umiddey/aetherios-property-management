// Context provider for pagination state management
import React, { createContext, useContext } from 'react';
import usePagination from '../hooks/usePagination';

const PaginationContext = createContext();

export const PaginationProvider = ({ children }) => {
  const paginationState = usePagination();
  
  return (
    <PaginationContext.Provider value={paginationState}>
      {children}
    </PaginationContext.Provider>
  );
};

// Custom hook to use pagination context
export const usePaginationContext = () => {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error('usePaginationContext must be used within a PaginationProvider');
  }
  return context;
};

export default PaginationProvider;