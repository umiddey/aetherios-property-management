// src/components/AccountsView.js
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
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
  logAction,
  accountTypeFilter,
  setAccountTypeFilter,
  searchTerm,
  setSearchTerm
}) => {
  const { t } = useLanguage();

  const getAccountTypeBadge = (accountType) => {
    const config = {
      'tenant': { color: 'bg-purple-100 text-purple-800', label: t('accounts.tenant') },
      'employee': { color: 'bg-blue-100 text-blue-800', label: t('accounts.employee') },
      'contractor': { color: 'bg-orange-100 text-orange-800', label: t('accounts.contractor') }
    };
    
    return config[accountType] || { color: 'bg-gray-100 text-gray-800', label: accountType };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-100 p-6">
      {/* Modern Header with Glassmorphism */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  👥 {t('accounts.title')}
                </h1>
                <p className="text-gray-600 mt-1">Manage all account types with unified efficiency</p>
              </div>
            </div>
            <div className="flex space-x-4">
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
              <button onClick={() => handleNav('create-account')} className="group relative px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>✨ {t('accounts.addAccount')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters with Glassmorphism */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-500 rounded-2xl blur-lg opacity-10"></div>
        <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-xl">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">🔍 Smart Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">🏷️</span>
                {t('accounts.accountType')}
              </label>
              <div className="relative">
                <select
                  value={accountTypeFilter || ''}
                  onChange={(e) => setAccountTypeFilter(e.target.value || null)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                >
                  <option value="">{t('accounts.allTypes')}</option>
                  <option value="tenant">{t('accounts.tenant')}</option>
                  <option value="employee">{t('accounts.employee')}</option>
                  <option value="contractor">{t('accounts.contractor')}</option>
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
                <span className="mr-2">🔍</span>
                {t('common.search')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('accounts.searchPlaceholder')}
                  value={searchTerm || ''}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Modern Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 rounded-3xl blur-lg opacity-10"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-16 border border-white/30 shadow-xl text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              👥 {t('accounts.noAccountsFound')}
            </h3>
            <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
              No accounts match your current filters. Try adjusting your search criteria.
            </p>
            <button
              onClick={() => handleNav('create-account')}
              className="group relative px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>✨ {t('accounts.addAccount')}</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {accounts.map((account, index) => {
            const getAccountTypeEmoji = (type) => {
              switch (type) {
                case 'tenant': return '🏠';
                case 'employee': return '👔';
                case 'contractor': return '🤝';
                default: return '👤';
              }
            };

            const getAccountTypeColor = (type) => {
              switch (type) {
                case 'tenant': return 'from-purple-500 to-indigo-600';
                case 'employee': return 'from-blue-500 to-cyan-600';
                case 'contractor': return 'from-orange-500 to-amber-600';
                default: return 'from-gray-500 to-slate-600';
              }
            };

            return (
              <div
                key={account.id}
                onClick={() => handleNav(`accounts/${account.id}`)}
                className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl hover:shadow-2xl transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 via-cyan-500/5 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Floating Elements */}
                <div className="absolute top-4 right-4 w-6 h-6 bg-teal-400/20 rounded-full blur-sm group-hover:animate-pulse"></div>
                <div className="absolute bottom-6 left-6 w-4 h-4 bg-cyan-500/20 rounded-full blur-sm group-hover:animate-bounce"></div>

                {/* Account Header */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-4 bg-gradient-to-br ${getAccountTypeColor(account.account_type)} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-2xl">{getAccountTypeEmoji(account.account_type)}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-teal-600 transition-colors duration-300">
                          {account.full_name || `${account.first_name} ${account.last_name}`}
                        </h3>
                        <p className="text-gray-500 text-sm">ID: {account.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getAccountTypeBadge(account.account_type).color} shadow-sm`}>
                        {getAccountTypeEmoji(account.account_type)} {getAccountTypeBadge(account.account_type).label}
                      </span>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="space-y-4">
                    {/* Email */}
                    <div className="bg-blue-50/50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center">
                        <span className="mr-2">📧</span>
                        {t('common.email')}
                      </div>
                      <a 
                        href={`mailto:${account.email}`} 
                        onClick={(e) => e.stopPropagation()} 
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 break-all"
                      >
                        {account.email}
                      </a>
                    </div>

                    {/* Phone */}
                    {account.phone && (
                      <div className="bg-green-50/50 rounded-xl p-4">
                        <div className="text-xs font-semibold text-green-700 mb-2 flex items-center">
                          <span className="mr-2">📱</span>
                          {t('common.phone')}
                        </div>
                        <a 
                          href={`tel:${account.phone}`} 
                          onClick={(e) => e.stopPropagation()} 
                          className="text-sm font-medium text-green-600 hover:text-green-800 transition-colors duration-200"
                        >
                          {account.phone}
                        </a>
                      </div>
                    )}

                    {/* Created Date */}
                    <div className="bg-purple-50/50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-purple-700 mb-2 flex items-center">
                        <span className="mr-2">📅</span>
                        {t('common.created')}
                      </div>
                      <div className="text-sm font-medium text-gray-800">{formatDate(account.created_at)}</div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 border-t border-gray-200/50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNav(`accounts/${account.id}`);
                        }}
                        className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>👁️ View Details</span>
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

      {/* Selected Account Details */}
      {selectedAccount && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('accounts.accountDetails')} - {selectedAccount.name}</h3>
          <div className="space-y-4">
            <p><strong>{t('accounts.company')}:</strong> {selectedAccount.company}</p>
            <p><strong>{t('common.email')}:</strong> {selectedAccount.email}</p>
            <p><strong>{t('common.phone')}:</strong> {selectedAccount.phone}</p>
            <p><strong>{t('common.address')}:</strong> {selectedAccount.address}</p>
          </div>

          <h4 className="text-md font-semibold text-gray-900 mt-6 mb-2">{t('accounts.associatedTasks')}</h4>
          <ul className="space-y-2">
            {accountTasks.map(task => (
              <li key={task.id} onClick={() => handleClickTask(task.id)} className="border-b py-2 cursor-pointer hover:bg-gray-50">
                <p><strong>{task.subject}:</strong> {task.status} - {task.priority}</p>
                <p>{t('tasks.dueDate')}: {formatDate(task.due_date)}</p>
              </li>
            ))}
            {accountTasks.length === 0 && <p className="text-sm text-gray-500">{t('accounts.noTasksAssociated')}</p>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AccountsView;