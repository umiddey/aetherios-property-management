// src/components/TasksView.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
  t,
  logAction
}) => {
  const { t: translate } = useTranslation();
  const [taskActivities, setTaskActivities] = useState([]);
  const [taskFilter, setTaskFilter] = useState({
    status: '',
    priority: '',
    assigned_to: ''
  });

  useEffect(() => {
    if (selectedTask) {
      fetchTaskActivities(selectedTask.id);
    }
  }, [selectedTask]);

  const fetchTaskActivities = async (taskId) => {
    try {
      const response = await axios.get(`${API}/activities/${taskId}`);
      setTaskActivities(response.data);
    } catch (error) {
      console.error('Error fetching task activities:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setTaskFilter(prev => ({ ...prev, [field]: value }));
    // Note: Actual filtering would require refetching with params, but since data is pre-fetched, filter client-side or adjust
  };

  const filteredTasks = taskOrders.filter(task => {
    return (
      (!taskFilter.status || task.status === taskFilter.status) &&
      (!taskFilter.priority || task.priority === taskFilter.priority) &&
      (!taskFilter.assigned_to || task.assigned_to === taskFilter.assigned_to)
    );
  });

  const getUserName = (userId) => {
    const user = usersList.find(u => u.id === userId);
    return user ? user.full_name : 'Unassigned';
  };

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Filters')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={taskFilter.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('All Statuses')}</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={taskFilter.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('All Priorities')}</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={taskFilter.assigned_to}
            onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('All Assignees')}</option>
            {usersList.map(user => (
              <option key={user.id} value={user.id}>{user.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">{t('Task Orders')}</h2>
          <button onClick={() => handleNav('create-task')} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            {t('Create Task Order')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Subject')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Priority')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Assigned To')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Due Date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Budget')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map(task => (
                <tr key={task.id} onClick={() => setSelectedTask(task)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getUserName(task.assigned_to)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(task.due_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(task.budget)}</td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">{t('No tasks found')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {/* Assume Pagination component is used */}
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />

      {/* Selected Task Details */}
      {selectedTask && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Task Details')} - {selectedTask.subject}</h3>
          <div className="space-y-4">
            <p><strong>{t('Description')}:</strong> {selectedTask.description}</p>
            <p><strong>{t('Priority')}:</strong> {selectedTask.priority}</p>
            <p><strong>{t('Status')}:</strong> {selectedTask.status}</p>
            <p><strong>{t('Assigned To')}:</strong> {getUserName(selectedTask.assigned_to)}</p>
            <p><strong>{t('Due Date')}:</strong> {formatDate(selectedTask.due_date)}</p>
            <p><strong>{t('Budget')}:</strong> {formatCurrency(selectedTask.budget)}</p>
          </div>
          <h4 className="text-md font-semibold text-gray-900 mt-6 mb-2">{t('Activities')}</h4>
          <ul className="space-y-2">
            {taskActivities.map(activity => (
              <li key={activity.id} className="border-b py-2">
                <p><strong>{formatDate(activity.activity_date)}:</strong> {activity.description} ({activity.hours_spent} hours)</p>
              </li>
            ))}
            {taskActivities.length === 0 && <p className="text-sm text-gray-500">{t('No activities recorded')}</p>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TasksView;