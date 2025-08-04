// src/components/TasksView.js
import React, { useState, useEffect } from 'react';
import cachedAxios from '../utils/cachedAxios';
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
      const response = await cachedAxios.get(`${API}/v1/activities/task/${taskId}`);
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
    return user ? user.full_name : t('tasks.unassigned');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100 p-6">
      {/* Modern Header with Glassmorphism */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ✅ {t('tasks.taskOrders')}
                </h1>
                <p className="text-gray-600 mt-1">Efficient task management and tracking system</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => exportTasks(filteredTasks)}
                className="group relative px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>📊 {t('common.export')}</span>
                </div>
              </button>
              <button onClick={() => handleNav('create-task')} className="group relative px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>✨ {t('tasks.createTaskOrder')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters with Glassmorphism */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-2xl blur-lg opacity-10"></div>
        <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-xl">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">🔍 Smart Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">⚡</span>
                {t('common.status')}
              </label>
              <div className="relative">
                <select
                  value={taskFilter.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                >
                  <option value="">{t('tasks.allStatuses')}</option>
                  <option value="pending">{t('tasks.pending')}</option>
                  <option value="in_progress">{t('tasks.inProgress')}</option>
                  <option value="completed">{t('tasks.completed')}</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">🔥</span>
                {t('tasks.priority')}
              </label>
              <div className="relative">
                <select
                  value={taskFilter.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                >
                  <option value="">{t('tasks.allPriorities')}</option>
                  <option value="high">{t('tasks.high')}</option>
                  <option value="medium">{t('tasks.medium')}</option>
                  <option value="low">{t('tasks.low')}</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">👥</span>
                {t('tasks.assignedTo')}
              </label>
              <div className="relative">
                <select
                  value={taskFilter.assigned_to}
                  onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-300 font-medium group-hover:shadow-lg"
                >
                  <option value="">{t('tasks.allAssignees')}</option>
                  {usersList.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 rounded-3xl blur-lg opacity-10"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-16 border border-white/30 shadow-xl text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              ✅ {t('tasks.noTasksFound')}
            </h3>
            <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
              {t('tasks.noTasksMessage')}
            </p>
            <button
              onClick={() => handleNav('create-task')}
              className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>✨ {t('tasks.createTaskOrder')}</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredTasks.map((task, index) => {
            const getPriorityEmoji = (priority) => {
              switch (priority) {
                case 'high': return '🔥';
                case 'medium': return '⚡';
                case 'low': return '🔋';
                default: return '📄';
              }
            };

            const getStatusEmoji = (status) => {
              switch (status) {
                case 'pending': return '⏳';
                case 'in_progress': return '🔄';
                case 'completed': return '✅';
                default: return '📄';
              }
            };

            const getPriorityGradient = (priority) => {
              switch (priority) {
                case 'high': return 'from-red-500 to-orange-600';
                case 'medium': return 'from-yellow-500 to-orange-600';
                case 'low': return 'from-green-500 to-teal-600';
                default: return 'from-gray-500 to-slate-600';
              }
            };

            return (
              <div
                key={task.id}
                onClick={() => handleNav(`tasks/${task.id}`)}
                className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl hover:shadow-2xl transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/10 via-purple-500/5 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Floating Elements */}
                <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-400/20 rounded-full blur-sm group-hover:animate-pulse"></div>
                <div className="absolute bottom-6 left-6 w-4 h-4 bg-purple-500/20 rounded-full blur-sm group-hover:animate-bounce"></div>

                {/* Task Header */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-4 bg-gradient-to-br ${getPriorityGradient(task.priority)} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-2xl">{getPriorityEmoji(task.priority)}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors duration-300 line-clamp-2">
                          {task.subject}
                        </h3>
                        <p className="text-gray-500 text-sm">ID: {task.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="space-y-4">
                    {/* Priority and Status Row */}
                    <div className="flex items-center justify-between gap-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)} shadow-sm`}>
                        {getPriorityEmoji(task.priority)} {task.priority}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(task.status)} shadow-sm`}>
                        {getStatusEmoji(task.status)} {task.status}
                      </span>
                    </div>

                    {/* Assigned To */}
                    <div className="bg-blue-50/50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center">
                        <span className="mr-2">👥</span>
                        {t('tasks.assignedTo')}
                      </div>
                      <div className="text-sm font-medium text-gray-800">{getUserName(task.assigned_to)}</div>
                    </div>

                    {/* Due Date and Budget Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-purple-50/50 rounded-xl p-4">
                        <div className="text-xs font-semibold text-purple-700 mb-2 flex items-center">
                          <span className="mr-2">📅</span>
                          {t('tasks.dueDate')}
                        </div>
                        <div className="text-sm font-medium text-gray-800">{formatDate(task.due_date)}</div>
                      </div>
                      
                      <div className="bg-green-50/50 rounded-xl p-4">
                        <div className="text-xs font-semibold text-green-700 mb-2 flex items-center">
                          <span className="mr-2">💰</span>
                          {t('tasks.budget')}
                        </div>
                        <div className="text-sm font-bold text-green-800">{formatCurrency(task.budget)}</div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 border-t border-gray-200/50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNav(`tasks/${task.id}`);
                        }}
                        className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>👁️ View Task</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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