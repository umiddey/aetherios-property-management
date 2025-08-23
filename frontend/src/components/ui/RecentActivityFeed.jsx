import React from 'react';

/**
 * Recent Activity Feed - Show Latest System Updates
 * 
 * BUSINESS PURPOSE: Keep property managers informed of recent changes
 * DESIGN: Compact timeline with actionable items
 */
const RecentActivityFeed = ({ activities = [], formatDate, onActivityClick }) => {
  
  // Mock activities if none provided (for demo purposes)
  const mockActivities = [
    {
      id: '1',
      type: 'property',
      title: 'Sunset Villa',
      description: 'New property added',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      created_by: 'Admin'
    },
    {
      id: '2', 
      type: 'tenant',
      title: 'John Smith',
      description: 'Tenant contract signed',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      created_by: 'Agent'
    },
    {
      id: '3',
      type: 'invoice',
      title: 'Invoice #2024-001',
      description: 'Payment received - €1,250',
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      created_by: 'System'
    },
    {
      id: '4',
      type: 'task',
      title: 'Kitchen Repair',
      description: 'Maintenance task completed',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      created_by: 'Contractor'
    }
  ];

  const displayActivities = activities.length > 0 ? activities : mockActivities;

  const getActivityIcon = (type) => {
    switch (type) {
      case 'property':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'tenant':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'invoice':
        return (
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'task':
        return (
          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const ActivityItem = ({ activity }) => (
    <div 
      className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => onActivityClick && onActivityClick(activity)}
    >
      <div className="flex-shrink-0 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center">
        {getActivityIcon(activity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {activity.title}
          </p>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {getRelativeTime(activity.created_at)}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {activity.description}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">
            by {activity.created_by}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            activity.type === 'property' ? 'bg-blue-100 text-blue-700' :
            activity.type === 'tenant' ? 'bg-green-100 text-green-700' :
            activity.type === 'invoice' ? 'bg-purple-100 text-purple-700' :
            activity.type === 'task' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {activity.type}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-h-96 overflow-y-auto">
      {displayActivities.length > 0 ? (
        <div className="space-y-2 p-4">
          {displayActivities.slice(0, 8).map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
          
          {/* Load more button */}
          <div className="pt-2 border-t border-gray-200">
            <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2">
              View All Activity →
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No recent activity</p>
        </div>
      )}
    </div>
  );
};

export default RecentActivityFeed;