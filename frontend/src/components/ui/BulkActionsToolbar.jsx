// Enterprise Bulk Actions Toolbar
// Professional bulk operations for selected table items

import React, { useState } from 'react';

const BulkActionsToolbar = ({ 
  selectedCount, 
  selectedItems = [], 
  onExport, 
  onBulkEdit, 
  onArchive,
  onDelete,
  onClear,
  onSelectVisible,
  onInvertSelection,
  totalCount = 0,
  entityType = 'properties',
  loading = false,
  permissions = {}
}) => {
  const [actionInProgress, setActionInProgress] = useState(null);
  
  if (selectedCount === 0) return null;

  const handleAction = async (actionName, callback) => {
    setActionInProgress(actionName);
    try {
      await callback?.(selectedItems);
    } finally {
      setActionInProgress(null);
    }
  };

  const isActionDisabled = (actionName) => {
    return loading || actionInProgress === actionName;
  };

  const getLoadingIcon = (actionName) => {
    if (actionInProgress === actionName) {
      return (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Selection Info & Quick Actions */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm font-semibold text-blue-900">
              {selectedCount} {selectedCount === 1 ? entityType.slice(0, -1) : entityType} selected
            </span>
          </div>
          
          <div className="flex items-center space-x-3 text-xs">
            <button 
              onClick={onClear}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
            >
              Clear selection
            </button>
            {onSelectVisible && (
              <>
                <span className="text-blue-300">•</span>
                <button 
                  onClick={onSelectVisible}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                >
                  Select visible ({totalCount})
                </button>
              </>
            )}
            {onInvertSelection && (
              <>
                <span className="text-blue-300">•</span>
                <button 
                  onClick={onInvertSelection}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                >
                  Invert selection
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Bulk Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Export Actions */}
          {permissions.canExport !== false && (
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => handleAction('export-csv', () => onExport?.(selectedItems, 'csv'))}
                disabled={isActionDisabled('export-csv')}
                className="px-3 py-1.5 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {getLoadingIcon('export-csv') || (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                )}
                CSV
              </button>
              
              <button 
                onClick={() => handleAction('export-excel', () => onExport?.(selectedItems, 'excel'))}
                disabled={isActionDisabled('export-excel')}
                className="px-3 py-1.5 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {getLoadingIcon('export-excel') || (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6" />
                  </svg>
                )}
                Excel
              </button>
            </div>
          )}
          
          {/* Edit Action */}
          {permissions.canEdit !== false && (
            <button 
              onClick={() => handleAction('bulk-edit', onBulkEdit)}
              disabled={isActionDisabled('bulk-edit')}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {getLoadingIcon('bulk-edit') || (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
              Bulk Edit
            </button>
          )}
          
          {/* Archive Action */}
          {permissions.canArchive !== false && (
            <button 
              onClick={() => handleAction('archive', onArchive)}
              disabled={isActionDisabled('archive')}
              className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {getLoadingIcon('archive') || (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4m6 0l-1 1a2 2 0 01-2.828 0L12 10.172 8.828 13.344a2 2 0 01-2.828 0L5 12l1-1z" />
                </svg>
              )}
              Archive
            </button>
          )}
          
          {/* Delete Action */}
          {permissions.canDelete !== false && (
            <button 
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${selectedCount} ${entityType}? This action cannot be undone.`)) {
                  handleAction('delete', onDelete);
                }
              }}
              disabled={isActionDisabled('delete')}
              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {getLoadingIcon('delete') || (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Delete
            </button>
          )}
        </div>
      </div>
      
      {/* Progress Indicator */}
      {actionInProgress && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center space-x-2 text-xs text-blue-700">
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing {actionInProgress} for {selectedCount} items...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkActionsToolbar;