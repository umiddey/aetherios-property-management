// Context provider for filters state management
import React, { createContext, useContext } from 'react';
import useFilters from '../hooks/useFilters';

const FiltersContext = createContext();

export const FiltersProvider = ({ children }) => {
  const filtersState = useFilters();
  
  return (
    <FiltersContext.Provider value={filtersState}>
      {children}
    </FiltersContext.Provider>
  );
};

// Custom hook to use filters context
export const useFiltersContext = () => {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error('useFiltersContext must be used within a FiltersProvider');
  }
  return context;
};

export default FiltersProvider;