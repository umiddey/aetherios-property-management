// src/components/InvoicesView.js
import React, { useState, useEffect} from 'react';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';

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
  t,
  logAction
}) => {
  const { t: translate } = useTranslation();

  // If selectedInvoiceId is set (from navigation), find the invoice
  useEffect(() => {
    if (selectedInvoiceId && !selectedInvoice) {
      const invoice = invoices.find(inv => inv.id === selectedInvoiceId);
      if (invoice) setSelectedInvoice(invoice);
    }
  }, [selectedInvoiceId, invoices, selectedInvoice, setSelectedInvoice]);

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Filters')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={invoiceFilters.status}
            onChange={(e) => handleInvoiceFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('All Statuses')}</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={invoiceFilters.tenant_id}
            onChange={(e) => handleInvoiceFilterChange('tenant_id', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('All Tenants')}</option>
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>{getTenantName(tenant.id)}</option>
            ))}
          </select>
          <select
            value={invoiceFilters.property_id}
            onChange={(e) => handleInvoiceFilterChange('property_id', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('All Properties')}</option>
            {properties.map(prop => (
              <option key={prop.id} value={prop.id}>{getPropertyName(prop.id)}</option>
            ))}
          </select>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={invoiceFilters.archived}
              onChange={(e) => handleInvoiceFilterChange('archived', e.target.checked)}
              className="mr-2"
            />
            {t('Show Archived')}
          </label>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">{t('Invoices')}</h2>
          <button onClick={() => handleNav('create-invoice')} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            {t('Create Invoice')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Invoice #')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Tenant')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Property')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Amount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Due Date')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map(invoice => (
                <tr key={invoice.id} onClick={() => handleNav(`invoices/${invoice.id}`)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getTenantName(invoice.tenant_id)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getPropertyName(invoice.property_id)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.due_date)}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">{t('No invoices found')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};

export default InvoicesView;