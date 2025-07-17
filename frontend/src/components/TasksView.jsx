// src/components/TasksView.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import Pagination from './Pagination';
import { exportTasks } from '../utils/exportUtils';

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
      const response = await axios.get(`${API}/v1/activities/task/${taskId}`);
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
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          {t('common.filters')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={taskFilter.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          >
            <option value="">{t('tasks.allStatuses')}</option>
            <option value="pending">{t('tasks.pending')}</option>
            <option value="in_progress">{t('tasks.inProgress')}</option>
            <option value="completed">{t('tasks.completed')}</option>
          </select>
          <select
            value={taskFilter.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          >
            <option value="">{t('tasks.allPriorities')}</option>
            <option value="high">{t('tasks.high')}</option>
            <option value="medium">{t('tasks.medium')}</option>
            <option value="low">{t('tasks.low')}</option>
          </select>
          <select
            value={taskFilter.assigned_to}
            onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          >
            <option value="">{t('tasks.allAssignees')}</option>
            {usersList.map(user => (
              <option key={user.id} value={user.id}>{user.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              {t('tasks.taskOrders')}
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => exportTasks(filteredTasks)}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('common.export')}
              </button>
              <button onClick={() => handleNav('create-task')} className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl">
                {t('tasks.createTaskOrder')}
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tasks.subject')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tasks.priority')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('common.status')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tasks.assignedTo')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tasks.dueDate')}</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('tasks.budget')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredTasks.map(task => (
                <tr key={task.id} onClick={() => handleNav(`tasks/${task.id}`)} className="cursor-pointer hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 hover:shadow-md">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{task.subject}</p>
                        <p className="text-xs text-gray-500">ID: {task.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">{getUserName(task.assigned_to)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{formatDate(task.due_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-bold text-gray-900">{formatCurrency(task.budget)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <p className="text-sm font-medium">{t('tasks.noTasksFound')}</p>
                    </div>
                  </td>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('tasks.taskDetails')} - {selectedTask.subject}</h3>
          <div className="space-y-4">
            <p><strong>{t('common.description')}:</strong> {selectedTask.description}</p>
            <p><strong>{t('tasks.priority')}:</strong> {selectedTask.priority}</p>
            <p><strong>{t('common.status')}:</strong> {selectedTask.status}</p>
            <p><strong>{t('tasks.assignedTo')}:</strong> {getUserName(selectedTask.assigned_to)}</p>
            <p><strong>{t('tasks.dueDate')}:</strong> {formatDate(selectedTask.due_date)}</p>
            <p><strong>{t('tasks.budget')}:</strong> {formatCurrency(selectedTask.budget)}</p>
          </div>
          <h4 className="text-md font-semibold text-gray-900 mt-6 mb-2">{t('tasks.activities')}</h4>
          <ul className="space-y-2">
            {taskActivities.map(activity => (
              <li key={activity.id} className="border-b py-2">
                <p><strong>{formatDate(activity.activity_date)}:</strong> {activity.description} ({activity.hours_spent} hours)</p>
              </li>
            ))}
            {taskActivities.length === 0 && <p className="text-sm text-gray-500">{t('tasks.noActivitiesRecorded')}</p>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TasksView;