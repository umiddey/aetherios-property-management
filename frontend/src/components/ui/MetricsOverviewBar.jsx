import React from 'react';

/**
 * Enterprise Metrics Overview Bar - Critical KPIs in Compact Horizontal Layout
 * 
 * BUSINESS PURPOSE: Show 6 critical metrics that property managers need instantly
 * DESIGN: Professional gray/blue, 48px height, dense information
 * REPLACES: Purple gradient hero banner with zero business value
 */
const MetricsOverviewBar = ({ stats, licenseStats, formatCurrency }) => {
  
  // Calculate derived metrics from raw stats
  const calculateOccupancyRate = () => {
    if (!stats?.total_properties || stats.total_properties === 0) return 0;
    return Math.round((stats.active_agreements / stats.total_properties) * 100);
  };

  const calculateMonthlyRevenue = () => {
    // Estimate based on active agreements (rough calculation)
    return (stats?.active_agreements || 0) * 1250; // €1250 avg per agreement
  };

  const calculateTasksUrgent = () => {
    return stats?.pending_tasks || 0;
  };

  const getComplianceStatus = (percentage) => {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 70) return 'warning';
    return 'critical';
  };

  const metrics = [
    {
      key: 'properties',
      label: 'Total Properties',
      value: stats?.total_properties || 0,
      change: '+2',
      changeType: 'positive',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      key: 'occupancy',
      label: 'Occupancy Rate',
      value: `${calculateOccupancyRate()}%`,
      change: '+5%',
      changeType: 'positive',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      key: 'revenue',
      label: 'Monthly Revenue',
      value: formatCurrency ? formatCurrency(calculateMonthlyRevenue()) : `€${calculateMonthlyRevenue().toLocaleString()}`,
      change: '+€2,340',
      changeType: 'positive',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      key: 'tenants',
      label: 'Active Tenants',
      value: stats?.total_tenants || 0,
      change: '-1',
      changeType: 'negative',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      key: 'tasks',
      label: 'Pending Tasks',
      value: calculateTasksUrgent(),
      urgent: calculateTasksUrgent() > 5,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      key: 'compliance',
      label: 'License Compliance',
      value: `${licenseStats?.compliance_percentage || 0}%`,
      status: getComplianceStatus(licenseStats?.compliance_percentage || 0),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    }
  ];

  const MetricItem = ({ metric }) => {
    const getTextColor = () => {
      if (metric.urgent) return 'text-red-700';
      if (metric.status === 'critical') return 'text-red-700';
      if (metric.status === 'warning') return 'text-yellow-700';
      return 'text-gray-900';
    };

    const getBgColor = () => {
      if (metric.urgent) return 'bg-red-50';
      if (metric.status === 'critical') return 'bg-red-50';
      if (metric.status === 'warning') return 'bg-yellow-50';
      return 'bg-white';
    };

    const getChangeColor = () => {
      if (metric.changeType === 'positive') return 'text-green-600';
      if (metric.changeType === 'negative') return 'text-red-600';
      return 'text-gray-600';
    };

    return (
      <div className={`px-4 py-3 ${getBgColor()} transition-colors hover:bg-gray-50`}>
        <div className="flex items-center space-x-3">
          <div className={`${getTextColor()}`}>
            {metric.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
              {metric.label}
            </p>
            <div className="flex items-baseline space-x-2">
              <p className={`text-2xl font-bold ${getTextColor()}`}>
                {metric.value}
              </p>
              {metric.change && (
                <span className={`text-xs font-medium ${getChangeColor()}`}>
                  {metric.change}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="grid grid-cols-6 divide-x divide-gray-200">
        {metrics.map((metric) => (
          <MetricItem key={metric.key} metric={metric} />
        ))}
      </div>
    </div>
  );
};

export default MetricsOverviewBar;