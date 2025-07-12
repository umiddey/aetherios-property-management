// src/components/TenantsView.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';

const TenantsView = ({
  tenantFilters,
  handleTenantFilterChange,
  tenants,
  totalPages,
  currentPage,
  onPageChange,
  setSelectedTenant,
  selectedTenant,
  tenantAgreements,
  tenantInvoices,
  getPropertyName,
  getTenantName,
  selectedAgreement,
  setSelectedAgreement,
  selectedInvoice,
  setSelectedInvoice,
  handleClickInvoice,
  handleClickAgreement,
  handleNav,
  formatDate,
  formatCurrency,
  t,
  logAction
}) => {
  const { t: translate } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Filters')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder={t('Search by Name or Email')}
            value={tenantFilters.search}
            onChange={(e) => handleTenantFilterChange('search', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={tenantFilters.archived}
              onChange={(e) => handleTenantFilterChange('archived', e.target.checked)}
              className="mr-2"
            />
            {t('Show Archived')}
          </label>
        </div>
      </div>

      {/* Tenant List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">{t('Tenants')}</h2>
          <button onClick={() => handleNav('create-tenant')} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            {t('Add Tenant')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Phone')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Created')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map(tenant => (
                <tr key={tenant.id} onClick={() => setSelectedTenant(tenant)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tenant.first_name} {tenant.last_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(tenant.created_at)}</td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">{t('No tenants found')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />

      {/* Selected Tenant Details */}
      {selectedTenant && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Tenant Details')} - {selectedTenant.first_name} {selectedTenant.last_name}</h3>
          <div className="space-y-4">
            <p><strong>{t('Email')}:</strong> {selectedTenant.email}</p>
            <p><strong>{t('Phone')}:</strong> {selectedTenant.phone}</p>
            <p><strong>{t('Address')}:</strong> {selectedTenant.address}</p>
            <p><strong>{t('Date of Birth')}:</strong> {formatDate(selectedTenant.date_of_birth)}</p>
            <p><strong>{t('Gender')}:</strong> {selectedTenant.gender}</p>
            <p><strong>{t('Bank Account')}:</strong> {selectedTenant.bank_account}</p>
            <p><strong>{t('Notes')}:</strong> {selectedTenant.notes}</p>
          </div>

          <h4 className="text-md font-semibold text-gray-900 mt-6 mb-2">{t('Rental Agreements')}</h4>
          <ul className="space-y-2">
            {tenantAgreements.map(agreement => (
              <li key={agreement.id} onClick={() => handleClickAgreement(agreement.id)} className="border-b py-2 cursor-pointer hover:bg-gray-50">
                <p><strong>{getPropertyName(agreement.property_id)}:</strong> {formatDate(agreement.start_date)} - {agreement.end_date ? formatDate(agreement.end_date) : t('Ongoing')}</p>
                <p>{formatCurrency(agreement.monthly_rent)} / month</p>
              </li>
            ))}
            {tenantAgreements.length === 0 && <p className="text-sm text-gray-500">{t('No agreements')}</p>}
          </ul>

          {selectedAgreement && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h5 className="font-semibold">{t('Agreement Details')}</h5>
              <p><strong>{t('Property')}:</strong> {getPropertyName(selectedAgreement.property_id)}</p>
              <p><strong>{t('Start Date')}:</strong> {formatDate(selectedAgreement.start_date)}</p>
              <p><strong>{t('End Date')}:</strong> {selectedAgreement.end_date ? formatDate(selectedAgreement.end_date) : t('Indefinite')}</p>
              <p><strong>{t('Monthly Rent')}:</strong> {formatCurrency(selectedAgreement.monthly_rent)}</p>
              <p><strong>{t('Deposit')}:</strong> {formatCurrency(selectedAgreement.deposit)}</p>
              <p><strong>{t('Notes')}:</strong> {selectedAgreement.notes}</p>
            </div>
          )}

          <h4 className="text-md font-semibold text-gray-900 mt-6 mb-2">{t('Invoices')}</h4>
          <ul className="space-y-2">
            {tenantInvoices.map(invoice => (
              <li key={invoice.id} onClick={() => handleClickInvoice(invoice.id)} className="border-b py-2 cursor-pointer hover:bg-gray-50">
                <p><strong>{invoice.invoice_number}:</strong> {formatCurrency(invoice.amount)} - {invoice.status}</p>
                <p>{t('Due')}: {formatDate(invoice.due_date)}</p>
              </li>
            ))}
            {tenantInvoices.length === 0 && <p className="text-sm text-gray-500">{t('No invoices')}</p>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TenantsView;