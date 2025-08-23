// src/components/TenantsView.js
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Pagination from './Pagination';
import { exportTenants } from '../utils/exportUtils';

const TenantsView = ({
  tenantFilters,
  handleTenantFilterChange,
  tenants,
  totalPages,
  currentPage,
  onPageChange,
  handleNav,
  formatDate,
  logAction
}) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          {t('tenants.filters')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('tenants.searchPlaceholder')}
              value={tenantFilters.search}
              onChange={(e) => handleTenantFilterChange('search', e.target.value)}
              className="pl-10 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 w-full"
            />
          </div>
          <label className="flex items-center bg-gray-50 px-4 py-3 rounded-md hover:bg-gray-100 transition-colors duration-200 cursor-pointer">
            <input
              type="checkbox"
              checked={tenantFilters.archived}
              onChange={(e) => handleTenantFilterChange('archived', e.target.checked)}
              className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">{t('tenants.showArchived')}</span>
          </label>
        </div>
      </div>

      {/* Tenant List */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-blue-600 from-emerald-50 to-green-50 border-b border-emerald-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {t('tenants.title')}
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => exportTenants(tenants)}
                className="bg-blue-600 from-gray-500 to-gray-600 text-white px-4 py-2 rounded-md hover:from-gray-600 hover:to-gray-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('common.export')}
              </button>
              <button onClick={() => handleNav('create-tenant')} className="bg-blue-600 from-purple-500 to-pink-500 text-white px-4 py-2 rounded-md hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl">
                {t('tenants.addTenant')}
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-blue-600 from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tenants.firstName')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tenants.lastName')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tenants.email')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tenants.status')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {tenants.map(tenant => (
                <tr key={tenant.id} onClick={() => handleNav(`tenants/${tenant.id}`)} className="cursor-pointer hover:bg-blue-600 hover:from-emerald-50 hover:to-green-50 transition-all duration-300 hover:shadow-md">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 from-purple-500 to-pink-500 rounded-md flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900">
                          {tenant.first_name}
                        </span>
                        <p className="text-xs text-gray-500">ID: {tenant.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="font-medium">{tenant.last_name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      <a href={`mailto:${tenant.email}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:text-blue-800 transition-colors duration-200">
                        {tenant.email}
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {tenant.status === 'active' ? t('tenants.active') : t('tenants.inactive')}
                    </span>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-sm font-medium">{t('tenants.noTenantsFound')}</p>
                    </div>
                  </td>
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