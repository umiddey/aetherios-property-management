// Utility functions for exporting data
import jsPDF from 'jspdf';

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

/**
 * Generate and download PDF documents for different entity types
 * @param {Object} data - The entity data (invoice, contract, etc.)
 * @param {string} type - Document type ('invoice', 'contract', 'task', etc.)
 * @param {Object} options - Additional options like related entities
 */
export const generatePDF = (data, type, options = {}) => {
  if (!data) {
    console.error('No data provided for PDF generation');
    return;
  }

  const doc = new jsPDF();
  const currentDate = new Date();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Helper function to add text with word wrapping
  const addWrappedText = (text, x, y, maxWidth) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * 7); // Return new Y position
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  let yPosition = margin;
  let filename = '';

  switch (type) {
    case 'invoice':
      filename = `invoice_${data.invoice_number || data.id?.slice(0, 8)}.pdf`;
      yPosition = generateInvoicePDF(doc, data, options, yPosition, margin, contentWidth, formatCurrency, formatDate, addWrappedText);
      break;
      
    case 'contract':
      filename = `contract_${data.id?.slice(0, 8)}_${data.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'document'}.pdf`;
      yPosition = generateContractPDF(doc, data, options, yPosition, margin, contentWidth, formatCurrency, formatDate, addWrappedText);
      break;
      
    default:
      console.error(`Unsupported PDF type: ${type}`);
      return;
  }

  // Add footer
  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Generated on: ${currentDate.toLocaleDateString('de-DE')} ${currentDate.toLocaleTimeString('de-DE')}`, margin, footerY);
  doc.text('ERP System', pageWidth - margin - 30, footerY);

  // Save the PDF
  doc.save(filename);
};

/**
 * Generate Invoice PDF content
 * @private
 */
const generateInvoicePDF = (doc, invoice, options, yPosition, margin, contentWidth, formatCurrency, formatDate, addWrappedText) => {
  const { property, tenant, contract } = options;

  // Header
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 102, 204); // Blue color
  doc.text('INVOICE', margin, yPosition);
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0);
  doc.text(`#${invoice.invoice_number || 'N/A'}`, margin + 80, yPosition);
  yPosition += 20;

  // Status Badge
  doc.setFontSize(12);
  const statusColors = {
    'paid': [34, 197, 94],    // Green
    'sent': [59, 130, 246],   // Blue  
    'draft': [107, 114, 128], // Gray
    'overdue': [239, 68, 68]  // Red
  };
  const statusColor = statusColors[invoice.status] || [107, 114, 128];
  doc.setTextColor(...statusColor);
  doc.text(`Status: ${invoice.status?.toUpperCase() || 'UNKNOWN'}`, margin, yPosition);
  doc.setTextColor(0);
  yPosition += 15;

  // Invoice Details Section
  doc.setFont(undefined, 'bold');
  doc.text('Invoice Details', margin, yPosition);
  doc.setFont(undefined, 'normal');
  yPosition += 10;

  const invoiceDetails = [
    ['Amount:', formatCurrency(invoice.amount)],
    ['Invoice Date:', formatDate(invoice.invoice_date)],
    ['Due Date:', formatDate(invoice.due_date)],
  ];

  invoiceDetails.forEach(([label, value]) => {
    doc.text(label, margin, yPosition);
    doc.text(value, margin + 60, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Contract Information (if available)
  if (contract) {
    doc.setFont(undefined, 'bold');
    doc.text('Contract Information', margin, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;

    doc.setFillColor(240, 248, 255); // Light blue background
    doc.rect(margin, yPosition - 5, contentWidth, 25, 'F');
    
    doc.text('🔗 Contract-Based Invoice', margin + 5, yPosition + 5);
    doc.text(`Contract: ${contract.title || 'N/A'}`, margin + 5, yPosition + 12);
    doc.text(`Type: ${contract.contract_type || 'N/A'}`, margin + 5, yPosition + 19);
    
    yPosition += 30;
  }

  // Description
  if (invoice.description) {
    doc.setFont(undefined, 'bold');
    doc.text('Description', margin, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    yPosition = addWrappedText(invoice.description, margin, yPosition, contentWidth);
    yPosition += 10;
  }

  // Property Information
  if (property) {
    doc.setFont(undefined, 'bold');
    doc.text('Property Information', margin, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;

    doc.text(`Property: ${property.name || 'N/A'}`, margin, yPosition);
    yPosition += 8;
    if (property.street || property.house_nr || property.city) {
      const address = `${property.street || ''} ${property.house_nr || ''}, ${property.postcode || ''} ${property.city || ''}`.trim();
      yPosition = addWrappedText(`Address: ${address}`, margin, yPosition, contentWidth);
    }
    yPosition += 10;
  }

  // Tenant Information
  if (tenant) {
    doc.setFont(undefined, 'bold');
    doc.text('Tenant Information', margin, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;

    doc.text(`Name: ${tenant.first_name || ''} ${tenant.last_name || ''}`, margin, yPosition);
    yPosition += 8;
    if (tenant.email) {
      doc.text(`Email: ${tenant.email}`, margin, yPosition);
      yPosition += 8;
    }
    if (tenant.phone) {
      doc.text(`Phone: ${tenant.phone}`, margin, yPosition);
      yPosition += 8;
    }
    yPosition += 10;
  }

  // Legal Compliance Notice
  if (contract) {
    doc.setFillColor(252, 240, 255); // Light purple background
    doc.rect(margin, yPosition - 5, contentWidth, 20, 'F');
    doc.setFontSize(10);
    doc.setTextColor(88, 28, 135); // Purple text
    doc.text('📋 Legal Compliance: This invoice was automatically generated from the contract above,', margin + 5, yPosition + 5);
    doc.text('ensuring complete audit trail and legal compliance.', margin + 5, yPosition + 12);
    doc.setTextColor(0);
    doc.setFontSize(12);
    yPosition += 25;
  }

  return yPosition;
};

/**
 * Generate Contract PDF content  
 * @private
 */
const generateContractPDF = (doc, contract, options, yPosition, margin, contentWidth, formatCurrency, formatDate, addWrappedText) => {
  const { relatedProperty, relatedTenant } = options;

  // Header
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 102, 204); // Blue color
  doc.text('CONTRACT', margin, yPosition);
  yPosition += 15;

  // Contract Title
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0);
  if (contract.title) {
    yPosition = addWrappedText(contract.title, margin, yPosition, contentWidth);
  }
  yPosition += 10;

  // Contract ID
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(128);
  doc.text(`Contract ID: ${contract.id || 'N/A'}`, margin, yPosition);
  yPosition += 15;

  // Basic Information
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0);
  doc.text('Contract Details', margin, yPosition);
  doc.setFont(undefined, 'normal');
  yPosition += 10;

  const contractDetails = [
    ['Type:', contract.contract_type || 'N/A'],
    ['Status:', contract.status || 'N/A'],
    ['Start Date:', formatDate(contract.start_date)],
    ['End Date:', formatDate(contract.end_date)],
    ['Value:', formatCurrency(contract.value)],
    ['Currency:', contract.currency || 'EUR']
  ];

  contractDetails.forEach(([label, value]) => {
    doc.text(label, margin, yPosition);
    doc.text(value, margin + 60, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Description
  if (contract.description) {
    doc.setFont(undefined, 'bold');
    doc.text('Description', margin, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    yPosition = addWrappedText(contract.description, margin, yPosition, contentWidth);
    yPosition += 10;
  }

  // Parties
  if (contract.parties && contract.parties.length > 0) {
    doc.setFont(undefined, 'bold');
    doc.text('Contract Parties', margin, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;

    contract.parties.forEach((party, index) => {
      doc.text(`${index + 1}. ${party.name || 'N/A'} (${party.role || 'N/A'})`, margin, yPosition);
      yPosition += 8;
      if (party.contact_email) {
        doc.text(`   Email: ${party.contact_email}`, margin, yPosition);
        yPosition += 8;
      }
      if (party.contact_phone) {
        doc.text(`   Phone: ${party.contact_phone}`, margin, yPosition);
        yPosition += 8;
      }
      yPosition += 5;
    });
  }

  // Terms
  if (contract.terms) {
    doc.setFont(undefined, 'bold');
    doc.text('Terms & Conditions', margin, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    yPosition = addWrappedText(contract.terms, margin, yPosition, contentWidth);
    yPosition += 10;
  }

  // Related Entities
  if (relatedProperty || relatedTenant) {
    doc.setFont(undefined, 'bold');
    doc.text('Related Information', margin, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;

    if (relatedProperty) {
      doc.text(`Property: ${relatedProperty.name || 'N/A'}`, margin, yPosition);
      yPosition += 8;
      if (relatedProperty.address) {
        yPosition = addWrappedText(`Address: ${relatedProperty.address}`, margin, yPosition, contentWidth);
      }
    }

    if (relatedTenant) {
      doc.text(`Tenant: ${relatedTenant.first_name || ''} ${relatedTenant.last_name || ''}`, margin, yPosition);
      yPosition += 8;
      if (relatedTenant.email) {
        doc.text(`Email: ${relatedTenant.email}`, margin, yPosition);
        yPosition += 8;
      }
    }
  }

  return yPosition;
};