// src/components/DashboardView.js
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardView = ({
  stats,
  assignedTasks,
  getPriorityColor,
  getStatusColor,
  getPropertyTypeColor,
  formatDate,
  formatCurrency,
  handleNav,
  viewedTasks,
  setViewedTasks,
  t,
  logAction
}) => {
  const { t: translate } = useTranslation(); // Use the translation hook
  const [recentProperties, setRecentProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  // Fetch recent properties independently of the properties page filter
  useEffect(() => {
    const fetchRecentProperties = async () => {
      try {
        setLoadingProperties(true);
        const response = await axios.get(`${API}/properties/?archived=false&limit=5&sort=created_at&order=desc`);
        setRecentProperties(response.data);
      } catch (error) {
        console.error('Error fetching recent properties:', error);
        setRecentProperties([]);
      } finally {
        setLoadingProperties(false);
      }
    };

    fetchRecentProperties();
  }, []);

  const handleTaskClick = (taskId) => {
    logAction('view_task', { taskId });
    if (!viewedTasks.includes(taskId)) {
      setViewedTasks([...viewedTasks, taskId]);
    }
    // Navigate or show details (assuming navigation to tasks view with selected)
    handleNav('tasks');
  };

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Quick Actions')}</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => handleNav('create-rental-agreement')} 
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
          >
            {t('Create Rental Agreement')}
          </button>
          <button 
            onClick={() => handleNav('create-property')} 
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            {t('Add Property')}
          </button>
          <button 
            onClick={() => handleNav('create-tenant')} 
            className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors"
          >
            {t('Add Tenant')}
          </button>
          <button 
            onClick={() => handleNav('create-invoice')} 
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
          >
            {t('Create Invoice')}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-6 stats-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('Total Properties')}</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.total_properties || 0}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6 stats-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('Total Tenants')}</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.total_tenants || 0}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6 stats-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('Active Agreements')}</h3>
          <p className="text-3xl font-bold text-purple-600">{stats?.active_agreements || 0}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6 stats-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('Unpaid Invoices')}</h3>
          <p className="text-3xl font-bold text-red-600">{stats?.unpaid_invoices || 0}</p>
        </div>
      </div>

      {/* Assigned Tasks */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{t('Assigned Tasks')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Subject')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Priority')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Due Date')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignedTasks.map(task => (
                <tr
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${!viewedTasks.includes(task.id) ? 'font-bold' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {!viewedTasks.includes(task.id) && task.status === 'pending' && <span className="mr-2 text-red-500">⚠️</span>}
                    {task.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(task.due_date)}</td>
                </tr>
              ))}
              {assignedTasks.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">{t('No assigned tasks')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Properties */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{t('Recent Properties')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Created')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingProperties ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">{t('Loading recent properties...')}</td>
                </tr>
              ) : (
                <>
                  {recentProperties.map(property => (
                    <tr key={property.id} onClick={() => handleNav('properties')} className="cursor-pointer hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{property.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPropertyTypeColor(property.property_type)}`}>
                          {property.property_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(property.status)}`}>
                          {property.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(property.created_at)}</td>
                    </tr>
                  ))}
                  {recentProperties.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">{t('No properties found')}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;