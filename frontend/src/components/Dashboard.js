import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import CreatePropertyForm from './CreatePropertyForm';
import CreateTenantForm from './CreateTenantForm';
import CreateInvoiceForm from './CreateInvoiceForm';
import CreateTaskForm from './CreateTaskForm';
import CreateCustomerForm from './CreateCustomerForm';
import UserForm from './UserForm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [taskOrders, setTaskOrders] = useState([]);
  const [accounts, setAccounts] = useState([]); // Renamed from customers
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [createTaskContext, setCreateTaskContext] = useState(null);
  
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
  const [selectedAccount, setSelectedAccount] = useState(null); // Renamed from selectedCustomer
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null); // For highlighting in invoices page
  const [propertyAgreements, setPropertyAgreements] = useState([]);
  const [propertyInvoices, setPropertyInvoices] = useState([]);
  const [tenantAgreements, setTenantAgreements] = useState([]);
  const [tenantInvoices, setTenantInvoices] = useState([]);
  const [accountTasks, setAccountTasks] = useState([]); // Renamed from customerTasks
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, tasksRes, accountsRes, assignedTasksRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/task-orders`),
        axios.get(`${API}/customers`), // API endpoint remains /customers, but UI renames to Accounts
        axios.get(`${API}/task-orders?assigned_to=${user.id}`)
      ]);
      
      setStats(statsRes.data);
      setTaskOrders(tasksRes.data);
      setAccounts(accountsRes.data); // Set renamed state
      setAssignedTasks(assignedTasksRes.data);
      
      // Fetch filtered data
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
      
      // Apply client-side search filter
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

  // Filter change handlers
  const handlePropertyFilterChange = (field, value) => {
    setPropertyFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleTenantFilterChange = (field, value) => {
    setTenantFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleInvoiceFilterChange = (field, value) => {
    setInvoiceFilters(prev => ({ ...prev, [field]: value }));
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
    setCurrentView('invoices');
  };

  const handleClickAgreement = (agreementId) => {
    // Assuming we have a 'agreements' view; if not, implement similar to invoices
    // For now, show in modal or add a new view
    const agreement = [...propertyAgreements, ...tenantAgreements].find(ag => ag.id === agreementId);
    setSelectedAgreement(agreement);
  };

  const handleClickTask = (taskId) => {
    const task = taskOrders.find(t => t.id === taskId);
    setSelectedTask(task);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Property ERP</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-6">
                <button
                  onClick={() => { setCurrentView('dashboard'); setSelectedProperty(null); setSelectedTenant(null); setSelectedAccount(null); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => { setCurrentView('properties'); setSelectedProperty(null); setSelectedTenant(null); setSelectedAccount(null); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'properties' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Properties
                </button>
                <button
                  onClick={() => { setCurrentView('tenants'); setSelectedProperty(null); setSelectedTenant(null); setSelectedAccount(null); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'tenants' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Tenants
                </button>
                <button
                  onClick={() => { setCurrentView('invoices'); setSelectedProperty(null); setSelectedTenant(null); setSelectedAccount(null); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'invoices' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Invoices
                </button>
                <button
                  onClick={() => { setCurrentView('tasks'); setSelectedProperty(null); setSelectedTenant(null); setSelectedAccount(null); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'tasks' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Tasks
                </button>
                <button
                  onClick={() => { setCurrentView('accounts'); setSelectedProperty(null); setSelectedTenant(null); setSelectedAccount(null); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'accounts' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Accounts
                </button>
                {user.role === 'super_admin' && (
                  <button
                    onClick={() => { setCurrentView('users'); setSelectedProperty(null); setSelectedTenant(null); setSelectedAccount(null); }}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentView === 'users' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Users
                  </button>
                )}
              </nav>
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Dashboard Overview</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Property Management Stats */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">P</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Properties</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.total_properties || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">T</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Tenants</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.total_tenants || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-sm">A</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Agreements</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.active_agreements || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-bold text-sm">I</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Unpaid Invoices</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.unpaid_invoices || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Management Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">T</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.total_tasks || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 font-bold text-sm">P</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Tasks</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.pending_tasks || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">I</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.in_progress_tasks || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">C</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.completed_tasks || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Tasks Notifications */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Assigned Tasks</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignedTasks.map((task) => (
                      <tr key={task.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {task.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.due_date ? formatDate(task.due_date) : '-'}
                        </td>
                      </tr>
                    ))}
                    {assignedTasks.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                          No assigned tasks
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Properties */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Properties</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rooms</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Surface</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent per m²</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cold Rent</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {properties.slice(0, 5).map((property) => (
                      <tr key={property.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {property.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPropertyTypeColor(property.property_type)}`}>
                            {property.property_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {`${property.street} ${property.house_nr}, ${property.postcode} ${property.city}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.number_of_rooms}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.surface_area} m²
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.rent_per_sqm ? formatCurrency(property.rent_per_sqm) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.cold_rent ? formatCurrency(property.cold_rent) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentView === 'properties' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Properties (Flache)</h2>
              <button
                onClick={() => setCurrentView('create-property')}
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600"
              >
                Add Property
              </button>
            </div>
            
            {/* Property Filters */}
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Type
                  </label>
                  <select
                    value={propertyFilters.property_type}
                    onChange={(e) => handlePropertyFilterChange('property_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="office">Office</option>
                    <option value="commercial">Commercial</option>
                    <option value="complex">Complex</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Rooms
                  </label>
                  <input
                    type="number"
                    value={propertyFilters.min_rooms}
                    onChange={(e) => handlePropertyFilterChange('min_rooms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Min"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Rooms
                  </label>
                  <input
                    type="number"
                    value={propertyFilters.max_rooms}
                    onChange={(e) => handlePropertyFilterChange('max_rooms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Max"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Surface Area (m²)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={propertyFilters.min_surface}
                      onChange={(e) => handlePropertyFilterChange('min_surface', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Min"
                      min="0"
                      step="0.01"
                    />
                    <input
                      type="number"
                      value={propertyFilters.max_surface}
                      onChange={(e) => handlePropertyFilterChange('max_surface', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Max"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={propertyFilters.archived}
                    onChange={(e) => handlePropertyFilterChange('archived', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Archived</span>
                </label>
                
                <button
                  onClick={() => setPropertyFilters({
                    property_type: 'complex',
                    min_rooms: '',
                    max_rooms: '',
                    min_surface: '',
                    max_surface: '',
                    archived: false
                  })}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rooms</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toilets</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Surface (m²)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent per m²</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cold Rent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {properties.map((property) => (
                      <tr 
                        key={property.id} 
                        onClick={() => setSelectedProperty(property)} 
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {property.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPropertyTypeColor(property.property_type)}`}>
                            {property.property_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {`${property.street} ${property.house_nr}, ${property.postcode} ${property.city}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.floor || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.number_of_rooms}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.num_toilets || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.surface_area}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.rent_per_sqm ? formatCurrency(property.rent_per_sqm) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.cold_rent ? formatCurrency(property.cold_rent) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(property.status)}`}>
                            {property.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.owner_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(property.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedProperty && (
              <div className="mt-6 bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedProperty.name} Details</h3>
                  <button
                    onClick={() => {
                      setSelectedProperty(null);
                      setSelectedAgreement(null);
                      setSelectedInvoice(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>

                {/* Owner Section */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Owner</h4>
                  <p className="text-sm text-gray-600">Name: {selectedProperty.owner_name || '-'}</p>
                  <p className="text-sm text-gray-600">Email: {selectedProperty.owner_email || '-'}</p>
                  <p className="text-sm text-gray-600">Phone: {selectedProperty.owner_phone || '-'}</p>
                </div>

                {/* Tenant Section (if unit) */}
                {['apartment', 'office'].includes(selectedProperty.property_type) && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Tenant</h4>
                    {propertyAgreements.length > 0 ? (
                      propertyAgreements.filter(ag => ag.is_active).map(ag => {
                        const tenant = tenants.find(t => t.id === ag.tenant_id);
                        return tenant ? (
                          <div key={ag.id} className="text-sm text-gray-600">
                            <p>Name: {tenant.first_name} {tenant.last_name}</p>
                            <p>Email: {tenant.email}</p>
                            <p>Phone: {tenant.phone || '-'}</p>
                          </div>
                        ) : (
                          <p key={ag.id} className="text-sm text-gray-600">No tenant details available</p>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-600">No active tenant</p>
                    )}
                  </div>
                )}

                {/* Contracts Section */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Contracts</h4>
                  {propertyAgreements.length > 0 ? (
                    <ul className="space-y-2">
                      {propertyAgreements.map(ag => (
                        <li 
                          key={ag.id} 
                          className="text-sm text-blue-600 cursor-pointer hover:underline"
                          onClick={() => handleClickAgreement(ag.id)}
                        >
                          Contract ID: {ag.id} - Start: {formatDate(ag.start_date)}, Rent: {formatCurrency(ag.monthly_rent)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">No contracts</p>
                  )}
                </div>

                {selectedAgreement && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-md">
                    <h5 className="text-md font-medium text-gray-900 mb-2">Contract Details</h5>
                    <p className="text-sm text-gray-600">Tenant: {getTenantName(selectedAgreement.tenant_id)}</p>
                    <p className="text-sm text-gray-600">Start Date: {formatDate(selectedAgreement.start_date)}</p>
                    <p className="text-sm text-gray-600">End Date: {selectedAgreement.end_date ? formatDate(selectedAgreement.end_date) : 'Ongoing'}</p>
                    <p className="text-sm text-gray-600">Monthly Rent: {formatCurrency(selectedAgreement.monthly_rent)}</p>
                    <p className="text-sm text-gray-600">Deposit: {selectedAgreement.deposit ? formatCurrency(selectedAgreement.deposit) : '-'}</p>
                    <p className="text-sm text-gray-600">Notes: {selectedAgreement.notes || '-'}</p>
                    <p className="text-sm text-gray-600">Active: {selectedAgreement.is_active ? 'Yes' : 'No'}</p>
                    <button 
                      onClick={() => setSelectedAgreement(null)}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Close Details
                    </button>
                  </div>
                )}

                {/* Invoices Section */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Invoices</h4>
                  {propertyInvoices.length > 0 ? (
                    <ul className="space-y-2">
                      {propertyInvoices.map(inv => (
                        <li 
                          key={inv.id} 
                          className="text-sm text-blue-600 cursor-pointer hover:underline"
                          onClick={() => handleClickInvoice(inv.id)}
                        >
                          {inv.invoice_number}: {formatCurrency(inv.amount)}, Status: {inv.status}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">No invoices</p>
                  )}
                </div>

                {selectedInvoice && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-md">
                    <h5 className="text-md font-medium text-gray-900 mb-2">Invoice Details</h5>
                    <p className="text-sm text-gray-600">Invoice Number: {selectedInvoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">Tenant: {getTenantName(selectedInvoice.tenant_id)}</p>
                    <p className="text-sm text-gray-600">Amount: {formatCurrency(selectedInvoice.amount)}</p>
                    <p className="text-sm text-gray-600">Description: {selectedInvoice.description}</p>
                    <p className="text-sm text-gray-600">Status: {selectedInvoice.status}</p>
                    <p className="text-sm text-gray-600">Invoice Date: {formatDate(selectedInvoice.invoice_date)}</p>
                    <p className="text-sm text-gray-600">Due Date: {formatDate(selectedInvoice.due_date)}</p>
                    <button 
                      onClick={() => setSelectedInvoice(null)}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Close Details
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div>
                  <button
                    onClick={() => {
                      setCreateTaskContext({ propertyId: selectedProperty.id, propertyName: selectedProperty.name });
                      setCurrentView('create-task');
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Assign Task
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'tenants' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Tenants (Mieter)</h2>
              <button
                onClick={() => setCurrentView('create-tenant')}
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600"
              >
                Add Tenant
              </button>
            </div>
            
            {/* Tenant Filters */}
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search by Name or Email
                  </label>
                  <input
                    type="text"
                    value={tenantFilters.search}
                    onChange={(e) => handleTenantFilterChange('search', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search tenants..."
                  />
                </div>
                
                <div className="flex items-center space-x-4 pt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tenantFilters.archived}
                      onChange={(e) => handleTenantFilterChange('archived', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Archived</span>
                  </label>
                  
                  <button
                    onClick={() => setTenantFilters({
                      archived: false,
                      search: ''
                    })}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Account</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tenants.map((tenant) => (
                      <tr 
                        key={tenant.id}
                        onClick={() => setSelectedTenant(tenant)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tenant.first_name} {tenant.last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tenant.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tenant.phone || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {tenant.address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tenant.bank_account || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(tenant.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedTenant && (
              <div className="mt-6 bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTenant.first_name} {selectedTenant.last_name} Details</h3>
                  <button
                    onClick={() => {
                      setSelectedTenant(null);
                      setSelectedAgreement(null);
                      setSelectedInvoice(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>

                {/* Personal Info */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Personal Information</h4>
                  <p className="text-sm text-gray-600">Email: {selectedTenant.email}</p>
                  <p className="text-sm text-gray-600">Phone: {selectedTenant.phone || '-'}</p>
                  <p className="text-sm text-gray-600">Address: {selectedTenant.address}</p>
                  <p className="text-sm text-gray-600">Date of Birth: {selectedTenant.date_of_birth ? formatDate(selectedTenant.date_of_birth) : '-'}</p>
                  <p className="text-sm text-gray-600">Gender: {selectedTenant.gender || '-'}</p>
                  <p className="text-sm text-gray-600">Bank Account: {selectedTenant.bank_account || '-'}</p>
                  <p className="text-sm text-gray-600">Notes: {selectedTenant.notes || '-'}</p>
                </div>

                {/* Current Property */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Current Property</h4>
                  {tenantAgreements.find(ag => ag.is_active) ? (
                    <p className="text-sm text-gray-600">{getPropertyName(tenantAgreements.find(ag => ag.is_active).property_id)}</p>
                  ) : (
                    <p className="text-sm text-gray-600">No current property</p>
                  )}
                </div>

                {/* Contracts Section */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Contracts</h4>
                  {tenantAgreements.length > 0 ? (
                    <ul className="space-y-2">
                      {tenantAgreements.map(ag => (
                        <li 
                          key={ag.id} 
                          className="text-sm text-blue-600 cursor-pointer hover:underline"
                          onClick={() => handleClickAgreement(ag.id)}
                        >
                          Contract ID: {ag.id} - Property: {getPropertyName(ag.property_id)}, Start: {formatDate(ag.start_date)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">No contracts</p>
                  )}
                </div>

                {selectedAgreement && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-md">
                    <h5 className="text-md font-medium text-gray-900 mb-2">Contract Details</h5>
                    <p className="text-sm text-gray-600">Property: {getPropertyName(selectedAgreement.property_id)}</p>
                    <p className="text-sm text-gray-600">Start Date: {formatDate(selectedAgreement.start_date)}</p>
                    <p className="text-sm text-gray-600">End Date: {selectedAgreement.end_date ? formatDate(selectedAgreement.end_date) : 'Ongoing'}</p>
                    <p className="text-sm text-gray-600">Monthly Rent: {formatCurrency(selectedAgreement.monthly_rent)}</p>
                    <p className="text-sm text-gray-600">Deposit: {selectedAgreement.deposit ? formatCurrency(selectedAgreement.deposit) : '-'}</p>
                    <p className="text-sm text-gray-600">Notes: {selectedAgreement.notes || '-'}</p>
                    <p className="text-sm text-gray-600">Active: {selectedAgreement.is_active ? 'Yes' : 'No'}</p>
                    <button 
                      onClick={() => setSelectedAgreement(null)}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Close Details
                    </button>
                  </div>
                )}

                {/* Invoices Section */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Invoices</h4>
                  {tenantInvoices.length > 0 ? (
                    <ul className="space-y-2">
                      {tenantInvoices.map(inv => (
                        <li 
                          key={inv.id} 
                          className="text-sm text-blue-600 cursor-pointer hover:underline"
                          onClick={() => handleClickInvoice(inv.id)}
                        >
                          {inv.invoice_number}: {formatCurrency(inv.amount)}, Status: {inv.status}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">No invoices</p>
                  )}
                </div>

                {selectedInvoice && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-md">
                    <h5 className="text-md font-medium text-gray-900 mb-2">Invoice Details</h5>
                    <p className="text-sm text-gray-600">Invoice Number: {selectedInvoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">Property: {getPropertyName(selectedInvoice.property_id)}</p>
                    <p className="text-sm text-gray-600">Amount: {formatCurrency(selectedInvoice.amount)}</p>
                    <p className="text-sm text-gray-600">Description: {selectedInvoice.description}</p>
                    <p className="text-sm text-gray-600">Status: {selectedInvoice.status}</p>
                    <p className="text-sm text-gray-600">Invoice Date: {formatDate(selectedInvoice.invoice_date)}</p>
                    <p className="text-sm text-gray-600">Due Date: {formatDate(selectedInvoice.due_date)}</p>
                    <button 
                      onClick={() => setSelectedInvoice(null)}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Close Details
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentView === 'invoices' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Invoices (Rechnungen)</h2>
              <button
                onClick={() => setCurrentView('create-invoice')}
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600"
              >
                Create Invoice
              </button>
            </div>
            
            {/* Invoice Filters */}
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={invoiceFilters.status}
                    onChange={(e) => handleInvoiceFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant
                  </label>
                  <select
                    value={invoiceFilters.tenant_id}
                    onChange={(e) => handleInvoiceFilterChange('tenant_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Tenants</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.first_name} {tenant.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property
                  </label>
                  <select
                    value={invoiceFilters.property_id}
                    onChange={(e) => handleInvoiceFilterChange('property_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Properties</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={invoiceFilters.archived}
                    onChange={(e) => handleInvoiceFilterChange('archived', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Archived</span>
                </label>
                
                <button
                  onClick={() => setInvoiceFilters({
                    status: '',
                    tenant_id: '',
                    property_id: '',
                    archived: false
                  })}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr 
                        key={invoice.id}
                        onClick={() => setSelectedInvoice(invoice)}
                        className={`cursor-pointer hover:bg-gray-50 ${selectedInvoiceId === invoice.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {invoice.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.due_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedInvoice && (
              <div className="mt-6 bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Invoice {selectedInvoice.invoice_number} Details</h3>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>
                <p className="text-sm text-gray-600">Tenant: {getTenantName(selectedInvoice.tenant_id)}</p>
                <p className="text-sm text-gray-600">Property: {getPropertyName(selectedInvoice.property_id)}</p>
                <p className="text-sm text-gray-600">Amount: {formatCurrency(selectedInvoice.amount)}</p>
                <p className="text-sm text-gray-600">Description: {selectedInvoice.description}</p>
                <p className="text-sm text-gray-600">Status: {selectedInvoice.status}</p>
                <p className="text-sm text-gray-600">Invoice Date: {formatDate(selectedInvoice.invoice_date)}</p>
                <p className="text-sm text-gray-600">Due Date: {formatDate(selectedInvoice.due_date)}</p>
              </div>
            )}
          </div>
        )}

        {currentView === 'tasks' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Task Orders</h2>
              <button
                onClick={() => setCurrentView('create-task')}
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600"
              >
                Create Task Order
              </button>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taskOrders.map((task) => (
                      <tr 
                        key={task.id}
                        onClick={() => handleClickTask(task.id)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {task.subject}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {task.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.budget ? formatCurrency(task.budget) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(task.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedTask && (
              <div className="mt-6 bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTask.subject} Details</h3>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>
                <p className="text-sm text-gray-600">Description: {selectedTask.description}</p>
                <p className="text-sm text-gray-600">Priority: {selectedTask.priority}</p>
                <p className="text-sm text-gray-600">Status: {selectedTask.status.replace('_', ' ')}</p>
                <p className="text-sm text-gray-600">Budget: {selectedTask.budget ? formatCurrency(selectedTask.budget) : '-'}</p>
                <p className="text-sm text-gray-600">Due Date: {selectedTask.due_date ? formatDate(selectedTask.due_date) : '-'}</p>
                <p className="text-sm text-gray-600">Assigned To: {usersList.find(u => u.id === selectedTask.assigned_to)?.full_name || '-'}</p>
                <p className="text-sm text-gray-600">Created By: {usersList.find(u => u.id === selectedTask.created_by)?.full_name || '-'}</p>
              </div>
            )}
          </div>
        )}

        {currentView === 'accounts' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Accounts</h2>
              <button
                onClick={() => setCurrentView('create-account')}
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600"
              >
                Add Account
              </button>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accounts.map((account) => (
                      <tr 
                        key={account.id}
                        onClick={() => setSelectedAccount(account)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {account.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {account.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {account.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {account.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(account.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedAccount && (
              <div className="mt-6 bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedAccount.name} Details</h3>
                  <button
                    onClick={() => setSelectedAccount(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>

                {/* Account Info */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Information</h4>
                  <p className="text-sm text-gray-600">Company: {selectedAccount.company}</p>
                  <p className="text-sm text-gray-600">Email: {selectedAccount.email}</p>
                  <p className="text-sm text-gray-600">Phone: {selectedAccount.phone || '-'}</p>
                  <p className="text-sm text-gray-600">Address: {selectedAccount.address || '-'}</p>
                </div>

                {/* Tasks Section */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Tasks</h4>
                  {accountTasks.length > 0 ? (
                    <ul className="space-y-2">
                      {accountTasks.map(task => (
                        <li 
                          key={task.id} 
                          className="text-sm text-blue-600 cursor-pointer hover:underline"
                          onClick={() => handleClickTask(task.id)}
                        >
                          {task.subject} - Status: {task.status}, Priority: {task.priority}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">No tasks</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'users' && user.role === 'super_admin' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Users</h2>
              <button
                onClick={() => setCurrentView('create-user')}
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600"
              >
                Create User
              </button>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usersList.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {u.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.is_active ? 'Yes' : 'No'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentView === 'create-user' && (
          <UserForm 
            onBack={() => setCurrentView('users')}
            onSuccess={() => {
              fetchUsers();
              setCurrentView('users');
            }}
          />
        )}

        {currentView === 'edit-user' && selectedUser && (
          <UserForm 
            onBack={() => {
              setCurrentView('users');
              setSelectedUser(null);
            }}
            onSuccess={() => {
              fetchUsers();
              setCurrentView('users');
              setSelectedUser(null);
            }}
            initialData={selectedUser}
          />
        )}

        {/* Create Property Form */}
        {currentView === 'create-property' && (
          <CreatePropertyForm 
            onBack={() => setCurrentView('properties')}
            onSuccess={() => {
              fetchData();
              setCurrentView('properties');
            }}
            properties={properties}
          />
        )}

        {/* Create Tenant Form */}
        {currentView === 'create-tenant' && (
          <CreateTenantForm 
            onBack={() => setCurrentView('tenants')}
            onSuccess={() => {
              fetchData();
              setCurrentView('tenants');
            }}
          />
        )}

        {/* Create Invoice Form */}
        {currentView === 'create-invoice' && (
          <CreateInvoiceForm 
            onBack={() => setCurrentView('invoices')}
            onSuccess={() => {
              fetchData();
              setCurrentView('invoices');
            }}
            properties={properties}
            tenants={tenants}
          />
        )}

        {/* Create Task Form */}
        {currentView === 'create-task' && (
          <CreateTaskForm 
            onBack={() => setCurrentView('tasks')}
            onSuccess={() => {
              fetchData();
              setCurrentView('tasks');
            }}
            customers={accounts} // Pass renamed accounts
            users={usersList}
            context={createTaskContext}
          />
        )}

        {/* Create Account Form (renamed from Customer) */}
        {currentView === 'create-account' && (
          <CreateCustomerForm // Component name remains, but UI can be updated to say "Account"
            onBack={() => setCurrentView('accounts')}
            onSuccess={() => {
              fetchData();
              setCurrentView('accounts');
            }}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;