// src/components/InvoicesView.js - ENTERPRISE INVOICE MANAGEMENT
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Pagination from './Pagination';
import { exportInvoices } from '../utils/exportUtils';
import EnterpriseDataTable from './ui/EnterpriseDataTable';
import EnterpriseSearchBar from './ui/EnterpriseSearchBar';
import { INVOICES_TABLE_COLUMNS, INVOICES_BASIC_FILTERS } from './InvoicesTableConfig.jsx';

const InvoicesView = ({
  invoiceFilters,
  handleInvoiceFilterChange,
  invoices,
  totalPages,
  currentPage,
  onPageChange,
  setSelectedInvoice,
  selectedInvoice,
  selectedInvoiceId,
  tenants,
  properties,
  getTenantName,
  getPropertyName,
  handleNav,
  getStatusColor,
  formatDate,
  formatCurrency,
  logAction
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [density, setDensity] = useState('compact');
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  // If selectedInvoiceId is set (from navigation), find the invoice
  useEffect(() => {
    if (selectedInvoiceId && !selectedInvoice) {
      const invoice = invoices.find(inv => inv.id === parseInt(selectedInvoiceId));
      if (invoice) {
        setSelectedInvoice(invoice);
      }
    }
  }, [selectedInvoiceId, invoices, selectedInvoice, setSelectedInvoice]);

  // Enhanced column configuration with context data
  const enhancedColumns = useMemo(() => {
    return INVOICES_TABLE_COLUMNS.map(column => ({
      ...column,
      render: column.render ? (value, row) => 
        column.render(value, row, { 
          getTenantName, 
          getPropertyName, 
          formatCurrency, 
          formatDate, 
          getStatusColor, 
          handleNav 
        }) : undefined
    }));
  }, [getTenantName, getPropertyName, formatCurrency, formatDate, getStatusColor, handleNav]);

  const handleSort = (config) => {
    setSortConfig(config);
  };

  const handleInvoiceClick = (invoice) => {
    handleNav(`invoices/${invoice.id}`);
  };

  const handleExport = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'invoice_number', label: 'Invoice Number' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'created_at', label: 'Created Date' }
    ];
    exportInvoices(invoices, `invoices-${currentDate}`, columns);
  };

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {t('invoices.title')}
                </h1>
                <p className="text-gray-600 text-sm">{t('invoices.professionalInvoiceManagement')}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleExport}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{t('common.export')}</span>
              </button>
              <button 
                onClick={() => handleNav('create-invoice')} 
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>{t('invoices.createInvoice')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Search */}
      <div>
        <EnterpriseSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t('invoices.searchPlaceholder') || 'Search invoices, customers, amounts...'}
          className="max-w-md"
        />
      </div>

      {/* Enterprise Data Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <EnterpriseDataTable
          data={invoices}
          columns={enhancedColumns}
          sortConfig={sortConfig}
          onSort={handleSort}
          onRowClick={handleInvoiceClick}
          loading={false}
          density={density}
          onDensityChange={setDensity}
          selectable={true}
          onSelectionChange={setSelectedInvoices}
          searchTerm={searchTerm}
        />
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />

      {/* Selected Invoice Details (Legacy) */}
      {selectedInvoice && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('invoices.invoiceDetails')} - {selectedInvoice.invoice_number || selectedInvoice.id}
          </h3>
          <div className="space-y-4">
            <p><strong>{t('invoices.customer')}:</strong> {getTenantName(selectedInvoice.tenant_id) || selectedInvoice.customer_name}</p>
            <p><strong>{t('invoices.amount')}:</strong> {formatCurrency(selectedInvoice.total_amount || selectedInvoice.amount)}</p>
            <p><strong>{t('invoices.status')}:</strong> {selectedInvoice.status}</p>
            {selectedInvoice.due_date && (
              <p><strong>{t('invoices.dueDate')}:</strong> {formatDate(selectedInvoice.due_date)}</p>
            )}
            <p><strong>{t('common.created')}:</strong> {formatDate(selectedInvoice.created_at)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesView;