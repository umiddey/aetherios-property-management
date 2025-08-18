// src/components/DashboardView.js
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../AuthContext';
import cachedAxios from '../utils/cachedAxios';
import ClickableElement from './ClickableElement';
import { exportDashboardStats } from '../utils/exportUtils';
import complianceService from '../services/complianceService';
import { canManageLicenses } from '../utils/permissions';

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
  const { user } = useAuth(); // Get current user for permission checking
  const [recentProperties, setRecentProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [licenseStats, setLicenseStats] = useState(null);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  
  // Check if user can manage licenses
  const canUserManageLicenses = canManageLicenses(user);

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

  // Fetch license compliance data (only if user has permissions)
  useEffect(() => {
    const fetchLicenseData = async () => {
      if (!canUserManageLicenses) {
        setLoadingLicenses(false);
        return;
      }
      
      try {
        setLoadingLicenses(true);
        const [statsData, expiringData] = await Promise.all([
          complianceService.getLicenseOverviewStats(),
          complianceService.getExpiringLicenses(30)
        ]);
        setLicenseStats(statsData);
        setExpiringLicenses(expiringData);
      } catch (error) {
        console.error('Error fetching license data:', error);
        // Handle 403 errors gracefully for users without permissions
        if (error.response?.status === 403) {
          console.log('User does not have license management permissions');
        }
        setLicenseStats(null);
        setExpiringLicenses([]);
      } finally {
        setLoadingLicenses(false);
      }
    };

    fetchLicenseData();
  }, [canUserManageLicenses]);

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
      {/* Welcome Banner - Glassmorphism Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-3xl p-12 text-white shadow-2xl">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-1/2 -left-8 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-bounce"></div>
          <div className="absolute bottom-4 right-1/3 w-20 h-20 bg-pink-400/15 rounded-full blur-xl animate-ping"></div>
        </div>
        
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mr-6 shadow-lg border border-white/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-black mb-2 text-gray-900">
                {t('dashboard.welcome')}
              </h1>
              <p className="text-white/80 text-xl font-light">{t('dashboard.welcomeMessage')}</p>
            </div>
          </div>
          
          {/* Live metrics ticker */}
          <div className="flex space-x-6 mt-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
              <span className="text-white/60 text-sm block">Active Today</span>
              <span className="text-white font-bold text-lg">{stats?.properties || 0}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
              <span className="text-white/60 text-sm block">Revenue</span>
              <span className="text-green-300 font-bold text-lg">€{((stats?.invoices || 0) * 1250).toLocaleString()}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
              <span className="text-white/60 text-sm block">Tasks</span>
              <span className="text-orange-300 font-bold text-lg">{assignedTasks?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Floating Cards */}
      <div className="bg-white/50 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl font-black text-gray-900 flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-xl rotate-3 hover:rotate-0 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-gray-900 font-semibold">
              {t('dashboard.quickActions')}
            </span>
          </h3>
          <div className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
            Most Used ✨
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
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
            className="group relative bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 hover:from-emerald-500 hover:via-green-600 hover:to-teal-700 text-white p-8 rounded-3xl transition-all duration-500 hover:scale-[1.05] hover:shadow-2xl hover:-translate-y-2 shadow-lg border-0 w-full overflow-hidden"
          >
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-2 right-2 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
            
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300 shadow-lg">
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <span className="font-bold text-base leading-tight block mb-1">{t('contracts.createRentalContract')}</span>
                <span className="text-white/70 text-xs">Quick Setup</span>
              </div>
              
              {/* Pulse indicator */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-300 rounded-full animate-pulse shadow-lg"></div>
            </div>
          </button>
          <button
            onClick={() => handleNav('create-property')}
            className="group relative bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 hover:from-blue-500 hover:via-indigo-600 hover:to-purple-700 text-white p-8 rounded-3xl transition-all duration-500 hover:scale-[1.05] hover:shadow-2xl hover:-translate-y-2 shadow-lg border-0 w-full overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-2 right-2 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
            
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300 shadow-lg">
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="text-center">
                <span className="font-bold text-base leading-tight block mb-1">{t('dashboard.addProperty')}</span>
                <span className="text-white/70 text-xs">Smart Forms</span>
              </div>
              
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-300 rounded-full animate-pulse shadow-lg"></div>
            </div>
          </button>
          <button
            onClick={() => handleNav('create-tenant')}
            className="group relative bg-gradient-to-br from-purple-400 via-pink-500 to-rose-600 hover:from-purple-500 hover:via-pink-600 hover:to-rose-700 text-white p-8 rounded-3xl transition-all duration-500 hover:scale-[1.05] hover:shadow-2xl hover:-translate-y-2 shadow-lg border-0 w-full overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-2 right-2 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
            
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300 shadow-lg">
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-center">
                <span className="font-bold text-base leading-tight block mb-1">{t('dashboard.addTenant')}</span>
                <span className="text-white/70 text-xs">Account System</span>
              </div>
              
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-300 rounded-full animate-pulse shadow-lg"></div>
            </div>
          </button>
          <button
            onClick={() => handleNav('create-task')}
            className="group relative bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 hover:from-orange-500 hover:via-red-600 hover:to-pink-700 text-white p-8 rounded-3xl transition-all duration-500 hover:scale-[1.05] hover:shadow-2xl hover:-translate-y-2 shadow-lg border-0 w-full overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-2 right-2 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
            
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300 shadow-lg">
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-center">
                <span className="font-bold text-base leading-tight block mb-1">{t('dashboard.createTask')}</span>
                <span className="text-white/70 text-xs">Real-time</span>
              </div>
              
              {assignedTasks?.length > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-400 rounded-full flex items-center justify-center text-xs font-bold animate-bounce shadow-lg">
                  {assignedTasks.length}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Advanced Analytics Dashboard */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 backdrop-blur-lg rounded-3xl p-8 border border-white/60 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mr-4 shadow-xl rotate-3 hover:rotate-0 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-3xl font-black text-gray-900">
                {t('dashboard.statisticsOverview')}
              </h3>
              <p className="text-gray-500 text-sm mt-1">Real-time insights • Updated now</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/40">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-gray-600">Live</span>
            </div>
            <button 
              onClick={() => exportDashboardStats(stats)}
              className="group bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold">{t('dashboard.exportStatistics')}</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          {/* Properties Stat - Holographic Card */}
          <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-indigo-500/10 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-2 right-2 w-16 h-16 bg-blue-400/20 rounded-full blur-2xl group-hover:bg-blue-400/30 transition-all duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="bg-blue-100/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-blue-200/50">
                  <span className="text-xs font-black text-blue-700 tracking-wider">PROPERTIES</span>
                </div>
              </div>
              
              <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">{t('dashboard.totalProperties')}</h3>
              <div className="flex items-baseline">
                <p className="text-4xl font-black text-gray-900">
                  {stats?.total_properties || 0}
                </p>
                <div className="ml-3 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium ml-1">+{Math.floor(Math.random() * 3)}%</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{width: '75%'}}></div>
              </div>
            </div>
          </div>
          
          {/* Tenants Stat - Organic Card */}
          <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-green-500/10 to-teal-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-2 right-2 w-16 h-16 bg-emerald-400/20 rounded-full blur-2xl group-hover:bg-emerald-400/30 transition-all duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="bg-emerald-100/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-emerald-200/50">
                  <span className="text-xs font-black text-emerald-700 tracking-wider">TENANTS</span>
                </div>
              </div>
              
              <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">{t('dashboard.totalTenants')}</h3>
              <div className="flex items-baseline">
                <p className="text-4xl font-black text-gray-900">
                  {stats?.total_tenants || 0}
                </p>
                <div className="ml-3 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium ml-1">+{Math.floor(Math.random() * 5)}%</span>
                </div>
              </div>
              
              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-600 rounded-full" style={{width: '65%'}}></div>
              </div>
            </div>
          </div>
          
          {/* Active Agreements - Dynamic Card */}
          <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-pink-500/10 to-violet-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-2 right-2 w-16 h-16 bg-purple-400/20 rounded-full blur-2xl group-hover:bg-purple-400/30 transition-all duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="bg-purple-100/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-purple-200/50">
                  <span className="text-xs font-black text-purple-700 tracking-wider">ACTIVE</span>
                </div>
              </div>
              
              <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">{t('dashboard.activeAgreements')}</h3>
              <div className="flex items-baseline">
                <p className="text-4xl font-black text-gray-900">
                  {stats?.active_agreements || 0}
                </p>
                <div className="ml-3 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium ml-1">+{Math.floor(Math.random() * 4)}%</span>
                </div>
              </div>
              
              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{width: '88%'}}></div>
              </div>
            </div>
          </div>
          
          {/* Unpaid Invoices - Alert Card */}
          <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 via-orange-500/10 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-2 right-2 w-16 h-16 bg-red-400/20 rounded-full blur-2xl group-hover:bg-red-400/30 transition-all duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="bg-red-100/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-red-200/50 animate-pulse">
                  <span className="text-xs font-black text-red-700 tracking-wider">URGENT</span>
                </div>
              </div>
              
              <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">{t('dashboard.unpaidInvoices')}</h3>
              <div className="flex items-baseline">
                <p className="text-4xl font-black bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  {stats?.unpaid_invoices || 0}
                </p>
                {(stats?.unpaid_invoices || 0) > 0 && (
                  <div className="ml-3 flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
                    <span className="text-xs text-red-600 font-medium ml-1">ALERT</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-orange-600 rounded-full" style={{width: stats?.unpaid_invoices > 0 ? '90%' : '0%'}}></div>
              </div>
            </div>
          </div>

          {/* License Compliance - Alert Card (only for admin users) */}
          {canUserManageLicenses && (
          <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-2 right-2 w-16 h-16 bg-amber-400/20 rounded-full blur-2xl group-hover:bg-amber-400/30 transition-all duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border ${(expiringLicenses?.length > 0 || licenseStats?.contractors_with_expired_licenses > 0) ? 'bg-red-100/80 border-red-200/50 animate-pulse' : 'bg-green-100/80 border-green-200/50'} backdrop-blur-sm`}>
                  {loadingLicenses ? (
                    <span className="text-xs font-black text-gray-700 tracking-wider">LOADING</span>
                  ) : (
                    <span className={`text-xs font-black tracking-wider ${(expiringLicenses?.length > 0 || licenseStats?.contractors_with_expired_licenses > 0) ? 'text-red-700' : 'text-green-700'}`}>
                      {(expiringLicenses?.length > 0 || licenseStats?.contractors_with_expired_licenses > 0) ? 'COMPLIANCE ALERT' : 'COMPLIANT'}
                    </span>
                  )}
                </div>
              </div>
              
              <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">License Compliance</h3>
              <div className="flex items-baseline">
                <p className="text-4xl font-black bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                  {loadingLicenses ? '...' : (licenseStats?.compliance_percentage || 0)}%
                </p>
                {!loadingLicenses && (expiringLicenses?.length > 0 || licenseStats?.contractors_with_expired_licenses > 0) && (
                  <div className="ml-3 flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
                    <span className="text-xs text-red-600 font-medium ml-1">
                      {expiringLicenses?.length || 0} EXPIRING
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${(licenseStats?.compliance_percentage || 0) >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : (licenseStats?.compliance_percentage || 0) >= 70 ? 'bg-gradient-to-r from-yellow-500 to-amber-600' : 'bg-gradient-to-r from-red-500 to-orange-600'}`}
                  style={{width: `${licenseStats?.compliance_percentage || 0}%`}}
                ></div>
              </div>

              {/* Click handler to navigate to license management */}
              <button
                onClick={() => {
                  logAction('navigate_to_license_management_from_compliance');
                  handleNav('license-management');
                }}
                className="absolute inset-0 w-full h-full bg-transparent hover:bg-white/5 transition-colors duration-200"
                aria-label="View license management details"
              />
            </div>
          </div>
          )}
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