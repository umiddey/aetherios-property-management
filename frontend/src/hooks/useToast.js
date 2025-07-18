import { useState, useCallback } from 'react';
import { getUserFriendlyError } from '../utils/errorMessages';

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = ++toastId;
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showError = useCallback((error, title = 'Error') => {
    const message = getUserFriendlyError(error);
    return addToast(message, 'error', 6000); // Longer duration for errors
  }, [addToast]);

  const showSuccess = useCallback((message) => {
    return addToast(message, 'success', 4000);
  }, [addToast]);

  const showWarning = useCallback((message) => {
    return addToast(message, 'warning', 5000);
  }, [addToast]);

  const showInfo = useCallback((message) => {
    return addToast(message, 'info', 4000);
  }, [addToast]);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    clearAll
  };
};

export default useToast;