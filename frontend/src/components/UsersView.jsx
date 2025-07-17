// src/components/UsersView.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';

const UsersView = ({
  usersList,
  totalPages,
  currentPage,
  onPageChange,
  selectedUser,
  setSelectedUser,
  handleDeleteUser,
  handleNav,
  getRoleColor,
  formatDate,
  t,
  logAction
}) => {
  const { t: translate } = useTranslation();

  const handleEditUser = (user) => {
    setSelectedUser(user);
    handleNav(`edit-user/${user.id}`);
  };

  return (
    <div className="space-y-8">
      {/* User List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">{t('navigation.users')}</h2>
          <button onClick={() => handleNav('create-user')} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            {t('dashboard.createUser')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tenants.fullName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tenants.active')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.created')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usersList.map(user => (
                <tr key={user.id} onClick={() => setSelectedUser(user)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button onClick={() => handleEditUser(user)} className="text-blue-600 hover:text-blue-900 mr-2">
                      {t('common.edit')}
                    </button>
                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900">
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {usersList.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">{t('No users found')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />

      {/* Selected User Details */}
      {selectedUser && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('User Details')} - {selectedUser.username}</h3>
          <div className="space-y-4">
            <p><strong>{t('Full Name')}:</strong> {selectedUser.full_name}</p>
            <p><strong>{t('Email')}:</strong> {selectedUser.email}</p>
            <p><strong>{t('Role')}:</strong> {selectedUser.role}</p>
            <p><strong>{t('Active')}:</strong> {selectedUser.is_active ? 'Yes' : 'No'}</p>
            <p><strong>{t('Created At')}:</strong> {formatDate(selectedUser.created_at)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;