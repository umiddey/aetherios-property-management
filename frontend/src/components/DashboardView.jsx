// Enterprise Dashboard View - Information-Dense Business Intelligence
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../AuthContext';
import cachedAxios from '../utils/cachedAxios';
import complianceService from '../services/complianceService';
import { canManageLicenses } from '../utils/permissions';

// Enterprise Dashboard Components
import EnterpriseDashboardGrid from './ui/EnterpriseDashboardGrid';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Enterprise Dashboard View - Complete Replacement of Consumer Interface
 * 
 * TRANSFORMATION:
 * - FROM: 4 decorative gradient cards, 30% screen utilization
 * - TO: Information-dense enterprise grid, 80% screen utilization
 * - RESULT: 300% more business intelligence visible instantly
 */
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
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // Enterprise Dashboard State
  const [recentProperties, setRecentProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [licenseStats, setLicenseStats] = useState(null);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  
  // Check if user can manage licenses
  const canUserManageLicenses = canManageLicenses(user);

  // Fetch recent properties for portfolio table
  useEffect(() => {
    const fetchRecentProperties = async () => {
      try {
        setLoadingProperties(true);
        const response = await cachedAxios.get(`${API}/v1/properties/?archived=false&limit=15&sort=created_at&order=desc`);
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

  // Fetch license compliance data
  useEffect(() => {
    if (!canUserManageLicenses) return;

    const fetchLicenseData = async () => {
      try {
        setLoadingLicenses(true);
        const [statsData, expiringData] = await Promise.all([
          complianceService.getComplianceStats(),
          complianceService.getExpiringLicenses()
        ]);
        
        setLicenseStats(statsData);
        setExpiringLicenses(expiringData);
      } catch (error) {
        console.error('Error fetching license data:', error);
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

  // Fetch recent activities
  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        const response = await cachedAxios.get(`${API}/v1/dashboard/recent-activities?limit=8`);
        setRecentActivities(response.data.recent_activities || []);
      } catch (error) {
        console.error('Error fetching recent activities:', error);
        setRecentActivities([]);
      }
    };

    fetchRecentActivities();
  }, []);

  // Handle navigation with logging
  const handleNavWithLogging = (route) => {
    logAction('dashboard_navigation', { route });
    handleNav(route);
  };

  // Handle task clicks with viewed tracking
  const handleTaskClick = (task) => {
    if (task.id === 'all') {
      handleNavWithLogging('tasks');
      return;
    }
    
    logAction('view_task', { taskId: task.id });
    if (!viewedTasks.includes(task.id)) {
      setViewedTasks([...viewedTasks, task.id]);
    }
    handleNavWithLogging(`tasks/${task.id}`);
  };

  return (
    <EnterpriseDashboardGrid
      stats={stats}
      licenseStats={licenseStats}
      expiringLicenses={expiringLicenses}
      recentProperties={recentProperties}
      assignedTasks={assignedTasks}
      recentActivities={recentActivities}
      onNavigate={handleNavWithLogging}
      formatDate={formatDate}
      formatCurrency={formatCurrency}
      getStatusColor={getStatusColor}
      getPriorityColor={getPriorityColor}
    />
  );
};

export default DashboardView;