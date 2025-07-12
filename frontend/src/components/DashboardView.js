// src/components/DashboardView.js
import React from 'react';

const DashboardView = ({ stats, properties, assignedTasks, getPriorityColor, getStatusColor, getPropertyTypeColor, formatDate, formatCurrency, handleNav, viewedTasks, setViewedTasks, t, logAction }) => {
  const handleClick = (view) => {
    logAction('click_dashboard_item', { view });
    handleNav(view);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('Dashboard Overview')}</h2>
      
      {/* Stats Cards - clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div onClick={() => handleClick('properties')} className="cursor-pointer bg-white overflow-hidden shadow rounded-lg hover:shadow-md">
          {/* ... content */}
        </div>
        // Similar for tenants, agreements, invoices
      </div>

      {/* Assigned Tasks */}
      <div className="bg-white shadow rounded-lg mb-8">
        // Table with NEW badge
        <tbody>
          {assignedTasks.map((task) => (
            <tr key={task.id} onClick={() => {
              setViewedTasks(prev => [...prev, task.id]);
              logAction('view_task', { taskId: task.id });
            }}>
              // ... 
              {!viewedTasks.includes(task.id) && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded ml-2">NEW</span>}
            </tr>
          ))}
        </tbody>
      </div>

      {/* Recent Properties - clickable rows */}
      <div className="bg-white shadow rounded-lg mb-8">
        <tbody>
          {properties.slice(0, 5).map((property) => (
            <tr key={property.id} onClick={() => handleClick('properties')} className="cursor-pointer hover:bg-gray-50">
              // ...
            </tr>
          ))}
        </tbody>
      </div>
    </div>
  );
};

export default DashboardView;