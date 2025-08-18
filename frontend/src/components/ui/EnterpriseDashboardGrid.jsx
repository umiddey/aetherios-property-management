import React from 'react';
import MetricsOverviewBar from './MetricsOverviewBar';
import PropertyPortfolioTable from './PropertyPortfolioTable';
import FinancialSummaryCard from './FinancialSummaryCard';
import CriticalAlertsCard from './CriticalAlertsCard';
import ProfessionalActionsGrid from './ProfessionalActionsGrid';
import RecentActivityFeed from './RecentActivityFeed';
import UpcomingTasksTable from './UpcomingTasksTable';

/**
 * Enterprise Dashboard Grid - Information-Dense Business Intelligence Layout
 * 
 * BUSINESS PURPOSE: Transform consumer "mobile game" dashboard into enterprise command center
 * INFORMATION DENSITY: 80% screen utilization vs current 30%
 * TARGET: Property managers see ALL critical data without clicking
 */
const EnterpriseDashboardGrid = ({
  stats,
  licenseStats,
  expiringLicenses,
  recentProperties,
  assignedTasks,
  recentActivities,
  onNavigate,
  formatDate,
  formatCurrency,
  getStatusColor,
  getPriorityColor
}) => {
  return (
    <div className="enterprise-dashboard space-y-6">
      {/* METRICS OVERVIEW BAR - Full Width Critical KPIs */}
      <div className="col-span-12">
        <MetricsOverviewBar 
          stats={stats}
          licenseStats={licenseStats}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* MAIN CONTENT GRID - 12 Column Enterprise Layout */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN - Primary Data Tables (8 columns = 67% width) */}
        <div className="col-span-8 space-y-6">
          
          {/* PROPERTY PORTFOLIO TABLE - Core Business Data */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Property Portfolio</h2>
              <p className="text-sm text-gray-600 mt-1">
                {recentProperties?.length || 0} properties • Real-time status
              </p>
            </div>
            <PropertyPortfolioTable
              properties={recentProperties}
              onRowClick={(property) => onNavigate(`properties/${property.id}`)}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
            />
          </div>

          {/* BOTTOM ROW - Secondary Data Tables */}
          <div className="grid grid-cols-2 gap-6">
            
            {/* RECENT ACTIVITY FEED */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <p className="text-sm text-gray-600 mt-1">Latest system updates</p>
              </div>
              <RecentActivityFeed
                activities={recentActivities}
                formatDate={formatDate}
                onActivityClick={(activity) => onNavigate(`${activity.type}s/${activity.id}`)}
              />
            </div>

            {/* UPCOMING TASKS TABLE */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Pending Tasks</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {assignedTasks?.length || 0} active tasks
                </p>
              </div>
              <UpcomingTasksTable
                tasks={assignedTasks}
                onTaskClick={(task) => onNavigate(`tasks/${task.id}`)}
                formatDate={formatDate}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - KPIs & Actions (4 columns = 33% width) */}
        <div className="col-span-4 space-y-6">
          
          {/* FINANCIAL SUMMARY CARD */}
          <FinancialSummaryCard
            stats={stats}
            formatCurrency={formatCurrency}
          />

          {/* CRITICAL ALERTS CARD */}
          <CriticalAlertsCard
            stats={stats}
            licenseStats={licenseStats}
            expiringLicenses={expiringLicenses}
            assignedTasks={assignedTasks}
            onAlertClick={onNavigate}
          />

          {/* PROFESSIONAL ACTIONS GRID */}
          <ProfessionalActionsGrid
            onActionClick={onNavigate}
          />
        </div>
      </div>
    </div>
  );
};

export default EnterpriseDashboardGrid;