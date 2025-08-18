import React from 'react';

/**
 * Critical Alerts Card - Immediate Action Items for Property Manager
 * 
 * BUSINESS PURPOSE: Surface urgent issues that need immediate attention
 * PRIORITY: Business impact × urgency = action priority
 * REPLACES: Hidden problems scattered across system
 */
const CriticalAlertsCard = ({ 
  stats, 
  licenseStats, 
  expiringLicenses, 
  assignedTasks, 
  onAlertClick 
}) => {

  // Generate critical alerts based on data analysis
  const generateCriticalAlerts = () => {
    const alerts = [];

    // URGENT MAINTENANCE (High Impact)
    if (assignedTasks && assignedTasks.length > 0) {
      const urgentTasks = assignedTasks.filter(task => 
        task.priority === 'high' || task.priority === 'urgent'
      );
      if (urgentTasks.length > 0) {
        alerts.push({
          id: 'urgent_tasks',
          type: 'URGENT_MAINTENANCE',
          title: `${urgentTasks.length} Urgent Tasks`,
          description: 'High-priority maintenance requests',
          severity: 'critical',
          count: urgentTasks.length,
          action: () => onAlertClick('tasks'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        });
      }
    }

    // PAYMENT OVERDUE (High Financial Impact)
    if (stats?.unpaid_invoices > 0) {
      alerts.push({
        id: 'unpaid_invoices',
        type: 'PAYMENT_OVERDUE',
        title: `${stats.unpaid_invoices} Unpaid Invoices`,
        description: `Est. €${(stats.unpaid_invoices * 850).toLocaleString()} outstanding`,
        severity: stats.unpaid_invoices > 5 ? 'critical' : 'warning',
        count: stats.unpaid_invoices,
        action: () => onAlertClick('invoices'),
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      });
    }

    // LICENSE EXPIRING (Legal Compliance Risk)
    if (licenseStats && (licenseStats.compliance_percentage < 90 || expiringLicenses?.length > 0)) {
      alerts.push({
        id: 'license_compliance',
        type: 'LICENSE_EXPIRING',
        title: 'License Compliance Issues',
        description: `${licenseStats.compliance_percentage}% compliant • ${expiringLicenses?.length || 0} expiring`,
        severity: licenseStats.compliance_percentage < 70 ? 'critical' : 'warning',
        count: expiringLicenses?.length || 0,
        action: () => onAlertClick('license-management'),
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      });
    }

    // VACANT PROPERTIES (Revenue Loss)
    const occupancyRate = stats?.total_properties > 0 ? 
      Math.round((stats.active_agreements / stats.total_properties) * 100) : 100;
    
    if (occupancyRate < 85) {
      const vacantUnits = stats.total_properties - stats.active_agreements;
      alerts.push({
        id: 'low_occupancy',
        type: 'VACANCY_ALERT',
        title: `${vacantUnits} Vacant Properties`,
        description: `${occupancyRate}% occupancy • Revenue impact`,
        severity: occupancyRate < 70 ? 'critical' : 'warning',
        count: vacantUnits,
        action: () => onAlertClick('properties'),
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      });
    }

    // Sort by severity and count
    return alerts
      .sort((a, b) => {
        // Critical first, then warning
        if (a.severity !== b.severity) {
          return a.severity === 'critical' ? -1 : 1;
        }
        // Higher count first
        return (b.count || 0) - (a.count || 0);
      })
      .slice(0, 6); // Show max 6 alerts
  };

  const alerts = generateCriticalAlerts();

  const AlertItem = ({ alert }) => {
    const getSeverityColor = () => {
      switch (alert.severity) {
        case 'critical': return 'bg-red-50 border-red-200 text-red-800';
        case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        default: return 'bg-blue-50 border-blue-200 text-blue-800';
      }
    };

    const getIconColor = () => {
      switch (alert.severity) {
        case 'critical': return 'text-red-600';
        case 'warning': return 'text-yellow-600';
        default: return 'text-blue-600';
      }
    };

    return (
      <div 
        className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getSeverityColor()}`}
        onClick={alert.action}
      >
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 ${getIconColor()}`}>
            {alert.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold truncate">
                {alert.title}
              </h4>
              {alert.severity === 'critical' && (
                <span className="flex-shrink-0 ml-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </span>
              )}
            </div>
            <p className="text-xs mt-1 text-gray-600">
              {alert.description}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-medium opacity-75">
                {alert.type.replace(/_/g, ' ')}
              </span>
              <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Critical Alerts</h3>
          <div className="flex items-center space-x-2">
            {alerts.filter(a => a.severity === 'critical').length > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-red-600 font-medium">
                  {alerts.filter(a => a.severity === 'critical').length} urgent
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">All Clear!</p>
            <p className="text-sm text-gray-500">No critical alerts at this time</p>
          </div>
        )}
        
        {/* Quick Action Summary */}
        {alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {alerts.filter(a => a.severity === 'critical').length} critical • {' '}
                {alerts.filter(a => a.severity === 'warning').length} warnings
              </span>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                View All →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CriticalAlertsCard;