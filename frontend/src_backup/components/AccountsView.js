// src/components/AccountsView.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';

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
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">{t('Accounts')}</h2>
          <button onClick={() => handleNav('create-account')} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            {t('Add Account')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Company')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Phone')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Created')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map(account => (
                <tr key={account.id} onClick={() => setSelectedAccount(account)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{account.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.company}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(account.created_at)}</td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">{t('No accounts found')}</td>
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