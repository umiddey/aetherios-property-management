// Basic Filter Panel - Generic Quick Filters for Enterprise Tables
// Displays common quick filters based on column configuration

import React from 'react';

const BasicFilterPanel = ({ 
  columns = [], 
  data = [],
  activeFilters = {},
  onFiltersChange,
  onToggle,
  isOpen = false
}) => {
  // Get basic filterable columns (columns marked with basicFilter: true)
  const basicFilterColumns = columns.filter(col => col.basicFilter);

  if (basicFilterColumns.length === 0) {
    return null;
  }

  // Update filter value
  const updateFilter = (columnKey, value) => {
    const newFilters = { ...activeFilters };
    
    if (value === '' || value === null || value === undefined) {
      delete newFilters[columnKey];
    } else {
      newFilters[columnKey] = value;
    }
    
    onFiltersChange(newFilters);
  };

  // Get unique values for select filters
  const getUniqueValues = (columnKey) => {
    const values = new Set();
    data.forEach(row => {
      const value = row[columnKey];
      if (value !== null && value !== undefined && value !== '') {
        values.add(String(value).trim());
      }
    });
    return Array.from(values).sort();
  };

  // Render filter field based on type
  const renderFilterField = (column) => {
    const currentValue = activeFilters[column.key] || '';

    switch (column.basicFilterType || column.filterType) {
      case 'select':
        const options = getUniqueValues(column.key);
        return (
          <select
            value={currentValue}
            onChange={(e) => updateFilter(column.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">All {column.label}</option>
            {options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'toggle':
        return (
          <label className="flex items-center bg-white border border-gray-300 px-4 py-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={currentValue === true}
              onChange={(e) => updateFilter(column.key, e.target.checked)}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">{column.basicFilterLabel || column.label}</span>
          </label>
        );

      case 'range':
        const rangeValue = typeof currentValue === 'object' ? currentValue : {};
        return (
          <div className="flex space-x-3">
            <input
              type="number"
              placeholder="Min"
              value={rangeValue.min || ''}
              onChange={(e) => updateFilter(column.key, { 
                ...rangeValue, 
                min: e.target.value 
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full text-gray-900"
            />
            <input
              type="number"
              placeholder="Max"
              value={rangeValue.max || ''}
              onChange={(e) => updateFilter(column.key, { 
                ...rangeValue, 
                max: e.target.value 
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full text-gray-900"
            />
          </div>
        );

      default: // text
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => updateFilter(column.key, e.target.value)}
            placeholder={`Filter ${column.label.toLowerCase()}...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        );
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-900">Quick Filters</h4>
        <button 
          onClick={() => onFiltersChange({})}
          className="text-xs text-gray-600 hover:text-gray-800 underline"
        >
          Clear all
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {basicFilterColumns.map(column => (
          <div key={column.key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {column.label}
            </label>
            {renderFilterField(column)}
            {column.basicFilterHint && (
              <p className="text-xs text-gray-500">{column.basicFilterHint}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BasicFilterPanel;