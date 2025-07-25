// Context provider for global application state management
import React, { createContext, useContext } from 'react';
import useAppState from '../hooks/useAppState';

const AppStateContext = createContext();

export const AppStateProvider = ({ children }) => {
  const appState = useAppState();
  
  return (
    <AppStateContext.Provider value={appState}>
      {children}
    </AppStateContext.Provider>
  );
};

// Custom hook to use app state context
export const useAppStateContext = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppStateContext must be used within an AppStateProvider');
  }
  return context;
};

export default AppStateProvider;