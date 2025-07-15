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
  handleNav,
  formatDate,
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
          <div className="flex space-x-2">
            <button onClick={() => handleNav('create-rental-agreement')} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
              {t('Create Rental Agreement')}
            </button>
            <button onClick={() => handleNav('create-tenant')} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
              {t('Add Tenant')}
            </button>
          </div>
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
                <tr key={tenant.id} onClick={() => handleNav(`tenants/${tenant.id}`)} className="cursor-pointer hover:bg-gray-50">
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
    </div>
  );
};

export default TenantsView;