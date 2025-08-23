// ENTERPRISE TASK TABLE CONFIGURATION - OPERATIONAL INTELLIGENCE
export const TASKS_TABLE_COLUMNS = [
  {
    key: 'id',
    label: 'Task ID',
    width: '100px',
    sortable: true,
    critical: true,
    render: (value) => (
      <code className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
        {value}
      </code>
    )
  },
  {
    key: 'subject',
    label: 'Task',
    width: '250px',
    sortable: true,
    searchable: true,
    critical: true,
    render: (value, row) => (
      <div>
        <div className="text-sm font-medium text-gray-900 line-clamp-2">
          {value || 'Untitled Task'}
        </div>
        {row.description && (
          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
            {row.description}
          </div>
        )}
      </div>
    )
  },
  {
    key: 'priority',
    label: 'Priority',
    width: '90px',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'All Priorities' },
      { value: 'urgent', label: 'Urgent' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' }
    ],
    render: (value, row, { getPriorityColor }) => {
      const priority = value || 'medium';
      const colors = {
        urgent: 'bg-red-100 text-red-800 border-red-200',
        high: 'bg-orange-100 text-orange-800 border-orange-200',
        medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        low: 'bg-gray-100 text-gray-800 border-gray-200'
      };
      
      const priorityEmojis = {
        urgent: '🚨',
        high: '⚡',
        medium: '⚠️',
        low: '📝'
      };
      
      return (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${colors[priority] || colors.medium}`}>
          <span className="mr-1">{priorityEmojis[priority] || priorityEmojis.medium}</span>
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </span>
      );
    }
  },
  {
    key: 'status',
    label: 'Status',
    width: '110px',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'All Statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ],
    render: (value, row, { getStatusColor }) => {
      const status = value || 'pending';
      const colors = {
        pending: 'bg-yellow-100 text-yellow-800',
        in_progress: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-gray-100 text-gray-800'
      };
      
      const statusEmojis = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        cancelled: '❌'
      };
      
      return (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${colors[status] || colors.pending}`}>
          <span className="mr-1">{statusEmojis[status] || statusEmojis.pending}</span>
          {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
        </span>
      );
    }
  },
  {
    key: 'assigned_to',
    label: 'Assignee',
    width: '150px',
    sortable: true,
    searchable: true,
    filterable: true,
    filterType: 'select',
    render: (value, row, { usersList }) => {
      if (!value) {
        return <span className="text-xs text-gray-400 italic">Unassigned</span>;
      }
      
      // Find user name from usersList if available
      const assignee = usersList?.find(user => user.id === value);
      const displayName = assignee ? assignee.full_name || `${assignee.first_name} ${assignee.last_name}` : value;
      
      return (
        <div className="text-sm text-gray-900">
          {displayName}
        </div>
      );
    }
  },
  {
    key: 'property',
    label: 'Property',
    width: '160px',
    sortable: true,
    searchable: true,
    filterable: true,
    render: (value, row, { getPropertyName }) => {
      if (!row.property_id) {
        return <span className="text-xs text-gray-400">No property</span>;
      }
      
      return (
        <div className="text-sm text-gray-900">
          {getPropertyName ? getPropertyName(row.property_id) : row.property_name || `Property ${row.property_id}`}
        </div>
      );
    }
  },
  {
    key: 'due_date',
    label: 'Due Date',
    width: '110px',
    sortable: true,
    filterable: true,
    filterType: 'date_range',
    render: (value, row, { formatDate }) => {
      if (!value) return <span className="text-xs text-gray-400">No due date</span>;
      
      const dueDate = new Date(value);
      const now = new Date();
      const isOverdue = dueDate < now && row.status !== 'completed';
      const isDueSoon = dueDate < new Date(Date.now() + 24 * 60 * 60 * 1000) && row.status !== 'completed'; // Due within 24 hours
      
      return (
        <div className="text-xs">
          <div className={`font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-gray-900'}`}>
            {formatDate ? formatDate(value) : dueDate.toLocaleDateString()}
          </div>
          {isOverdue && (
            <div className="text-red-500 font-bold">Overdue</div>
          )}
          {isDueSoon && !isOverdue && (
            <div className="text-orange-500 font-medium">Due Soon</div>
          )}
        </div>
      );
    }
  },
  {
    key: 'created_at',
    label: 'Created',
    width: '100px',
    sortable: true,
    filterable: true,
    filterType: 'date_range',
    render: (value, row, { formatDate }) => (
      <span className="text-xs text-gray-600">
        {value ? (formatDate ? formatDate(value) : new Date(value).toLocaleDateString()) : 'Unknown'}
      </span>
    )
  },
  {
    key: 'completion',
    label: 'Progress',
    width: '90px',
    render: (value, row) => {
      // Calculate progress based on status
      const progressMap = {
        pending: 0,
        in_progress: 50,
        completed: 100,
        cancelled: 0
      };
      
      const progress = progressMap[row.status] || 0;
      const color = progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-blue-500' : 'bg-gray-300';
      
      return (
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${color}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-600 w-8">{progress}%</span>
        </div>
      );
    }
  },
  {
    key: 'actions',
    label: 'Actions',
    width: '120px',
    render: (value, row, { handleNav }) => (
      <div className="flex space-x-1">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleNav(`tasks/${row.id}`);
          }}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50"
        >
          View
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            // Handle task edit
          }}
          className="text-gray-600 hover:text-gray-800 text-xs font-medium px-2 py-1 rounded hover:bg-gray-50"
        >
          Edit
        </button>
      </div>
    )
  }
];

// BASIC FILTERS - OPERATIONAL TASK MANAGEMENT
export const TASKS_BASIC_FILTERS = [
  {
    key: 'status',
    label: 'Task Status',
    type: 'select',
    options: [
      { value: '', label: 'All Statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ]
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { value: '', label: 'All Priorities' },
      { value: 'urgent', label: 'Urgent' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' }
    ]
  },
  {
    key: 'assignment',
    label: 'Assignment',
    type: 'select',
    options: [
      { value: '', label: 'All Tasks' },
      { value: 'assigned', label: 'Assigned' },
      { value: 'unassigned', label: 'Unassigned' },
      { value: 'my_tasks', label: 'My Tasks' }
    ]
  },
  {
    key: 'due_urgency',
    label: 'Due Urgency',
    type: 'select',
    options: [
      { value: '', label: 'All Due Dates' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'due_today', label: 'Due Today' },
      { value: 'due_week', label: 'Due This Week' },
      { value: 'no_due_date', label: 'No Due Date' }
    ]
  }
];