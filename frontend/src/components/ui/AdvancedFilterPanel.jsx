// Advanced Filter Panel - Enterprise Data Filtering System
// Professional per-column filtering with auto-complete and smart suggestions

import React, { useState, useEffect, useMemo } from 'react';

const AdvancedFilterPanel = ({ 
  columns = [], 
  data = [],
  onFiltersChange, 
  activeFilters = {},
  onClose
}) => {
  const [filters, setFilters] = useState(activeFilters);
  const [searchTerms, setSearchTerms] = useState({});

  // Extract unique values for each filterable column
  const columnValues = useMemo(() => {
    const values = {};
    
    columns.filter(col => col.filterable).forEach(column => {
      const uniqueValues = new Set();
      
      data.forEach(row => {
        let value = row[column.key];
        
        // Handle different value types
        if (value !== null && value !== undefined && value !== '') {
          if (column.filterTransform) {
            value = column.filterTransform(value, row);
          } else if (typeof value === 'object') {
            // Extract text from objects/components
            value = String(value);
          }
          
          uniqueValues.add(String(value).trim());
        }
      });
      
      values[column.key] = Array.from(uniqueValues).sort();
    });
    
    return values;
  }, [columns, data]);

  // Update filters
  const updateFilter = (columnKey, value) => {
    const newFilters = { ...filters };
    
    if (value === '' || value === null || value === undefined) {
      delete newFilters[columnKey];
    } else {
      newFilters[columnKey] = value;
    }
    
    setFilters(newFilters);
  };

  // Update search terms for auto-complete
  const updateSearchTerm = (columnKey, term) => {
    setSearchTerms(prev => ({
      ...prev,
      [columnKey]: term
    }));
  };

  // Apply filters
  const applyFilters = () => {
    onFiltersChange(filters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({});
    setSearchTerms({});
  };

  // Get filtered suggestions for auto-complete
  const getFilteredSuggestions = (columnKey, searchTerm) => {
    const values = columnValues[columnKey] || [];
    if (!searchTerm) return values.slice(0, 10);
    
    return values
      .filter(value => 
        value.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 10);
  };

  // Render filter field based on column type
  const renderFilterField = (column) => {
    const currentValue = filters[column.key] || '';
    const searchTerm = searchTerms[column.key] || '';
    const suggestions = getFilteredSuggestions(column.key, searchTerm);

    switch (column.filterType) {
      case 'select':
        return (
          <select
            value={currentValue}
            onChange={(e) => updateFilter(column.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All {column.label}</option>
            {suggestions.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        );

      case 'number_range':
        return (
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={currentValue.min || ''}
              onChange={(e) => updateFilter(column.key, { 
                ...currentValue, 
                min: e.target.value 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={currentValue.max || ''}
              onChange={(e) => updateFilter(column.key, { 
                ...currentValue, 
                max: e.target.value 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      case 'date_range':
        return (
          <div className="flex space-x-2">
            <input
              type="date"
              value={currentValue.start || ''}
              onChange={(e) => updateFilter(column.key, { 
                ...currentValue, 
                start: e.target.value 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="date"
              value={currentValue.end || ''}
              onChange={(e) => updateFilter(column.key, { 
                ...currentValue, 
                end: e.target.value 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      default: // text search with auto-complete
        return (
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                updateSearchTerm(column.key, e.target.value);
                updateFilter(column.key, e.target.value);
              }}
              placeholder={`Search ${column.label.toLowerCase()}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            {/* Auto-complete dropdown */}
            {searchTerm && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map(suggestion => (
                  <div
                    key={suggestion}
                    onClick={() => {
                      updateFilter(column.key, suggestion);
                      updateSearchTerm(column.key, suggestion);
                    }}
                    className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  // Get filter count
  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
              {activeFilterCount} active
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={clearAllFilters}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Clear all
          </button>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Fields */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {columns.filter(col => col.filterable).map(column => (
            <div key={column.key} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {column.label}
                {column.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              {renderFilterField(column)}
              
              {/* Filter hint */}
              {column.filterHint && (
                <p className="text-xs text-gray-500">{column.filterHint}</p>
              )}
            </div>
          ))}
        </div>

        {/* No filterable columns message */}
        {columns.filter(col => col.filterable).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            <p className="text-sm">No filterable columns available</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
        <button 
          onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={applyFilters}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default AdvancedFilterPanel;