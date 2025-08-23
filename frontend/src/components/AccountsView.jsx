// src/components/AccountsView.js
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../AuthContext';
import Pagination from './Pagination';
import { exportToCSV } from '../utils/exportUtils';
import complianceService from '../services/complianceService';
import LicenseManagementModal from './LicenseManagementModal';
import { canManageLicenses } from '../utils/permissions';
import EnterpriseDataTable from './ui/EnterpriseDataTable';
import EnterpriseSearchBar from './ui/EnterpriseSearchBar';
import { ACCOUNTS_TABLE_COLUMNS, ACCOUNTS_BASIC_FILTERS, ACCOUNTS_ADVANCED_FILTERS } from './AccountsTableConfig.jsx';

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
  const { user } = useAuth(); // Get current user for permission checking
  const [contractorLicenses, setContractorLicenses] = useState({}); // Map of contractor_id -> license summary
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [licenseFilter, setLicenseFilter] = useState(null); // null, 'eligible', 'not_eligible', 'expiring'
  const [licenseModal, setLicenseModal] = useState({ isOpen: false, contractor: null });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [density, setDensity] = useState('compact');
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  
  // Check if user can manage licenses
  const canUserManageLicenses = canManageLicenses(user);

  const fetchContractorLicenses = async () => {
    // Only fetch license data if user has permissions
    if (!canUserManageLicenses) {
      setLoadingLicenses(false);
      return;
    }
    
    const contractors = accounts.filter(account => account.account_type === 'contractor');
    if (contractors.length === 0) return;

    setLoadingLicenses(true);
    const licenseData = {};

    try {
      const licensePromises = contractors.map(async (contractor) => {
        try {
          const summary = await complianceService.getContractorLicenseSummary(contractor.id);
          licenseData[contractor.id] = summary;
        } catch (error) {
          // Handle different error types gracefully without console spam
          if (error.response?.status === 403) {
            // Silent handling of permission errors - user doesn't have access
            licenseData[contractor.id] = { 
              is_eligible_for_assignment: false, 
              error: 'Permission denied',
              total_licenses: 0,
              valid_licenses: 0,
              expired_licenses: 0,
              expiring_soon: 0,
              pending_verification: 0
            };
          } else if (error.response?.status === 404) {
            // Contractor not found or no licenses
            licenseData[contractor.id] = { 
              is_eligible_for_assignment: false, 
              error: 'No license data',
              total_licenses: 0,
              valid_licenses: 0,
              expired_licenses: 0,
              expiring_soon: 0,
              pending_verification: 0
            };
          } else {
            // Network or other errors - log once but don't spam console
            if (process.env.NODE_ENV === 'development') {
              console.warn(`License fetch failed for contractor ${contractor.id}:`, error.message);
            }
            licenseData[contractor.id] = { 
              is_eligible_for_assignment: false, 
              error: 'Connection error',
              total_licenses: 0,
              valid_licenses: 0,
              expired_licenses: 0,
              expiring_soon: 0,
              pending_verification: 0
            };
          }
        }
      });

      await Promise.all(licensePromises);
      setContractorLicenses(licenseData);
    } catch (error) {
      // Only log general errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error fetching contractor licenses:', error.message);
      }
      setContractorLicenses({});
    } finally {
      setLoadingLicenses(false);
    }
  };

  // Fetch license data for contractors when accounts change (only if user has permissions)
  useEffect(() => {
    fetchContractorLicenses();
  }, [accounts, canUserManageLicenses]);

  // Reset license filter when account type filter changes away from contractor
  useEffect(() => {
    if (accountTypeFilter !== 'contractor' && accountTypeFilter !== null) {
      setLicenseFilter(null);
    }
  }, [accountTypeFilter]);

  const getAccountTypeBadge = (accountType) => {
    const config = {
      'tenant': { color: 'bg-purple-100 text-purple-800', label: t('accounts.tenant') },
      'employee': { color: 'bg-blue-100 text-blue-800', label: t('accounts.employee') },
      'contractor': { color: 'bg-orange-100 text-orange-800', label: t('accounts.contractor') }
    };
    
    return config[accountType] || { color: 'bg-gray-100 text-gray-800', label: accountType };
  };

  const openLicenseModal = (contractor) => {
    setLicenseModal({ isOpen: true, contractor });
  };

  const closeLicenseModal = () => {
    setLicenseModal({ isOpen: false, contractor: null });
  };

  const handleLicenseUpdate = () => {
    // Refresh contractor licenses after update
    fetchContractorLicenses();
  };

  // Enhanced column configuration with context data
  const enhancedColumns = useMemo(() => {
    return ACCOUNTS_TABLE_COLUMNS.map(column => ({
      ...column,
      render: column.render ? (value, row) => 
        column.render(value, row, { 
          contractorLicenses, 
          canUserManageLicenses, 
          handleNav, 
          openLicenseModal 
        }) : undefined
    }));
  }, [contractorLicenses, canUserManageLicenses, handleNav]);

  // Apply license compliance filtering
  const filteredAccountsWithLicense = useMemo(() => {
    let filtered = accounts;
    
    if (licenseFilter && accountTypeFilter === 'contractor' && canUserManageLicenses) {
      filtered = accounts.filter(account => {
        if (account.account_type !== 'contractor') return false;
        
        const licenseData = contractorLicenses[account.id];
        if (!licenseData) return licenseFilter === 'no_data';
        
        switch (licenseFilter) {
          case 'eligible':
            return licenseData.is_eligible_for_assignment;
          case 'not_eligible':
            return !licenseData.is_eligible_for_assignment;
          case 'expiring':
            return licenseData.expiring_soon > 0;
          case 'expired':
            return licenseData.expired_licenses > 0;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [accounts, licenseFilter, accountTypeFilter, canUserManageLicenses, contractorLicenses]);

  const handleSort = (config) => {
    setSortConfig(config);
  };

  const handleAccountClick = (account) => {
    handleNav(`accounts/${account.id}`);
  };

  const handleExport = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'company', label: t('accounts.company') },
      { key: 'email', label: t('common.email') },
      { key: 'phone', label: t('common.phone') },
      { key: 'address', label: 'Address' },
      { key: 'created_at', label: 'Created Date' }
    ];
    exportToCSV(filteredAccountsWithLicense, `accounts-${currentDate}`, columns);
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {t('accounts.title')}
                </h1>
                <p className="text-gray-600 text-sm">{t('accounts.manageEfficiency')}</p>
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
                onClick={() => handleNav('create-account')} 
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>{t('accounts.addAccount')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Search */}
      <div>
        <EnterpriseSearchBar
          value={searchTerm || ''}
          onChange={(value) => setSearchTerm(value)}
          placeholder={t('accounts.searchPlaceholder')}
          className="max-w-md"
        />
      </div>

      {/* Legacy Filter Controls */}
      {(accountTypeFilter || licenseFilter) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('accounts.accountType')}
              </label>
              <select
                value={accountTypeFilter || ''}
                onChange={(e) => setAccountTypeFilter(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('accounts.allTypes')}</option>
                <option value="tenant">{t('accounts.tenant')}</option>
                <option value="employee">{t('accounts.employee')}</option>
                <option value="contractor">{t('accounts.contractor')}</option>
              </select>
            </div>
            
            {canUserManageLicenses && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('accounts.licenseCompliance')}
                </label>
                <select
                  value={licenseFilter || ''}
                  onChange={(e) => setLicenseFilter(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={accountTypeFilter !== 'contractor' && accountTypeFilter !== null}
                >
                  <option value="">{t('accounts.allContractors')}</option>
                  <option value="eligible">{t('accounts.eligibleForAssignments')}</option>
                  <option value="not_eligible">{t('accounts.notEligibleText')}</option>
                  <option value="expiring">{t('accounts.licensesExpiringSoon')}</option>
                  <option value="expired">{t('accounts.expiredLicenses')}</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Enterprise Data Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <EnterpriseDataTable
          data={filteredAccountsWithLicense}
          columns={enhancedColumns}
          sortConfig={sortConfig}
          onSort={handleSort}
          onRowClick={handleAccountClick}
          loading={false}
          density={density}
          onDensityChange={setDensity}
          selectable={true}
          onSelectionChange={setSelectedAccounts}
          searchTerm={searchTerm}
        />
      </div>

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

      {/* License Management Modal (only if user has permissions) */}
      {canUserManageLicenses && (
        <LicenseManagementModal
          isOpen={licenseModal.isOpen}
          onClose={closeLicenseModal}
          contractor={licenseModal.contractor}
          onLicenseUpdate={handleLicenseUpdate}
        />
      )}
    </div>
  );
};

export default AccountsView;