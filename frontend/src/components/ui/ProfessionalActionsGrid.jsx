import React from 'react';

/**
 * Professional Actions Grid - Replace 4 Giant Gradient Cards with 8 Compact Professional Buttons
 * 
 * BUSINESS PURPOSE: Quick access to core business functions
 * VISUAL: Professional gray/white buttons vs consumer rainbow gradients
 * SIZE: 40px height vs 200px+ gradient cards = 80% space savings
 */
const ProfessionalActionsGrid = ({ onActionClick }) => {

  const PROFESSIONAL_ACTIONS = [
    {
      key: 'add_property',
      label: 'Add Property',
      route: 'properties/new',
      description: 'Smart Forms',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      key: 'create_contract',
      label: 'Create Contract',
      route: 'contracts/new',
      description: 'Quick Setup',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      key: 'add_tenant',
      label: 'Add Tenant',
      route: 'accounts/new?type=tenant',
      description: 'Account System',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    },
    {
      key: 'create_task',
      label: 'Create Task',
      route: 'tasks/new',
      description: 'Real-time',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      key: 'generate_report',
      label: 'Generate Report',
      route: 'reports',
      description: 'Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      key: 'schedule_inspection',
      label: 'Schedule Inspection',
      route: 'tasks/new?type=inspection',
      description: 'Compliance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      key: 'process_payment',
      label: 'Process Payment',
      route: 'invoices?filter=unpaid',
      description: 'Financial',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      key: 'view_analytics',
      label: 'View Analytics',
      route: 'analytics',
      description: 'Insights',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
  ];

  const ActionButton = ({ action }) => (
    <button
      onClick={() => onActionClick(action.route)}
      className="group p-4 text-center hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 hover:shadow-sm hover:border-gray-300"
    >
      <div className="flex flex-col items-center space-y-2">
        <div className="text-gray-600 group-hover:text-blue-600 transition-colors">
          {action.icon}
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
            {action.label}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {action.description}
          </div>
        </div>
      </div>
    </button>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-600 mt-1">Common business operations</p>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {PROFESSIONAL_ACTIONS.map((action) => (
            <ActionButton key={action.key} action={action} />
          ))}
        </div>
        
        {/* Usage Analytics */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Most used: Add Property</span>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Customize →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalActionsGrid;