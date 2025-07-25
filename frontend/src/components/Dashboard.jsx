// src/components/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import cachedAxios, { invalidateCache } from '../utils/cachedAxios';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import useToast from '../hooks/useToast';
import { ToastContainer } from './Toast';
import io from 'socket.io-client';
import DashboardView from './DashboardView';
import PropertiesView from './PropertiesView';
import TenantsView from './TenantsView';
import InvoicesView from './InvoicesView';
import TasksView from './TasksView';
import AccountsView from './AccountsView';
import UsersView from './UsersView';
import CreatePropertyForm from './CreatePropertyForm';
import CreateTenantForm from './CreateTenantForm';
import CreateInvoiceForm from './CreateInvoiceForm';
import CreateTaskForm from './CreateTaskForm';
import CreateAccountForm from './CreateAccountForm';
import UserForm from './UserForm';
import PropertyDetailPage from './PropertyDetailPage';
import TenantDetailPage from './TenantDetailPage';
import InvoiceDetailPage from './InvoiceDetailPage';
import TaskDetailPage from './TaskDetailPage';
import AccountDetailPage from './AccountDetailPage';
import ContractsView from './ContractsView';
import CreateContractForm from './CreateContractForm';
import ContractDetailPage from './ContractDetailPage';
import ContractEditPage from './ContractEditPage';
import Breadcrumb from './Breadcrumb';
import LanguageSwitcher from './LanguageSwitcher';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ITEMS_PER_PAGE = 10;

const Dashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [taskOrders, setTaskOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewedTasks, setViewedTasks] = useState(() => localStorage.getItem('viewedTasks') ? JSON.parse(localStorage.getItem('viewedTasks')) : []);
  const [propertyPage, setPropertyPage] = useState(1);
  const [tenantPage, setTenantPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  const [accountPage, setAccountPage] = useState(1);
  const [accountTypeFilter, setAccountTypeFilter] = useState(null);
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [userPage, setUserPage] = useState(1);
  
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
    search: ''
  });
  const [invoiceFilters, setInvoiceFilters] = useState({
    status: '',
    tenant_id: '',
    property_id: '',
    archived: false
  });
  
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [tenantInvoices, setTenantInvoices] = useState([]);
  const [accountTasks, setAccountTasks] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const { user, logout, loading: authLoading } = useAuth();
  const { toasts, removeToast, showError, showSuccess } = useToast();

  useEffect(() => {
    if (user) {
      const socket = io(BACKEND_URL);
      
      socket.on('connect', () => {
        console.log('Connected to Socket.io server');
      });

      socket.on('new_task', async (task) => {
        showSuccess('New task created!');
        try {
          // Only invalidate task-related caches instead of fetching all data
          invalidateCache('/api/v1/tasks');
          invalidateCache('/api/v1/dashboard/stats');
          
          // Refresh only tasks and stats instead of all data
          const [tasksRes, statsRes, assignedTasksRes] = await Promise.all([
            cachedAxios.get(`${API}/v1/tasks`),
            cachedAxios.get(`${API}/v1/dashboard/stats`),
            cachedAxios.get(`${API}/v1/tasks?assigned_to=${user?.id}`)
          ]);
          
          setTaskOrders(Array.isArray(tasksRes.data) ? tasksRes.data : []);
          setStats(statsRes.data || {});
          setAssignedTasks(Array.isArray(assignedTasksRes.data) ? assignedTasksRes.data : []);
        } catch (error) {
          console.error('Error refreshing tasks after socket event:', error);
          showError(error, 'Failed to refresh task data');
        }
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from Socket.io server');
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user, showSuccess]);

  useEffect(() => {
    const handleContractCreated = async (event) => {
      // Invalidate relevant caches
      invalidateCache('/api/v1/tenants');
      invalidateCache('/api/v1/dashboard/stats');
      invalidateCache('/api/v1/contracts');
      
      // Refresh tenant data and stats
      try {
        const [tenantsRes, statsRes] = await Promise.all([
          cachedAxios.get(`${API}/v1/tenants?archived=false`),
          cachedAxios.get(`${API}/v1/dashboard/stats`)
        ]);
        
        setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
        setStats(statsRes.data || {});
      } catch (error) {
        console.error('Error refreshing data after contract creation:', error);
      }
    };

    window.addEventListener('contractCreated', handleContractCreated);
    
    return () => {
      window.removeEventListener('contractCreated', handleContractCreated);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('viewedTasks', JSON.stringify(viewedTasks));
  }, [viewedTasks]);

  // Refresh accounts when filters change
  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [accountTypeFilter, accountSearchTerm, user]);


  useEffect(() => {
    const checkReminders = () => {
      (Array.isArray(assignedTasks) ? assignedTasks : []).forEach(task => {
        if (task.status !== 'completed') {
          const dueDate = new Date(task.due_date);
          const now = new Date();
          const oneWeekBefore = new Date(dueDate);
          oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
          const oneDayBefore = new Date(dueDate);
          oneDayBefore.setHours(oneDayBefore.getHours() - 24);

          if (now >= oneWeekBefore && now < dueDate) {
            notifyUser(`Reminder: Task "${task.subject}" is due in one week!`);
          } else if (now >= oneDayBefore && now < dueDate) {
            notifyUser(`Urgent Reminder: Task "${task.subject}" is due in 24 hours!`);
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 3600000); // Check every hour
    return () => clearInterval(interval);
  }, [assignedTasks]);

  const notifyUser = (message) => {
    if (Notification.permission === 'granted') {
      new Notification(message);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(message);
        }
      });
    }
  };

  const buildPropertyParams = () => {
    const params = new URLSearchParams();
    if (propertyFilters.property_type) params.append('property_type', propertyFilters.property_type);
    if (propertyFilters.min_rooms) params.append('min_rooms', propertyFilters.min_rooms);
    if (propertyFilters.max_rooms) params.append('max_rooms', propertyFilters.max_rooms);
    if (propertyFilters.min_surface) params.append('min_surface', propertyFilters.min_surface);
    if (propertyFilters.max_surface) params.append('max_surface', propertyFilters.max_surface);
    if (propertyFilters.search) params.append('search', propertyFilters.search);
    params.append('archived', propertyFilters.archived);
    return params.toString();
  };

  const buildTenantParams = () => {
    const params = new URLSearchParams();
    params.append('archived', tenantFilters.archived);
    return params.toString();
  };

  const buildInvoiceParams = () => {
    const params = new URLSearchParams();
    if (invoiceFilters.status) params.append('status', invoiceFilters.status);
    if (invoiceFilters.tenant_id) params.append('tenant_id', invoiceFilters.tenant_id);
    if (invoiceFilters.property_id) params.append('property_id', invoiceFilters.property_id);
    params.append('archived', invoiceFilters.archived);
    return params.toString();
  };

  const buildAccountParams = () => {
    const params = new URLSearchParams();
    params.append('company_id', 'company_1'); // Base company ID
    if (accountTypeFilter) params.append('account_type', accountTypeFilter);
    if (accountSearchTerm) params.append('search', accountSearchTerm);
    return params.toString();
  };

  const filterTenants = (tenants) => {
    const tenantsArray = Array.isArray(tenants) ? tenants : [];
    if (tenantFilters.search) {
      const searchTerm = tenantFilters.search.toLowerCase();
      return tenantsArray.filter(tenant => 
        tenant.first_name.toLowerCase().includes(searchTerm) ||
        tenant.last_name.toLowerCase().includes(searchTerm) ||
        tenant.email.toLowerCase().includes(searchTerm)
      );
    }
    return tenantsArray;
  };

  const fetchData = async (dateFilters = null) => {
    try {
      let statsUrl = `${API}/v1/dashboard/stats`;
      if (dateFilters && dateFilters.from && dateFilters.to) {
        statsUrl += `?from=${dateFilters.from}&to=${dateFilters.to}`;
      }
      
      // Single batch of all API calls for better performance
      const [
        statsRes, 
        tasksRes, 
        accountsRes, 
        assignedTasksRes, 
        propertiesRes,
        tenantsRes,
        invoicesRes,
        usersRes
      ] = await Promise.all([
        cachedAxios.get(statsUrl),
        cachedAxios.get(`${API}/v1/tasks`),
        cachedAxios.get(`${API}/v2/accounts/?${buildAccountParams()}`),
        cachedAxios.get(`${API}/v1/tasks?assigned_to=${user?.id}`),
        cachedAxios.get(`${API}/v1/properties?${buildPropertyParams()}`),
        cachedAxios.get(`${API}/v1/tenants?${buildTenantParams()}`),
        cachedAxios.get(`${API}/v1/invoices?${buildInvoiceParams()}`),
        cachedAxios.get(`${API}/v1/users`)
      ]);
      
      // Set all state at once with safety checks
      setStats(statsRes.data || {});
      setTaskOrders(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setAccounts(Array.isArray(accountsRes.data) ? accountsRes.data : []);
      setAssignedTasks(Array.isArray(assignedTasksRes.data) ? assignedTasksRes.data : []);
      setProperties(Array.isArray(propertiesRes.data) ? propertiesRes.data : []);
      setTenants(filterTenants(tenantsRes.data));
      setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
      setUsersList(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError(error, 'Failed to load dashboard data');
      // Reset arrays to safe defaults on error
      setStats({});
      setTaskOrders([]);
      setAccounts([]);
      setAssignedTasks([]);
      setProperties([]);
      setTenants([]);
      setInvoices([]);
      setUsersList([]);
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout(); // Logout on auth errors (redirects to login)
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const params = new URLSearchParams();
      if (propertyFilters.property_type) params.append('property_type', propertyFilters.property_type);
      if (propertyFilters.min_rooms) params.append('min_rooms', propertyFilters.min_rooms);
      if (propertyFilters.max_rooms) params.append('max_rooms', propertyFilters.max_rooms);
      if (propertyFilters.min_surface) params.append('min_surface', propertyFilters.min_surface);
      if (propertyFilters.max_surface) params.append('max_surface', propertyFilters.max_surface);
      if (propertyFilters.search) params.append('search', propertyFilters.search);
      params.append('archived', propertyFilters.archived);
      
      const response = await cachedAxios.get(`${API}/v1/properties?${params.toString()}`);
      setProperties(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      showError(error, 'Failed to load properties');
    }
  };

  const fetchTenants = async () => {
    try {
      const params = new URLSearchParams();
      params.append('archived', tenantFilters.archived);
      
      const response = await cachedAxios.get(`${API}/v1/tenants?${params.toString()}`);
      let filteredTenants = response.data;
      
      if (tenantFilters.search) {
        const searchTerm = tenantFilters.search.toLowerCase();
        filteredTenants = (Array.isArray(filteredTenants) ? filteredTenants : []).filter(tenant => 
          tenant.first_name.toLowerCase().includes(searchTerm) ||
          tenant.last_name.toLowerCase().includes(searchTerm) ||
          tenant.email.toLowerCase().includes(searchTerm)
        );
      }
      
      setTenants(Array.isArray(filteredTenants) ? filteredTenants : []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await cachedAxios.get(`${API}/v2/accounts/?${buildAccountParams()}`);
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    }
  };

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams();
      if (invoiceFilters.status) params.append('status', invoiceFilters.status);
      if (invoiceFilters.tenant_id) params.append('tenant_id', invoiceFilters.tenant_id);
      if (invoiceFilters.property_id) params.append('property_id', invoiceFilters.property_id);
      params.append('archived', invoiceFilters.archived);
      
      const response = await cachedAxios.get(`${API}/v1/invoices?${params.toString()}`);
      setInvoices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await cachedAxios.get(`${API}/v1/users`);
      setUsersList(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    const fetchTenantDetails = async () => {
      if (selectedTenant) {
        try {
          const invoicesRes = await cachedAxios.get(`${API}/v1/invoices?tenant_id=${selectedTenant.id}`);
          setTenantInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
        } catch (error) {
          console.error('Error fetching tenant details:', error);
        }
      }
    };
    fetchTenantDetails();
  }, [selectedTenant]);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (selectedAccount) {
        try {
          const tasksRes = await cachedAxios.get(`${API}/v1/tasks?customer_id=${selectedAccount.id}`);
          setAccountTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
        } catch (error) {
          console.error('Error fetching account details:', error);
        }
      }
    };
    fetchAccountDetails();
  }, [selectedAccount]);

  const handlePropertyFilterChange = (field, value) => {
    setPropertyFilters(prev => ({ ...prev, [field]: value }));
    setPropertyPage(1);
  };

  const handleTenantFilterChange = (field, value) => {
    setTenantFilters(prev => ({ ...prev, [field]: value }));
    setTenantPage(1);
  };

  const handleInvoiceFilterChange = (field, value) => {
    setInvoiceFilters(prev => ({ ...prev, [field]: value }));
    setInvoicePage(1);
  };

  useEffect(() => {
    if (!loading && user) {
      fetchData();
    }
  }, [propertyFilters, tenantFilters, invoiceFilters, loading, user]);

  const getPriorityColor = useCallback((priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-purple-100 text-purple-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'cancel': return 'bg-red-100 text-red-800';
      case 'empty': return 'bg-green-100 text-green-800'; // Available
      case 'occupied': return 'bg-red-100 text-red-800'; // Occupied
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getPropertyTypeColor = useCallback((type) => {
    switch (type) {
      case 'apartment': return 'bg-blue-100 text-blue-800';
      case 'house': return 'bg-green-100 text-green-800';
      case 'office': return 'bg-purple-100 text-purple-800';
      case 'commercial': return 'bg-orange-100 text-orange-800';
      case 'complex': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getTenantName = (tenantId) => {
    const tenantsArray = Array.isArray(tenants) ? tenants : [];
    const tenant = tenantsArray.find(t => t.id === tenantId);
    return tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown';
  };

  const getPropertyName = (propertyId) => {
    const propertiesArray = Array.isArray(properties) ? properties : [];
    const prop = propertiesArray.find(p => p.id === propertyId);
    return prop ? prop.name : 'Unknown';
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`${API}/v1/users/${userId}`);
        invalidateCache('/api/v1/users'); // Clear cache to force fresh data
        fetchUsers(); // Refetch with fresh data
        showSuccess('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        showError(error, 'Failed to delete user');
      }
    }
  };

  const handleClickTask = (taskId) => {
    const taskOrdersArray = Array.isArray(taskOrders) ? taskOrders : [];
    const task = taskOrdersArray.find(t => t.id === taskId);
    setSelectedTask(task);
    setViewedTasks(prev => [...prev, taskId]);
  };

  const logAction = async (action, details = {}) => {
    try {
      await axios.post(`${API}/v1/analytics/log`, { action, details });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };


  const generateBreadcrumbs = () => {
    const path = location.pathname;
    const breadcrumbs = [{ label: t('dashboard.title'), href: '' }];
    
    if (path === '/') {
      return breadcrumbs;
    }
    
    const pathParts = path.split('/').filter(Boolean);
    
    // Handle different routes
    if (pathParts[0] === 'properties') {
      breadcrumbs.push({ label: t('properties.title'), href: pathParts.length === 1 ? null : 'properties' });
      if (pathParts.length > 1) {
        breadcrumbs.push({ label: t('pages.propertyDetails'), href: null });
      }
    } else if (pathParts[0] === 'tenants') {
      breadcrumbs.push({ label: t('tenants.title'), href: pathParts.length === 1 ? null : 'tenants' });
      if (pathParts.length > 1) {
        breadcrumbs.push({ label: t('pages.tenantDetails'), href: null });
      }
    } else if (pathParts[0] === 'invoices') {
      breadcrumbs.push({ label: t('invoices.title'), href: pathParts.length === 1 ? null : 'invoices' });
      if (pathParts.length > 1) {
        breadcrumbs.push({ label: t('pages.invoiceDetails'), href: null });
      }
    } else if (pathParts[0] === 'tasks') {
      breadcrumbs.push({ label: t('tasks.title'), href: pathParts.length === 1 ? null : 'tasks' });
      if (pathParts.length > 1) {
        breadcrumbs.push({ label: t('pages.taskDetails'), href: null });
      }
    } else if (pathParts[0] === 'accounts') {
      breadcrumbs.push({ label: t('accounts.title'), href: pathParts.length === 1 ? null : 'accounts' });
      if (pathParts.length > 1) {
        breadcrumbs.push({ label: t('accounts.accountDetails'), href: null });
      }
    } else if (pathParts[0] === 'users') {
      breadcrumbs.push({ label: t('pages.users'), href: pathParts.length === 1 ? null : 'users' });
      if (pathParts.length > 1) {
        breadcrumbs.push({ label: t('User Details'), href: null });
      }
    } else if (pathParts[0] === 'create-property') {
      breadcrumbs.push({ label: t('properties.title'), href: 'properties' });
      breadcrumbs.push({ label: t('dashboard.addProperty'), href: null });
    } else if (pathParts[0] === 'create-tenant') {
      breadcrumbs.push({ label: t('tenants.title'), href: 'tenants' });
      breadcrumbs.push({ label: t('pages.createTenant'), href: null });
    } else if (pathParts[0] === 'create-task') {
      breadcrumbs.push({ label: t('tasks.title'), href: 'tasks' });
      breadcrumbs.push({ label: t('pages.createTask'), href: null });
    } else if (pathParts[0] === 'create-account') {
      breadcrumbs.push({ label: t('accounts.title'), href: 'accounts' });
      breadcrumbs.push({ label: t('pages.createAccount'), href: null });
    } else if (pathParts[0] === 'contracts') {
      breadcrumbs.push({ label: t('contracts.title'), href: pathParts.length === 1 ? null : 'contracts' });
      if (pathParts.length > 1) {
        if (pathParts[2] === 'edit') {
          breadcrumbs.push({ label: t('contracts.contractDetails'), href: `contracts/${pathParts[1]}` });
          breadcrumbs.push({ label: t('contracts.editContract'), href: null });
        } else {
          breadcrumbs.push({ label: t('contracts.contractDetails'), href: null });
        }
      }
    } else if (pathParts[0] === 'create-contract') {
      breadcrumbs.push({ label: t('contracts.title'), href: 'contracts' });
      breadcrumbs.push({ label: t('contracts.createContract'), href: null });
    }
    
    return breadcrumbs;
  };

  const handleNav = (view, state = {}) => {
    logAction('navigation', { view });
    navigate(`/${view}`, { state });
  };

  const currentViewFromPath = location.pathname.slice(1) || 'dashboard';

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Authenticating...</p>
      </div>
    </div>;
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('common.loading')}</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-6 space-y-4 md:space-y-0">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Property ERP</h1>
                <p className="text-sm text-gray-600">Welcome back, <span className="font-medium text-gray-900">{user?.full_name}</span></p>
              </div>
            </div>
            <div className="flex flex-wrap items-center space-x-4 space-y-2 md:space-y-0">
              <nav className="flex flex-wrap space-x-2 space-y-2 md:space-y-0">
                <button onClick={() => handleNav('')} className={currentViewFromPath === '' ? 'px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200'}>{t('navigation.dashboard')}</button>
                <button onClick={() => handleNav('properties')} className={currentViewFromPath === 'properties' ? 'px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200'}>{t('navigation.properties')}</button>
                <button onClick={() => handleNav('accounts')} className={currentViewFromPath === 'accounts' || currentViewFromPath === 'tenants' ? 'px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200'}>{t('navigation.accounts')}</button>
                <button onClick={() => handleNav('invoices')} className={currentViewFromPath === 'invoices' ? 'px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200'}>{t('navigation.invoices')}</button>
                <button onClick={() => handleNav('tasks')} className={currentViewFromPath === 'tasks' ? 'px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200'}>{t('navigation.tasks')}</button>
                <button onClick={() => handleNav('contracts')} className={currentViewFromPath === 'contracts' ? 'px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200'}>{t('navigation.contracts')}</button>
                {user?.role === 'super_admin' && (
                  <button onClick={() => handleNav('users')} className={currentViewFromPath === 'users' ? 'px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200'}>{t('navigation.users')}</button>
                )}
              </nav>
              <LanguageSwitcher />
              <button onClick={logout} className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{t('navigation.logout')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={generateBreadcrumbs()} onNavigate={handleNav} />
        <Routes>
          <Route path="/" element={<DashboardView 
            stats={stats} 
            assignedTasks={assignedTasks} 
            getPriorityColor={getPriorityColor} 
            getStatusColor={getStatusColor} 
            getPropertyTypeColor={getPropertyTypeColor} 
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            handleNav={handleNav} 
            viewedTasks={viewedTasks}
            setViewedTasks={setViewedTasks}
            logAction={logAction}
          />} />
          <Route path="/properties" element={<PropertiesView 
            propertyFilters={propertyFilters} 
            handlePropertyFilterChange={handlePropertyFilterChange} 
            properties={(Array.isArray(properties) ? properties : []).slice((propertyPage - 1) * ITEMS_PER_PAGE, propertyPage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil((Array.isArray(properties) ? properties : []).length / ITEMS_PER_PAGE)} 
            currentPage={propertyPage} 
            onPageChange={setPropertyPage}
            handleNav={handleNav} 
            getStatusColor={getStatusColor} 
            getPropertyTypeColor={getPropertyTypeColor} 
            formatDate={formatDate}
          />} />
          <Route path="/properties/:id" element={<PropertyDetailPage 
            getStatusColor={getStatusColor} 
            getPropertyTypeColor={getPropertyTypeColor} 
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            getTenantName={getTenantName}
            handleNav={handleNav}
          />} />
          <Route path="/tenants/:id" element={<TenantDetailPage 
            getStatusColor={getStatusColor} 
            getPropertyTypeColor={getPropertyTypeColor} 
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            getPropertyName={getPropertyName}
            handleNav={handleNav}
          />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage 
            getStatusColor={getStatusColor} 
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            getTenantName={getTenantName}
            getPropertyName={getPropertyName}
            handleNav={handleNav}
          />} />
          <Route path="/tasks/:id" element={<TaskDetailPage 
            getStatusColor={getStatusColor} 
            getPriorityColor={getPriorityColor}
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            usersList={usersList}
            handleNav={handleNav}
          />} />
          <Route path="/accounts/:id" element={<AccountDetailPage 
            getStatusColor={getStatusColor} 
            getPriorityColor={getPriorityColor}
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            handleNav={handleNav}
          />} />
          <Route path="/tenants" element={<TenantsView 
            tenantFilters={tenantFilters} 
            handleTenantFilterChange={handleTenantFilterChange} 
            tenants={(Array.isArray(tenants) ? tenants : []).slice((tenantPage - 1) * ITEMS_PER_PAGE, tenantPage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil((Array.isArray(tenants) ? tenants : []).length / ITEMS_PER_PAGE)} 
            currentPage={tenantPage} 
            onPageChange={setTenantPage}
            handleNav={handleNav} 
            formatDate={formatDate} 
            logAction={logAction}
          />} />
          <Route path="/invoices" element={<InvoicesView 
            invoiceFilters={invoiceFilters} 
            handleInvoiceFilterChange={handleInvoiceFilterChange} 
            invoices={(Array.isArray(invoices) ? invoices : []).slice((invoicePage - 1) * ITEMS_PER_PAGE, invoicePage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil((Array.isArray(invoices) ? invoices : []).length / ITEMS_PER_PAGE)} 
            currentPage={invoicePage} 
            onPageChange={setInvoicePage}
            setSelectedInvoice={setSelectedInvoice} 
            selectedInvoice={selectedInvoice} 
            selectedInvoiceId={selectedInvoiceId} 
            tenants={tenants} 
            properties={properties} 
            getTenantName={getTenantName} 
            getPropertyName={getPropertyName} 
            handleNav={handleNav} 
            getStatusColor={getStatusColor} 
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            logAction={logAction}
          />} />
          <Route path="/tasks" element={<TasksView 
            taskOrders={(Array.isArray(taskOrders) ? taskOrders : []).slice((taskPage - 1) * ITEMS_PER_PAGE, taskPage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil((Array.isArray(taskOrders) ? taskOrders : []).length / ITEMS_PER_PAGE)} 
            currentPage={taskPage} 
            onPageChange={setTaskPage}
            selectedTask={selectedTask} 
            setSelectedTask={setSelectedTask} 
            handleNav={handleNav} 
            getPriorityColor={getPriorityColor} 
            getStatusColor={getStatusColor} 
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            usersList={usersList} 
            logAction={logAction}
          />} />
          <Route path="/accounts" element={<AccountsView 
            accounts={(Array.isArray(accounts) ? accounts : []).slice((accountPage - 1) * ITEMS_PER_PAGE, accountPage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil((Array.isArray(accounts) ? accounts : []).length / ITEMS_PER_PAGE)} 
            currentPage={accountPage} 
            onPageChange={setAccountPage}
            selectedAccount={selectedAccount} 
            setSelectedAccount={setSelectedAccount} 
            accountTasks={accountTasks} 
            handleClickTask={handleClickTask} 
            handleNav={handleNav} 
            formatDate={formatDate} 
            logAction={logAction}
            accountTypeFilter={accountTypeFilter}
            setAccountTypeFilter={setAccountTypeFilter}
            searchTerm={accountSearchTerm}
            setSearchTerm={setAccountSearchTerm}
          />} />
          <Route path="/users" element={<UsersView 
            usersList={(Array.isArray(usersList) ? usersList : []).slice((userPage - 1) * ITEMS_PER_PAGE, userPage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil((Array.isArray(usersList) ? usersList : []).length / ITEMS_PER_PAGE)} 
            currentPage={userPage} 
            onPageChange={setUserPage}
            selectedUser={selectedUser} 
            setSelectedUser={setSelectedUser} 
            handleDeleteUser={handleDeleteUser} 
            handleNav={handleNav} 
            getRoleColor={getRoleColor} 
            formatDate={formatDate} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/create-property" element={<CreatePropertyForm 
            onBack={() => handleNav('properties')} 
            onSuccess={() => {
              invalidateCache('/api/v1/properties'); // Clear properties cache
              fetchData();
              handleNav('properties');
            }} 
            properties={properties} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/create-tenant" element={<CreateTenantForm 
            onBack={() => handleNav('tenants')} 
            onSuccess={() => {
              invalidateCache('/api/v1/tenants'); // Clear tenants cache
              fetchData();
              handleNav('tenants');
            }} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/create-invoice" element={<CreateInvoiceForm 
            onBack={() => handleNav('contracts')} 
            onSuccess={() => {
              invalidateCache('/api/v1/invoices');
              invalidateCache('/api/v1/contracts');
              fetchData();
              handleNav('invoices');
            }} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/create-task" element={<CreateTaskForm 
            onBack={() => handleNav('tasks')} 
            onSuccess={() => {
              invalidateCache('/api/v1/tasks'); // Clear tasks cache
              fetchData();
              handleNav('tasks');
            }} 
            customers={accounts} 
            users={usersList} 
            context={null} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/create-account" element={<CreateAccountForm 
            onBack={() => handleNav('accounts')} 
            onSuccess={() => {
              invalidateCache('/api/v2/accounts'); // Clear accounts cache
              fetchAccounts(); // Refresh accounts list
              handleNav('accounts');
            }} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/create-user" element={<UserForm 
            onBack={() => handleNav('users')} 
            onSuccess={() => {
              fetchUsers();
              handleNav('users');
            }} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/edit-user/:id" element={<UserForm 
            onBack={() => handleNav('users')} 
            onSuccess={() => {
              fetchUsers();
              handleNav('users');
            }} 
            initialData={selectedUser} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/contracts" element={<ContractsView />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
          <Route path="/contracts/:id/edit" element={<ContractEditPage />} />
          <Route path="/create-contract" element={<CreateContractForm />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;