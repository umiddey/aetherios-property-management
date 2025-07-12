// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
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
import CreateCustomerForm from './CreateCustomerForm';
import UserForm from './UserForm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const SOCKET_URL = BACKEND_URL;

const ITEMS_PER_PAGE = 10;

const Dashboard = () => {
  const { t } = useTranslation();
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
  const [createTaskContext, setCreateTaskContext] = useState(null);
  const [viewedTasks, setViewedTasks] = useState(() => localStorage.getItem('viewedTasks') ? JSON.parse(localStorage.getItem('viewedTasks')) : []);
  const [propertyPage, setPropertyPage] = useState(1);
  const [tenantPage, setTenantPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  const [accountPage, setAccountPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  
  // Filter states
  const [propertyFilters, setPropertyFilters] = useState({
    property_type: 'complex',
    min_rooms: '',
    max_rooms: '',
    min_surface: '',
    max_surface: '',
    archived: false
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
  
  // Selected item states
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [propertyAgreements, setPropertyAgreements] = useState([]);
  const [propertyInvoices, setPropertyInvoices] = useState([]);
  const [tenantAgreements, setTenantAgreements] = useState([]);
  const [tenantInvoices, setTenantInvoices] = useState([]);
  const [accountTasks, setAccountTasks] = useState([]);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('viewedTasks', JSON.stringify(viewedTasks));
  }, [viewedTasks]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('new_task', (task) => {
      if (task.assigned_to === user.id) {
        setAssignedTasks(prev => [...prev, task]);
        notifyUser(`New task assigned: ${task.subject}`);
      }
    });

    socket.on('reminder', (reminder) => {
      notifyUser(reminder.message);
    });

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    const checkReminders = () => {
      assignedTasks.forEach(task => {
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

  const fetchData = async () => {
    try {
      const [statsRes, tasksRes, accountsRes, assignedTasksRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/task-orders`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/task-orders?assigned_to=${user.id}`)
      ]);
      
      setStats(statsRes.data);
      setTaskOrders(tasksRes.data);
      setAccounts(accountsRes.data);
      setAssignedTasks(assignedTasksRes.data);
      
      await Promise.all([
        fetchProperties(),
        fetchTenants(),
        fetchInvoices()
      ]);

      if (user.role === 'super_admin') {
        const usersRes = await axios.get(`${API}/users`);
        setUsersList(usersRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
      params.append('archived', propertyFilters.archived);
      
      const response = await axios.get(`${API}/properties?${params.toString()}`);
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const params = new URLSearchParams();
      params.append('archived', tenantFilters.archived);
      
      const response = await axios.get(`${API}/tenants?${params.toString()}`);
      let filteredTenants = response.data;
      
      if (tenantFilters.search) {
        const searchTerm = tenantFilters.search.toLowerCase();
        filteredTenants = filteredTenants.filter(tenant => 
          tenant.first_name.toLowerCase().includes(searchTerm) ||
          tenant.last_name.toLowerCase().includes(searchTerm) ||
          tenant.email.toLowerCase().includes(searchTerm)
        );
      }
      
      setTenants(filteredTenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams();
      if (invoiceFilters.status) params.append('status', invoiceFilters.status);
      if (invoiceFilters.tenant_id) params.append('tenant_id', invoiceFilters.tenant_id);
      if (invoiceFilters.property_id) params.append('property_id', invoiceFilters.property_id);
      params.append('archived', invoiceFilters.archived);
      
      const response = await axios.get(`${API}/invoices?${params.toString()}`);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsersList(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (selectedProperty) {
        try {
          const [agreementsRes, invoicesRes] = await Promise.all([
            axios.get(`${API}/rental-agreements?property_id=${selectedProperty.id}`),
            axios.get(`${API}/invoices?property_id=${selectedProperty.id}`)
          ]);
          setPropertyAgreements(agreementsRes.data);
          setPropertyInvoices(invoicesRes.data);
        } catch (error) {
          console.error('Error fetching property details:', error);
        }
      }
    };
    fetchPropertyDetails();
  }, [selectedProperty]);

  useEffect(() => {
    const fetchTenantDetails = async () => {
      if (selectedTenant) {
        try {
          const [agreementsRes, invoicesRes] = await Promise.all([
            axios.get(`${API}/rental-agreements?tenant_id=${selectedTenant.id}`),
            axios.get(`${API}/invoices?tenant_id=${selectedTenant.id}`)
          ]);
          setTenantAgreements(agreementsRes.data);
          setTenantInvoices(invoicesRes.data);
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
          const tasksRes = await axios.get(`${API}/task-orders?customer_id=${selectedAccount.id}`);
          setAccountTasks(tasksRes.data);
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

  // Apply filters when they change
  useEffect(() => {
    if (!loading) {
      fetchProperties();
    }
  }, [propertyFilters]);

  useEffect(() => {
    if (!loading) {
      fetchTenants();
    }
  }, [tenantFilters]);

  useEffect(() => {
    if (!loading) {
      fetchInvoices();
    }
  }, [invoiceFilters]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
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
      case 'empty': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPropertyTypeColor = (type) => {
    switch (type) {
      case 'apartment': return 'bg-blue-100 text-blue-800';
      case 'house': return 'bg-green-100 text-green-800';
      case 'office': return 'bg-purple-100 text-purple-800';
      case 'commercial': return 'bg-orange-100 text-orange-800';
      case 'complex': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown';
  };

  const getPropertyName = (propertyId) => {
    const prop = properties.find(p => p.id === propertyId);
    return prop ? prop.name : 'Unknown';
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`${API}/users/${userId}`);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleClickInvoice = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    navigate('/invoices');
  };

  const handleClickAgreement = (agreementId) => {
    const agreement = [...propertyAgreements, ...tenantAgreements].find(ag => ag.id === agreementId);
    setSelectedAgreement(agreement);
  };

  const handleClickTask = (taskId) => {
    const task = taskOrders.find(t => t.id === taskId);
    setSelectedTask(task);
    setViewedTasks(prev => [...prev, taskId]);
  };

  const handleNav = (view, state = {}) => {
    logAction('navigation', { view });
    navigate(`/${view}`, { state });
  };

  const currentViewFromPath = location.pathname.slice(1) || 'dashboard';

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('Loading...')}</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Property ERP</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.full_name}</p>
            </div>
            <div className="flex flex-wrap items-center space-x-4 space-y-2 md:space-y-0">
              <nav className="flex flex-wrap space-x-6 space-y-2 md:space-y-0">
                <button onClick={() => handleNav('')} className={currentViewFromPath === '' ? 'px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700' : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700'}>{t('Dashboard')}</button>
                <button onClick={() => handleNav('properties')} className={currentViewFromPath === 'properties' ? 'px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700' : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700'}>{t('Properties')}</button>
                <button onClick={() => handleNav('tenants')} className={currentViewFromPath === 'tenants' ? 'px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700' : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700'}>{t('Tenants')}</button>
                <button onClick={() => handleNav('invoices')} className={currentViewFromPath === 'invoices' ? 'px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700' : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700'}>{t('Invoices')}</button>
                <button onClick={() => handleNav('tasks')} className={currentViewFromPath === 'tasks' ? 'px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700' : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700'}>{t('Tasks')}</button>
                <button onClick={() => handleNav('accounts')} className={currentViewFromPath === 'accounts' ? 'px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700' : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700'}>{t('Accounts')}</button>
                {user.role === 'super_admin' && (
                  <button onClick={() => handleNav('users')} className={currentViewFromPath === 'users' ? 'px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700' : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700'}>{t('Users')}</button>
                )}
              </nav>
              <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600">
                {t('Logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<DashboardView 
            stats={stats} 
            properties={properties} 
            assignedTasks={assignedTasks} 
            getPriorityColor={getPriorityColor} 
            getStatusColor={getStatusColor} 
            getPropertyTypeColor={getPropertyTypeColor} 
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            handleNav={handleNav} 
            viewedTasks={viewedTasks}
            setViewedTasks={setViewedTasks}
            t={t}
            logAction={logAction}
          />} />
          <Route path="/properties" element={<PropertiesView 
            propertyFilters={propertyFilters} 
            handlePropertyFilterChange={handlePropertyFilterChange} 
            properties={properties.slice((propertyPage - 1) * ITEMS_PER_PAGE, propertyPage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil(properties.length / ITEMS_PER_PAGE)} 
            currentPage={propertyPage} 
            onPageChange={setPropertyPage}
            setSelectedProperty={setSelectedProperty} 
            selectedProperty={selectedProperty} 
            propertyAgreements={propertyAgreements} 
            propertyInvoices={propertyInvoices} 
            tenants={tenants} 
            getTenantName={getTenantName} 
            getPropertyName={getPropertyName} 
            selectedAgreement={selectedAgreement} 
            setSelectedAgreement={setSelectedAgreement} 
            selectedInvoice={selectedInvoice} 
            setSelectedInvoice={setSelectedInvoice} 
            handleClickInvoice={handleClickInvoice} 
            handleClickAgreement={handleClickAgreement} 
            setCreateTaskContext={setCreateTaskContext} 
            handleNav={handleNav} 
            getStatusColor={getStatusColor} 
            getPropertyTypeColor={getPropertyTypeColor} 
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/tenants" element={<TenantsView 
            tenantFilters={tenantFilters} 
            handleTenantFilterChange={handleTenantFilterChange} 
            tenants={tenants.slice((tenantPage - 1) * ITEMS_PER_PAGE, tenantPage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil(tenants.length / ITEMS_PER_PAGE)} 
            currentPage={tenantPage} 
            onPageChange={setTenantPage}
            setSelectedTenant={setSelectedTenant} 
            selectedTenant={selectedTenant} 
            tenantAgreements={tenantAgreements} 
            tenantInvoices={tenantInvoices} 
            getPropertyName={getPropertyName} 
            getTenantName={getTenantName} 
            selectedAgreement={selectedAgreement} 
            setSelectedAgreement={setSelectedAgreement} 
            selectedInvoice={selectedInvoice} 
            setSelectedInvoice={setSelectedInvoice} 
            handleClickInvoice={handleClickInvoice} 
            handleClickAgreement={handleClickAgreement} 
            handleNav={handleNav} 
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/invoices" element={<InvoicesView 
            invoiceFilters={invoiceFilters} 
            handleInvoiceFilterChange={handleInvoiceFilterChange} 
            invoices={invoices.slice((invoicePage - 1) * ITEMS_PER_PAGE, invoicePage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil(invoices.length / ITEMS_PER_PAGE)} 
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
            t={t}
            logAction={logAction}
          />} />
          <Route path="/tasks" element={<TasksView 
            taskOrders={taskOrders.slice((taskPage - 1) * ITEMS_PER_PAGE, taskPage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil(taskOrders.length / ITEMS_PER_PAGE)} 
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
            t={t}
            logAction={logAction}
          />} />
          <Route path="/accounts" element={<AccountsView 
            accounts={accounts.slice((accountPage - 1) * ITEMS_PER_PAGE, accountPage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil(accounts.length / ITEMS_PER_PAGE)} 
            currentPage={accountPage} 
            onPageChange={setAccountPage}
            selectedAccount={selectedAccount} 
            setSelectedAccount={setSelectedAccount} 
            accountTasks={accountTasks} 
            handleClickTask={handleClickTask} 
            handleNav={handleNav} 
            formatDate={formatDate} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/users" element={<UsersView 
            usersList={usersList.slice((userPage - 1) * ITEMS_PER_PAGE, userPage * ITEMS_PER_PAGE)} 
            totalPages={Math.ceil(usersList.length / ITEMS_PER_PAGE)} 
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
              fetchData();
              handleNav('tenants');
            }} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/create-invoice" element={<CreateInvoiceForm 
            onBack={() => handleNav('invoices')} 
            onSuccess={() => {
              fetchData();
              handleNav('invoices');
            }} 
            properties={properties} 
            tenants={tenants} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/create-task" element={<CreateTaskForm 
            onBack={() => handleNav('tasks')} 
            onSuccess={() => {
              fetchData();
              handleNav('tasks');
            }} 
            customers={accounts} 
            users={usersList} 
            context={createTaskContext} 
            t={t}
            logAction={logAction}
          />} />
          <Route path="/create-account" element={<CreateCustomerForm 
            onBack={() => handleNav('accounts')} 
            onSuccess={() => {
              fetchData();
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
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;