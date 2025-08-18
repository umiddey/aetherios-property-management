import React from 'react';

/**
 * Upcoming Tasks Table - Show Pending Tasks in Compact Table Format
 * 
 * BUSINESS PURPOSE: Property managers see urgent tasks requiring immediate attention
 * DESIGN: Dense table with priorities, deadlines, and quick actions
 */
const UpcomingTasksTable = ({ 
  tasks = [], 
  onTaskClick, 
  formatDate, 
  getPriorityColor, 
  getStatusColor 
}) => {

  // Sort tasks by priority and deadline
  const sortedTasks = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    
    return [...tasks]
      .filter(task => task.status !== 'completed') // Only show active tasks
      .sort((a, b) => {
        // Sort by priority first (high -> medium -> low)
        const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
        const aPriority = priorityOrder[a.priority] ?? 4;
        const bPriority = priorityOrder[b.priority] ?? 4;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Then sort by created date (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      })
      .slice(0, 8); // Show max 8 tasks in dashboard
  }, [tasks]);

  const getPriorityBadge = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${colors[priority] || colors.low}`}>
        {priority || 'low'}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${colors[status] || colors.pending}`}>
        {status?.replace('_', ' ') || 'pending'}
      </span>
    );
  };

  const getRelativeDeadline = (createdAt) => {
    // Estimate deadline based on created date (for demo)
    const created = new Date(createdAt);
    const deadline = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from creation
    const now = new Date();
    const diff = deadline - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: `${Math.abs(days)} days overdue`, urgent: true };
    if (days === 0) return { text: 'Due today', urgent: true };
    if (days === 1) return { text: 'Due tomorrow', urgent: true };
    if (days <= 3) return { text: `${days} days left`, urgent: false };
    return { text: `${days} days left`, urgent: false };
  };

  if (!sortedTasks || sortedTasks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <p className="text-lg font-medium mb-2">No Pending Tasks</p>
        <p className="text-sm">All tasks have been completed</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Priority
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deadline
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedTasks.map((task) => {
            const deadline = getRelativeDeadline(task.created_at);
            
            return (
              <tr 
                key={task.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onTaskClick && onTaskClick(task)}
              >
                {/* Task Title & Description */}
                <td className="px-3 py-3">
                  <div className="max-w-xs">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {task.subject || task.title || 'Untitled Task'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {task.description || task.property_name || 'No description'}
                    </div>
                  </div>
                </td>

                {/* Priority */}
                <td className="px-3 py-3">
                  {getPriorityBadge(task.priority)}
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  {getStatusBadge(task.status)}
                </td>

                {/* Deadline */}
                <td className="px-3 py-3">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${deadline.urgent ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {deadline.text}
                    </span>
                    {deadline.urgent && (
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Footer with summary */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            {sortedTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length} urgent tasks
          </span>
          <button 
            className="text-blue-600 hover:text-blue-800 font-medium"
            onClick={() => onTaskClick && onTaskClick({ id: 'all' })}
          >
            View All Tasks →
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpcomingTasksTable;