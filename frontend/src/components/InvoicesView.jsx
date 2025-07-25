// src/components/InvoicesView.js
import React, { useState, useEffect} from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Pagination from './Pagination';
import { exportInvoices } from '../utils/exportUtils';

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

  // If selectedInvoiceId is set (from navigation), find the invoice
  useEffect(() => {
    if (selectedInvoiceId && !selectedInvoice) {
      const invoice = invoices.find(inv => inv.id === selectedInvoiceId);
      if (invoice) setSelectedInvoice(invoice);
    }
  }, [selectedInvoiceId, invoices, selectedInvoice, setSelectedInvoice]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-100 p-6">
      {/* Modern Header with Glassmorphism */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  📊 {t('invoices.title')}
                </h1>
                <p className="text-gray-600 mt-1">Professional invoice management system</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => exportInvoices(invoices)}
                className="group relative px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>📊 {t('common.export')}</span>
                </div>
              </button>
              <button onClick={() => handleNav('create-invoice')} className="group relative px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>✨ {t('invoices.createInvoice')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters with Glassmorphism */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl blur-lg opacity-10"></div>
        <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-xl">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">🔍 Smart Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">⚡</span>
                Status
              </label>
              <div className="relative">
                <select
                  value={invoiceFilters.status}
                  onChange={(e) => handleInvoiceFilterChange('status', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                >
                  <option value="">{t('invoices.allStatuses')}</option>
                  <option value="draft">Entwurf</option>
                  <option value="sent">Versendet</option>
                  <option value="paid">{t('invoices.paid')}</option>
                  <option value="overdue">{t('invoices.overdue')}</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">👥</span>
                Tenant
              </label>
              <div className="relative">
                <select
                  value={invoiceFilters.tenant_id}
                  onChange={(e) => handleInvoiceFilterChange('tenant_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                >
                  <option value="">{t('invoices.allTenants')}</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>{getTenantName(tenant.id)}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">🏠</span>
                Property
              </label>
              <div className="relative">
                <select
                  value={invoiceFilters.property_id}
                  onChange={(e) => handleInvoiceFilterChange('property_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                >
                  <option value="">{t('invoices.allProperties')}</option>
                  {properties.map(prop => (
                    <option key={prop.id} value={prop.id}>{getPropertyName(prop.id)}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">🗃️</span>
                Archive
              </label>
              <label className="flex items-center bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border-2 border-gray-200 hover:bg-white/90 transition-all duration-300 cursor-pointer group-hover:shadow-lg">
                <input
                  type="checkbox"
                  checked={invoiceFilters.archived}
                  onChange={(e) => handleInvoiceFilterChange('archived', e.target.checked)}
                  className="mr-3 h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded-lg"
                />
                <span className="text-sm font-medium text-gray-700">{t('invoices.showArchived')}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Invoices Grid */}
      {invoices.length === 0 ? (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 rounded-3xl blur-lg opacity-10"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-16 border border-white/30 shadow-xl text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              📊 {t('invoices.noInvoicesFound')}
            </h3>
            <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
              No invoices match your current filters. Create your first invoice to get started.
            </p>
            <button
              onClick={() => handleNav('create-invoice')}
              className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>✨ {t('invoices.createInvoice')}</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {invoices.map((invoice, index) => {
            const getStatusEmoji = (status) => {
              switch (status) {
                case 'draft': return '✏️';
                case 'sent': return '📨';
                case 'paid': return '✅';
                case 'overdue': return '⚠️';
                default: return '📄';
              }
            };

            const getStatusGradient = (status) => {
              switch (status) {
                case 'draft': return 'from-gray-500 to-slate-600';
                case 'sent': return 'from-blue-500 to-indigo-600';
                case 'paid': return 'from-green-500 to-emerald-600';
                case 'overdue': return 'from-red-500 to-rose-600';
                default: return 'from-gray-500 to-slate-600';
              }
            };

            return (
              <div
                key={invoice.id}
                onClick={() => handleNav(`invoices/${invoice.id}`)}
                className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl hover:shadow-2xl transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 via-red-500/5 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Floating Elements */}
                <div className="absolute top-4 right-4 w-6 h-6 bg-orange-400/20 rounded-full blur-sm group-hover:animate-pulse"></div>
                <div className="absolute bottom-6 left-6 w-4 h-4 bg-red-500/20 rounded-full blur-sm group-hover:animate-bounce"></div>

                {/* Invoice Header */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-4 bg-gradient-to-br ${getStatusGradient(invoice.status)} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-2xl">{getStatusEmoji(invoice.status)}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-orange-600 transition-colors duration-300">
                          {invoice.invoice_number}
                        </h3>
                        <p className="text-gray-500 text-sm">ID: {invoice.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)} shadow-sm`}>
                        {getStatusEmoji(invoice.status)} {invoice.status}
                      </span>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="space-y-4">
                    {/* Amount */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-green-700 mb-2 flex items-center">
                        <span className="mr-2">💰</span>
                        {t('invoices.amount')}
                      </div>
                      <div className="text-2xl font-bold text-green-800">{formatCurrency(invoice.amount)}</div>
                    </div>

                    {/* NEW: Contract Information */}
                    {invoice.contract_id && (
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
                        <div className="text-xs font-semibold text-green-700 mb-2 flex items-center">
                          <span className="mr-2">📄</span>
                          Contract-Based Invoice
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-800">
                            ID: {invoice.contract_id.slice(0, 8)}...
                          </div>
                          <div className="flex items-center space-x-2">
                            {invoice.invoice_type && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                invoice.invoice_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {invoice.invoice_type === 'credit' ? '⬆️ Credit' : '⬇️ Debit'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tenant and Property Row */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-blue-50/50 rounded-xl p-4">
                        <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center">
                          <span className="mr-2">👥</span>
                          {t('invoices.tenant')}
                        </div>
                        <div className="text-sm font-medium text-gray-800">{getTenantName(invoice.tenant_id)}</div>
                      </div>
                      
                      <div className="bg-purple-50/50 rounded-xl p-4">
                        <div className="text-xs font-semibold text-purple-700 mb-2 flex items-center">
                          <span className="mr-2">🏠</span>
                          {t('invoices.property')}
                        </div>
                        <div className="text-sm font-medium text-gray-800">{getPropertyName(invoice.property_id)}</div>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="bg-orange-50/50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-orange-700 mb-2 flex items-center">
                        <span className="mr-2">📅</span>
                        {t('invoices.dueDate')}
                      </div>
                      <div className="text-sm font-medium text-gray-800">{formatDate(invoice.due_date)}</div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 border-t border-gray-200/50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNav(`invoices/${invoice.id}`);
                        }}
                        className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>👁️ View Invoice</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};

export default InvoicesView;