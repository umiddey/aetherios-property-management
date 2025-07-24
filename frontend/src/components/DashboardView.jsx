// src/components/DashboardView.js
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import cachedAxios from '../utils/cachedAxios';
import ClickableElement from './ClickableElement';
import { exportDashboardStats } from '../utils/exportUtils';

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
  logAction
}) => {
  const { t } = useLanguage(); // Use the language context
  const [recentProperties, setRecentProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  // Fetch recent properties independently of the properties page filter
  useEffect(() => {
    const fetchRecentProperties = async () => {
      try {
        setLoadingProperties(true);
        const response = await cachedAxios.get(`${API}/v1/properties/?archived=false&limit=5&sort=created_at&order=desc`);
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
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">{t('dashboard.welcome')}</h1>
        <p className="text-blue-100 text-lg">{t('dashboard.welcomeMessage')}</p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-xl rounded-3xl p-8 border border-gray-50">
        <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          {t('dashboard.quickActions')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <button
            onClick={() => handleNav('create-contract', {
              prefilledData: {
                contract_type: 'rental',
                title: 'Rental Agreement',
                parties: [
                  {
                    name: '',
                    role: 'Landlord',
                    contact_email: '',
                    contact_phone: ''
                  },
                  {
                    name: '',
                    role: 'Tenant',
                    contact_email: '',
                    contact_phone: ''
                  }
                ]
              }
            })}
            className="group bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg border-0 w-full"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-semibold text-center text-sm leading-tight">{t('contracts.createRentalContract')}</span>
            </div>
          </button>
          <button
            onClick={() => handleNav('create-property')}
            className="group bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg border-0 w-full"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="font-semibold text-center text-sm leading-tight">{t('dashboard.addProperty')}</span>
            </div>
          </button>
          <button
            onClick={() => handleNav('create-tenant')}
            className="group bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg border-0 w-full"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="font-semibold text-center text-sm leading-tight">{t('dashboard.addTenant')}</span>
            </div>
          </button>
          <button
            onClick={() => handleNav('create-task')}
            className="group bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg border-0 w-full"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="font-semibold text-center text-sm leading-tight">{t('dashboard.createTask')}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            {t('dashboard.statisticsOverview')}
          </h3>
          <button 
            onClick={() => exportDashboardStats(stats)}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('dashboard.exportStatistics')}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">PROPERTIES</span>
            </div>
            <h3 className="text-sm font-medium text-blue-700 mb-2">{t('dashboard.totalProperties')}</h3>
            <p className="text-3xl font-bold text-blue-600">{stats?.total_properties || 0}</p>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-200 px-2 py-1 rounded-full">TENANTS</span>
            </div>
            <h3 className="text-sm font-medium text-emerald-700 mb-2">{t('dashboard.totalTenants')}</h3>
            <p className="text-3xl font-bold text-emerald-600">{stats?.total_tenants || 0}</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-purple-600 bg-purple-200 px-2 py-1 rounded-full">ACTIVE</span>
            </div>
            <h3 className="text-sm font-medium text-purple-700 mb-2">{t('dashboard.activeAgreements')}</h3>
            <p className="text-3xl font-bold text-purple-600">{stats?.active_agreements || 0}</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-red-600 bg-red-200 px-2 py-1 rounded-full">UNPAID</span>
            </div>
            <h3 className="text-sm font-medium text-red-700 mb-2">{t('dashboard.unpaidInvoices')}</h3>
            <p className="text-3xl font-bold text-red-600">{stats?.unpaid_invoices || 0}</p>
          </div>
        </div>
      </div>

      {/* Assigned Tasks */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            {t('dashboard.assignedTasks')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tasks.taskTitle')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tasks.priority')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('common.status')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tasks.dueDate')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {assignedTasks.map(task => (
                <tr
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className={`cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 ${!viewedTasks.includes(task.id) ? 'font-bold bg-gradient-to-r from-yellow-50 to-orange-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      {!viewedTasks.includes(task.id) && task.status === 'pending' && 
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                      }
                      {task.subject}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{formatDate(task.due_date)}</td>
                </tr>
              ))}
              {assignedTasks.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <p className="text-sm font-medium">{t('tasks.title')} - {t('common.loading')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Properties */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            {t('dashboard.recentProperties')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('common.name')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('properties.propertyType')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('common.status')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('common.created')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loadingProperties ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                      <span className="ml-3 text-sm text-gray-500 font-medium">{t('common.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {recentProperties.map(property => (
                    <tr key={property.id} onClick={() => handleNav('properties')} className="cursor-pointer hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all duration-300">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{property.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getPropertyTypeColor(property.property_type)}`}>
                          {property.property_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(property.status)}`}>
                          {property.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{formatDate(property.created_at)}</td>
                    </tr>
                  ))}
                  {recentProperties.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center">
                        <div className="text-gray-400">
                          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <p className="text-sm font-medium">{t('properties.title')} - {t('common.loading')}</p>
                        </div>
                      </td>
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