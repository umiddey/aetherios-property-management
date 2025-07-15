// src/components/AccountsView.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { exportToCSV } from '../utils/exportUtils';

const AccountsView = ({
  accounts,
  totalPages,
  currentPage,
  onPageChange,
  selectedAccount,
  setSelectedAccount,
  accountTasks,
  handleClickTask,
  handleNav,
  formatDate,
  t,
  logAction
}) => {
  const { t: translate } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Account List */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-green-50 border-b border-teal-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {t('Accounts')}
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  const currentDate = new Date().toISOString().split('T')[0];
                  const columns = [
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: 'Name' },
                    { key: 'company', label: 'Company' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'address', label: 'Address' },
                    { key: 'created_at', label: 'Created Date' }
                  ];
                  exportToCSV(accounts, `accounts-${currentDate}`, columns);
                }}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('Export')}
              </button>
              <button onClick={() => handleNav('create-account')} className="bg-gradient-to-r from-teal-500 to-green-500 text-white px-4 py-2 rounded-xl hover:from-teal-600 hover:to-green-600 transition-all duration-300 shadow-lg hover:shadow-xl">
                {t('Add Account')}
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('Name')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('Company')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('Contact')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('Phone')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('Created')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {accounts.map(account => (
                <tr key={account.id} className="cursor-pointer hover:bg-gradient-to-r hover:from-teal-50 hover:to-green-50 transition-all duration-300 hover:shadow-md">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-green-500 rounded-xl flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <button 
                          onClick={() => handleNav(`accounts/${account.id}`)}
                          className="text-sm font-bold text-gray-900 hover:text-teal-600 transition-colors duration-200"
                        >
                          {account.name}
                        </button>
                        <p className="text-xs text-gray-500">ID: {account.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-sm text-gray-900 font-medium">{account.company}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      <a href={`mailto:${account.email}`} className="text-blue-600 hover:text-blue-800 transition-colors duration-200">
                        {account.email}
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${account.phone}`} className="text-blue-600 hover:text-blue-800 transition-colors duration-200">
                        {account.phone}
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{formatDate(account.created_at)}</td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-sm font-medium">{t('No accounts found')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />

      {/* Selected Account Details */}
      {selectedAccount && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Account Details')} - {selectedAccount.name}</h3>
          <div className="space-y-4">
            <p><strong>{t('Company')}:</strong> {selectedAccount.company}</p>
            <p><strong>{t('Email')}:</strong> {selectedAccount.email}</p>
            <p><strong>{t('Phone')}:</strong> {selectedAccount.phone}</p>
            <p><strong>{t('Address')}:</strong> {selectedAccount.address}</p>
          </div>

          <h4 className="text-md font-semibold text-gray-900 mt-6 mb-2">{t('Associated Tasks')}</h4>
          <ul className="space-y-2">
            {accountTasks.map(task => (
              <li key={task.id} onClick={() => handleClickTask(task.id)} className="border-b py-2 cursor-pointer hover:bg-gray-50">
                <p><strong>{task.subject}:</strong> {task.status} - {task.priority}</p>
                <p>{t('Due')}: {formatDate(task.due_date)}</p>
              </li>
            ))}
            {accountTasks.length === 0 && <p className="text-sm text-gray-500">{t('No tasks associated')}</p>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AccountsView;