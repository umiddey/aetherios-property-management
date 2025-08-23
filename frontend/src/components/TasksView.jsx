// src/components/TasksView.js - ENTERPRISE TASK MANAGEMENT
import React, { useState, useEffect, useMemo } from 'react';
import cachedAxios from '../utils/cachedAxios';
import { useLanguage } from '../contexts/LanguageContext';
import Pagination from './Pagination';
import { exportTasks } from '../utils/exportUtils';
import EnterpriseDataTable from './ui/EnterpriseDataTable';
import EnterpriseSearchBar from './ui/EnterpriseSearchBar';
import { TASKS_TABLE_COLUMNS, TASKS_BASIC_FILTERS } from './TasksTableConfig.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TasksView = ({
  taskOrders,
  totalPages,
  currentPage,
  onPageChange,
  selectedTask,
  setSelectedTask,
  handleNav,
  getPriorityColor,
  getStatusColor,
  formatDate,
  formatCurrency,
  usersList,
  logAction
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [density, setDensity] = useState('compact');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [taskActivities, setTaskActivities] = useState([]);
  const [taskFilter, setTaskFilter] = useState({
    status: '',
    priority: '',
    assigned_to: ''
  });

  // Enhanced column configuration with context data
  const enhancedColumns = useMemo(() => {
    return TASKS_TABLE_COLUMNS.map(column => ({
      ...column,
      render: column.render ? (value, row) => 
        column.render(value, row, { 
          getPriorityColor,
          getStatusColor,
          formatDate,
          formatCurrency,
          usersList,
          handleNav,
          getPropertyName: (id) => `Property ${id}` // Simple fallback
        }) : undefined
    }));
  }, [getPriorityColor, getStatusColor, formatDate, formatCurrency, usersList, handleNav]);

  const handleSort = (config) => {
    setSortConfig(config);
  };

  const handleTaskClick = (task) => {
    handleNav(`tasks/${task.id}`);
  };

  const handleExport = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'subject', label: 'Subject' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'assigned_to', label: 'Assigned To' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'created_at', label: 'Created Date' }
    ];
    exportTasks(taskOrders, `tasks-${currentDate}`, columns);
  };

  // Fetch task activities (if needed)
  useEffect(() => {
    const fetchTaskActivities = async () => {
      try {
        const response = await cachedAxios.get(`${API}/v1/tasks/activities`);
        setTaskActivities(response.data || []);
      } catch (error) {
        console.error('Error fetching task activities:', error);
        setTaskActivities([]);
      }
    };

    fetchTaskActivities();
  }, []);

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {t('tasks.title') || 'Tasks'}
                </h1>
                <p className="text-gray-600 text-sm">{t('tasks.manageTasksEfficiently') || 'Manage tasks and work orders efficiently'}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleExport}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{t('common.export')}</span>
              </button>
              <button 
                onClick={() => handleNav('create-task')} 
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>{t('tasks.createTaskOrder') || 'Create Task'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Search */}
      <div>
        <EnterpriseSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t('tasks.searchPlaceholder') || 'Search tasks, descriptions, assignees...'}
          className="max-w-md"
        />
      </div>

      {/* Enterprise Data Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <EnterpriseDataTable
          data={taskOrders}
          columns={enhancedColumns}
          sortConfig={sortConfig}
          onSort={handleSort}
          onRowClick={handleTaskClick}
          loading={false}
          density={density}
          onDensityChange={setDensity}
          selectable={true}
          onSelectionChange={setSelectedTasks}
          searchTerm={searchTerm}
        />
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />

      {/* Selected Task Details (Legacy) */}
      {selectedTask && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('tasks.taskDetails')} - {selectedTask.subject || selectedTask.id}
          </h3>
          <div className="space-y-4">
            <p><strong>{t('tasks.subject')}:</strong> {selectedTask.subject}</p>
            <p><strong>{t('tasks.description')}:</strong> {selectedTask.description}</p>
            <p><strong>{t('common.status')}:</strong> {selectedTask.status}</p>
            <p><strong>{t('tasks.priority')}:</strong> {selectedTask.priority}</p>
            {selectedTask.assigned_to && (
              <p><strong>{t('tasks.assignedTo')}:</strong> {selectedTask.assigned_to}</p>
            )}
            {selectedTask.due_date && (
              <p><strong>{t('tasks.dueDate')}:</strong> {formatDate(selectedTask.due_date)}</p>
            )}
            <p><strong>{t('common.created')}:</strong> {formatDate(selectedTask.created_at)}</p>
          </div>

          {/* Task Activities */}
          {taskActivities.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-2">{t('tasks.taskActivities')}</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {taskActivities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="border-b py-2">
                    <p className="text-sm text-gray-700">{activity.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TasksView;