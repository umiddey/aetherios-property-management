import React, { useState, useEffect, useMemo } from 'react';
import AdvancedFilterPanel from './AdvancedFilterPanel';
import BasicFilterPanel from './BasicFilterPanel';

const EnterpriseDataTable = ({ 
  data = [], 
  columns = [], 
  sortConfig, 
  onSort, 
  onRowClick,
  loading = false,
  pagination,
  searchTerm = '',
  density = 'compact', // ultra, compact, normal, comfortable
  onDensityChange, // NEW: Callback for density changes
  selectable = false,
  onSelectionChange,
  onCellEdit // NEW: Callback for inline cell editing
}) => {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [optimizedColumns, setOptimizedColumns] = useState(columns);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [lastSelectedRow, setLastSelectedRow] = useState(null); // For shift+click range selection
  
  // Inline editing state
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnKey }
  const [editValue, setEditValue] = useState('');
  const [saveState, setSaveState] = useState(null); // { success, error, loading }
  
  // Filtering state
  const [showBasicFilters, setShowBasicFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [basicFilters, setBasicFilters] = useState({});
  const [advancedFilters, setAdvancedFilters] = useState({});
  
  // Column management state
  const [visibleColumns, setVisibleColumns] = useState(() => 
    columns.map(col => col.key)
  );
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [columnWidths, setColumnWidths] = useState(() => 
    columns.reduce((acc, col) => ({ 
      ...acc, 
      [col.key]: col.width || '120px' 
    }), {})
  );

  // Density configuration - Enterprise Information Density Modes
  const DENSITY_CONFIG = {
    ultra: { rowHeight: 'h-6', fontSize: 'text-xs', padding: 'px-2 py-1' }, // NEW: 24px rows - Maximum density
    compact: { rowHeight: 'h-8', fontSize: 'text-xs', padding: 'px-3 py-2' }, // 32px rows
    normal: { rowHeight: 'h-10', fontSize: 'text-sm', padding: 'px-4 py-3' }, // 40px rows  
    comfortable: { rowHeight: 'h-12', fontSize: 'text-sm', padding: 'px-6 py-4' } // 48px rows
  };

  const densityConfig = DENSITY_CONFIG[density];

  // Smart Column Width Optimization
  const calculateOptimalWidths = useMemo(() => {
    if (!data.length || !columns.length) return columns;
    
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const availableWidth = Math.max(screenWidth - 200, 800); // Account for sidebar/padding
    
    // Categorize columns by importance
    const criticalColumns = columns.filter(col => col.critical);
    const normalColumns = columns.filter(col => !col.critical);
    
    // Calculate content-based minimum widths
    const contentBasedWidths = columns.map(column => {
      const headerLength = column.label.length * 8; // Approx 8px per character
      const maxContentLength = data.slice(0, 10).reduce((max, row) => {
        const value = row[column.key];
        if (!value) return max;
        const displayLength = typeof value === 'object' ? 20 : value.toString().length;
        return Math.max(max, displayLength * 7); // Approx 7px per character
      }, 0);
      
      const minWidth = Math.max(headerLength, maxContentLength, 60); // Minimum 60px
      const maxWidth = parseInt(column.width?.replace('px', '')) || 200;
      
      return {
        ...column,
        calculatedWidth: Math.min(minWidth, maxWidth),
        originalWidth: column.width
      };
    });
    
    // Distribute available width
    const totalCalculatedWidth = contentBasedWidths.reduce((sum, col) => sum + col.calculatedWidth, 0);
    
    if (totalCalculatedWidth > availableWidth) {
      // Compress: reduce widths proportionally, but protect critical columns
      const criticalWidth = criticalColumns.reduce((sum, col) => {
        const found = contentBasedWidths.find(c => c.key === col.key);
        return sum + (found ? found.calculatedWidth : 100);
      }, 0);
      
      const remainingWidth = availableWidth - criticalWidth;
      const normalTotalWidth = contentBasedWidths
        .filter(col => !criticalColumns.find(c => c.key === col.key))
        .reduce((sum, col) => sum + col.calculatedWidth, 0);
      
      const compressionRatio = normalTotalWidth > 0 ? remainingWidth / normalTotalWidth : 1;
      
      return contentBasedWidths.map(col => ({
        ...col,
        width: criticalColumns.find(c => c.key === col.key) 
          ? `${col.calculatedWidth}px`
          : `${Math.max(60, Math.floor(col.calculatedWidth * compressionRatio))}px`
      }));
    } else if (totalCalculatedWidth < availableWidth * 0.8) {
      // Expand: distribute extra space to important columns
      const extraWidth = (availableWidth * 0.95) - totalCalculatedWidth;
      const expandableColumns = columns.length;
      const extraPerColumn = Math.floor(extraWidth / expandableColumns);
      
      return contentBasedWidths.map(col => ({
        ...col,
        width: `${col.calculatedWidth + extraPerColumn}px`
      }));
    }
    
    // Perfect fit: use calculated widths
    return contentBasedWidths.map(col => ({
      ...col,
      width: `${col.calculatedWidth}px`
    }));
  }, [columns, data, density]);

  // Column management functions
  const toggleColumnVisibility = (columnKey, isVisible) => {
    setVisibleColumns(prev => 
      isVisible 
        ? [...prev, columnKey]
        : prev.filter(key => key !== columnKey)
    );
  };

  const resetColumnsToDefault = () => {
    setVisibleColumns(columns.map(col => col.key));
    setColumnWidths(columns.reduce((acc, col) => ({ 
      ...acc, 
      [col.key]: col.width || '120px' 
    }), {}));
  };

  const adjustColumnWidth = (columnKey, newWidth) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: `${newWidth}px`
    }));
  };

  // Filter columns by visibility and apply optimizations
  const getFilteredOptimizedColumns = useMemo(() => {
    const visibleColumnsOnly = calculateOptimalWidths.filter(col => 
      visibleColumns.includes(col.key)
    );
    
    // Apply custom width overrides
    return visibleColumnsOnly.map(col => ({
      ...col,
      width: columnWidths[col.key] || col.width
    }));
  }, [calculateOptimalWidths, visibleColumns, columnWidths]);

  // Update optimized columns when dependencies change
  useEffect(() => {
    setOptimizedColumns(getFilteredOptimizedColumns);
  }, [getFilteredOptimizedColumns]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    let filtered = [...data];
    
    // Apply basic filters
    if (Object.keys(basicFilters).length > 0) {
      filtered = filtered.filter(row => {
        return Object.entries(basicFilters).every(([columnKey, filterValue]) => {
          const rowValue = row[columnKey];
          
          if (!filterValue) return true;
          
          // Handle different filter types
          if (typeof filterValue === 'object' && filterValue !== null) {
            // Range filters
            if (filterValue.min !== undefined || filterValue.max !== undefined) {
              const numValue = parseFloat(rowValue);
              if (isNaN(numValue)) return false;
              
              if (filterValue.min && numValue < parseFloat(filterValue.min)) return false;
              if (filterValue.max && numValue > parseFloat(filterValue.max)) return false;
              
              return true;
            }
          }
          
          // Boolean filters
          if (typeof filterValue === 'boolean') {
            return rowValue === filterValue;
          }
          
          // Text/select filters
          if (typeof filterValue === 'string') {
            if (!rowValue) return false;
            return rowValue.toString().toLowerCase().includes(filterValue.toLowerCase());
          }
          
          return true;
        });
      });
    }
    
    // Apply advanced filters
    if (Object.keys(advancedFilters).length > 0) {
      filtered = filtered.filter(row => {
        return Object.entries(advancedFilters).every(([columnKey, filterValue]) => {
          const rowValue = row[columnKey];
          
          if (!filterValue) return true;
          
          // Handle different filter types
          if (typeof filterValue === 'object' && filterValue !== null) {
            // Range filters (number_range, date_range)
            if (filterValue.min !== undefined || filterValue.max !== undefined) {
              const numValue = parseFloat(rowValue);
              if (isNaN(numValue)) return false;
              
              if (filterValue.min && numValue < parseFloat(filterValue.min)) return false;
              if (filterValue.max && numValue > parseFloat(filterValue.max)) return false;
              
              return true;
            }
            
            // Date range filters
            if (filterValue.start || filterValue.end) {
              const propDate = new Date(rowValue);
              if (isNaN(propDate.getTime())) return false;
              
              if (filterValue.start && propDate < new Date(filterValue.start)) return false;
              if (filterValue.end && propDate > new Date(filterValue.end)) return false;
              
              return true;
            }
          }
          
          // Text/select filters
          if (typeof filterValue === 'string') {
            if (!rowValue) return false;
            return rowValue.toString().toLowerCase().includes(filterValue.toLowerCase());
          }
          
          return true;
        });
      });
    }
    
    return filtered;
  }, [data, basicFilters, advancedFilters]);

  const handleSort = (columnKey) => {
    if (onSort) {
      const direction = sortConfig?.key === columnKey && sortConfig?.direction === 'asc' ? 'desc' : 'asc';
      onSort({ key: columnKey, direction });
    }
  };

  // Enhanced row selection with range selection support
  const handleRowSelection = (rowId, isSelected, event = {}) => {
    let newSelection = new Set(selectedRows);
    
    // Handle range selection with Shift+click
    if (event.shiftKey && lastSelectedRow !== null) {
      const currentIndex = filteredData.findIndex(row => row.id === rowId);
      const lastIndex = filteredData.findIndex(row => row.id === lastSelectedRow);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        
        // Select/deselect range
        for (let i = start; i <= end; i++) {
          if (isSelected) {
            newSelection.add(filteredData[i].id);
          } else {
            newSelection.delete(filteredData[i].id);
          }
        }
      }
    } else {
      // Normal single selection
      if (isSelected) {
        newSelection.add(rowId);
      } else {
        newSelection.delete(rowId);
      }
    }
    
    setSelectedRows(newSelection);
    setLastSelectedRow(rowId);
    setBulkActionMode(newSelection.size > 0);
    
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelection));
    }
  };

  const handleSelectAll = (isSelected) => {
    const newSelection = isSelected ? new Set(filteredData.map(row => row.id)) : new Set();
    setSelectedRows(newSelection);
    setBulkActionMode(newSelection.size > 0);
    setLastSelectedRow(null);
    
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelection));
    }
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedRows(new Set());
    setBulkActionMode(false);
    setLastSelectedRow(null);
    
    if (onSelectionChange) {
      onSelectionChange([]);
    }
  };

  // Select visible items only
  const handleSelectVisible = () => {
    const visibleIds = filteredData.map(row => row.id);
    const newSelection = new Set(visibleIds);
    setSelectedRows(newSelection);
    setBulkActionMode(true);
    
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelection));
    }
  };

  // Invert current selection
  const handleInvertSelection = () => {
    const allIds = filteredData.map(row => row.id);
    const newSelection = new Set(
      allIds.filter(id => !selectedRows.has(id))
    );
    setSelectedRows(newSelection);
    setBulkActionMode(newSelection.size > 0);
    
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelection));
    }
  };

  // Inline editing functions
  const startEditing = (rowId, columnKey, currentValue) => {
    if (editingCell) return; // Prevent multiple edits
    
    setEditingCell({ rowId, columnKey });
    setEditValue(currentValue || '');
    setSaveState(null);
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
    setSaveState(null);
  };

  const saveEdit = async (rowId, columnKey, newValue) => {
    if (!onCellEdit) {
      console.warn('No onCellEdit handler provided');
      cancelEditing();
      return;
    }

    setSaveState({ loading: true });

    try {
      await onCellEdit(rowId, columnKey, newValue);
      setSaveState({ success: true });
      
      // Clear success state after 2 seconds
      setTimeout(() => {
        setSaveState(null);
        setEditingCell(null);
      }, 1500);
      
    } catch (error) {
      console.error('Failed to save cell edit:', error);
      setSaveState({ error: error.message || 'Failed to save' });
      
      // Clear error state after 3 seconds, but keep editing active
      setTimeout(() => setSaveState(null), 3000);
    }
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig?.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  const renderCellContent = (column, value, row) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnKey === column.key;
    
    // Render inline editor for editable cells
    if (isEditing && column.editable) {
      const inputType = column.inputType || 'text';
      const baseInputClasses = `w-full border rounded text-sm focus:outline-none ${densityConfig.padding}`;
      
      let inputClasses = baseInputClasses;
      if (saveState?.loading) {
        inputClasses += ' border-yellow-300 bg-yellow-50';
      } else if (saveState?.success) {
        inputClasses += ' border-green-300 bg-green-50';
      } else if (saveState?.error) {
        inputClasses += ' border-red-300 bg-red-50';
      } else {
        inputClasses += ' border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
      }

      return (
        <div className="flex items-center gap-1">
          <input
            type={inputType}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(row.id, column.key, editValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit(row.id, column.key, editValue);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
              }
            }}
            className={inputClasses}
            autoFocus
            disabled={saveState?.loading}
            min={column.min}
            max={column.max}
            step={column.step}
          />
          
          {/* Save state indicators */}
          {saveState?.loading && (
            <div className="animate-spin h-3 w-3 border border-yellow-300 border-t-transparent rounded-full"></div>
          )}
          {saveState?.success && (
            <svg className="h-3 w-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saveState?.error && (
            <svg className="h-3 w-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      );
    }
    
    // Handle custom render functions - wrap editable ones with click handler
    if (column.render) {
      const renderedContent = column.render(value, row);
      
      // If column is editable, wrap rendered content with click handler
      if (column.editable) {
        return (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              startEditing(row.id, column.key, value);
            }}
            className={`cursor-pointer hover:bg-blue-50 rounded transition-colors ${densityConfig.padding} -m-1`}
            title="Click to edit"
          >
            {renderedContent}
          </div>
        );
      }
      
      return renderedContent;
    }
    
    // Render editable cell content with click handler (simple values)
    if (column.editable) {
      const displayValue = value || '';
      return (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            startEditing(row.id, column.key, displayValue);
          }}
          className={`cursor-pointer hover:bg-blue-50 rounded transition-colors ${densityConfig.padding} -m-1`}
          title="Click to edit"
        >
          <span className={`${densityConfig.fontSize} ${!displayValue ? 'text-gray-400 italic' : ''}`}>
            {displayValue || 'Click to add...'}
          </span>
        </div>
      );
    }
    
    // Special formatting for ID columns
    if (column.key === 'id' || column.key.includes('_id')) {
      const codeClasses = density === 'ultra' 
        ? "text-xs text-gray-600 bg-gray-100 px-1 py-0.5 rounded text-xs"
        : "text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded";
      return <code className={codeClasses}>{value}</code>;
    }
    
    // Default text rendering
    return <span className={densityConfig.fontSize}>{value}</span>;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

      {/* Table Controls: Density & Column Management */}
      {(onDensityChange || columns.length > 0) && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <div className="flex justify-between items-center">
            {/* Left: Information Density */}
            {onDensityChange && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Information Density:</span>
                <div className="flex items-center space-x-2">
                  {Object.keys(DENSITY_CONFIG).map((densityMode) => (
                    <button
                      key={densityMode}
                      onClick={() => onDensityChange(densityMode)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        density === densityMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {densityMode.charAt(0).toUpperCase() + densityMode.slice(1)}
                      {densityMode === 'ultra' && (
                        <span className="ml-1 text-xs opacity-75">25+</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Right: Filters & Column Management */}
            <div className="flex items-center space-x-3">
              {/* Filter Controls */}
              <div className="flex items-center space-x-2">
                {/* Basic Filters Button */}
                {columns.some(col => col.basicFilter) && (
                  <button
                    onClick={() => setShowBasicFilters(!showBasicFilters)}
                    className={`px-3 py-1 text-xs rounded-lg flex items-center gap-1 transition-colors ${
                      showBasicFilters || Object.keys(basicFilters).length > 0
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                    </svg>
                    Quick
                    {Object.keys(basicFilters).length > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
                        {Object.keys(basicFilters).length}
                      </span>
                    )}
                  </button>
                )}

                {/* Advanced Filters Button */}
                {columns.some(col => col.filterable) && (
                  <button
                    onClick={() => setShowAdvancedFilters(true)}
                    className={`px-3 py-1 text-xs rounded-lg flex items-center gap-1 transition-colors ${
                      Object.keys(advancedFilters).length > 0
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                    </svg>
                    Advanced
                    {Object.keys(advancedFilters).length > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
                        {Object.keys(advancedFilters).length}
                      </span>
                    )}
                  </button>
                )}
              </div>
              
              <span className="text-xs text-gray-500">
                {optimizedColumns.length} of {columns.length} columns shown
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowColumnManager(!showColumnManager)}
                  className="px-3 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  Columns
                </button>

                {/* Column Manager Dropdown */}
                {showColumnManager && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-64">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Manage Columns</h4>
                      <button
                        onClick={() => setShowColumnManager(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {columns.map(column => (
                        <label key={column.key} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(column.key)}
                            onChange={(e) => toggleColumnVisibility(column.key, e.target.checked)}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className={`${visibleColumns.includes(column.key) ? 'text-gray-900' : 'text-gray-500'}`}>
                            {column.label}
                          </span>
                          {column.critical && (
                            <span className="text-xs text-orange-600 font-medium">Required</span>
                          )}
                        </label>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-200 pt-3 flex justify-between">
                      <button 
                        onClick={resetColumnsToDefault}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Reset to default
                      </button>
                      <span className="text-xs text-gray-500">
                        {visibleColumns.length} columns selected
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Filter Panel */}
      <BasicFilterPanel
        columns={columns}
        data={data}
        activeFilters={basicFilters}
        onFiltersChange={setBasicFilters}
        isOpen={showBasicFilters}
        onToggle={() => setShowBasicFilters(!showBasicFilters)}
      />

      {/* Advanced Filter Panel Modal */}
      {showAdvancedFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <AdvancedFilterPanel
              columns={columns}
              data={data}
              activeFilters={advancedFilters}
              onFiltersChange={(newFilters) => {
                setAdvancedFilters(newFilters);
                setShowAdvancedFilters(false);
              }}
              onClose={() => setShowAdvancedFilters(false)}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Selection column */}
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              
              {optimizedColumns.map((column) => (
                <th
                  key={column.key}
                  className={`${densityConfig.padding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
                    column.sortable ? 'select-none' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className={`${densityConfig.rowHeight} hover:bg-gray-50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {/* Selection column */}
                {selectable && (
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedRows.has(row.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRowSelection(row.id, e.target.checked, e);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                
                {optimizedColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`${densityConfig.padding} whitespace-nowrap ${
                      column.align === 'right' ? 'text-right' : 
                      column.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {renderCellContent(column, row[column.key], row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filteredData.length === 0 && !loading && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? `No results match "${searchTerm}"` : 'Get started by adding some data.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {pagination.from} to {pagination.to} of {pagination.total} results
            </div>
            <div className="flex space-x-2">
              <button
                disabled={!pagination.prevPage}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => pagination.onPageChange && pagination.onPageChange(pagination.currentPage - 1)}
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                disabled={!pagination.nextPage}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => pagination.onPageChange && pagination.onPageChange(pagination.currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseDataTable;