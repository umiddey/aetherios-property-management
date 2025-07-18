// Utility functions for exporting data

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Array of column definitions with {key, label}
 */
export const exportToCSV = (data, filename, columns) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create CSV header
  const headers = columns.map(col => col.label).join(',');
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key] || '';
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value).replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    }).join(',');
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows].join('\n');
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Export dashboard statistics to CSV
 * @param {Object} stats - Statistics object from dashboard
 */
export const exportDashboardStats = (stats) => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const statsArray = [
    { metric: 'Total Properties', value: stats?.total_properties || 0 },
    { metric: 'Total Tenants', value: stats?.total_tenants || 0 },
    { metric: 'Active Agreements', value: stats?.active_agreements || 0 },
    { metric: 'Unpaid Invoices', value: stats?.unpaid_invoices || 0 },
    { metric: 'Total Tasks', value: stats?.total_tasks || 0 },
    { metric: 'Pending Tasks', value: stats?.pending_tasks || 0 },
    { metric: 'In Progress Tasks', value: stats?.in_progress_tasks || 0 },
    { metric: 'Completed Tasks', value: stats?.completed_tasks || 0 },
    { metric: 'Total Customers', value: stats?.total_customers || 0 },
    { metric: 'Total Invoices', value: stats?.total_invoices || 0 }
  ];

  const columns = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' }
  ];

  exportToCSV(statsArray, `dashboard-stats-${currentDate}`, columns);
};

/**
 * Export properties to CSV
 * @param {Array} properties - Array of property objects
 */
export const exportProperties = (properties) => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'property_type', label: 'Type' },
    { key: 'street', label: 'Street' },
    { key: 'house_nr', label: 'House Number' },
    { key: 'postcode', label: 'Postcode' },
    { key: 'city', label: 'City' },
    { key: 'number_of_rooms', label: 'Rooms' },
    { key: 'surface_area', label: 'Surface Area' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created Date' }
  ];

  exportToCSV(properties, `properties-${currentDate}`, columns);
};

/**
 * Export tenants to CSV
 * @param {Array} tenants - Array of tenant objects
 */
export const exportTenants = (tenants) => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'date_of_birth', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'created_at', label: 'Created Date' }
  ];

  exportToCSV(tenants, `tenants-${currentDate}`, columns);
};

/**
 * Export invoices to CSV
 * @param {Array} invoices - Array of invoice objects
 */
export const exportInvoices = (invoices) => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const columns = [
    { key: 'invoice_number', label: 'Invoice Number' },
    { key: 'tenant_id', label: 'Tenant ID' },
    { key: 'property_id', label: 'Property ID' },
    { key: 'amount', label: 'Amount' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'invoice_date', label: 'Invoice Date' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'created_at', label: 'Created Date' }
  ];

  exportToCSV(invoices, `invoices-${currentDate}`, columns);
};

/**
 * Export tasks to CSV
 * @param {Array} tasks - Array of task objects
 */
export const exportTasks = (tasks) => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'subject', label: 'Subject' },
    { key: 'description', label: 'Description' },
    { key: 'customer_id', label: 'Customer ID' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'budget', label: 'Budget' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'created_at', label: 'Created Date' }
  ];

  exportToCSV(tasks, `tasks-${currentDate}`, columns);
};