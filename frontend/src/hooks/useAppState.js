// Custom hook for managing global application state
import { useState, useCallback } from 'react';

const useAppState = () => {
  // Core data state
  const [stats, setStats] = useState(null);
  const [taskOrders, setTaskOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [viewedTasks, setViewedTasks] = useState(() => 
    localStorage.getItem('viewedTasks') ? JSON.parse(localStorage.getItem('viewedTasks')) : []
  );
  
  // Selection state
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Related data state
  const [tenantInvoices, setTenantInvoices] = useState([]);
  const [accountTasks, setAccountTasks] = useState([]);

  // Helper functions
  const markTaskAsViewed = useCallback((taskId) => {
    setViewedTasks(prev => {
      const updated = [...prev, taskId];
      localStorage.setItem('viewedTasks', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTenant(null);
    setSelectedAccount(null);
    setSelectedUser(null);
    setSelectedTask(null);
    setSelectedInvoiceId(null);
    setSelectedInvoice(null);
    setTenantInvoices([]);
    setAccountTasks([]);
  }, []);

  const resetAppData = useCallback(() => {
    setStats(null);
    setTaskOrders([]);
    setAccounts([]);
    setProperties([]);
    setTenants([]);
    setInvoices([]);
    setUsersList([]);
    setAssignedTasks([]);
    setLoading(true);
    clearSelection();
  }, [clearSelection]);

  return {
    // Core data
    stats, setStats,
    taskOrders, setTaskOrders,
    accounts, setAccounts,
    properties, setProperties,
    tenants, setTenants,
    invoices, setInvoices,
    usersList, setUsersList,
    assignedTasks, setAssignedTasks,
    
    // UI state
    loading, setLoading,
    viewedTasks, setViewedTasks,
    
    // Selection state
    selectedTenant, setSelectedTenant,
    selectedAccount, setSelectedAccount,
    selectedUser, setSelectedUser,
    selectedTask, setSelectedTask,
    selectedInvoiceId, setSelectedInvoiceId,
    selectedInvoice, setSelectedInvoice,
    
    // Related data
    tenantInvoices, setTenantInvoices,
    accountTasks, setAccountTasks,
    
    // Helper functions
    markTaskAsViewed,
    clearSelection,
    resetAppData
  };
};

export default useAppState;