// Enterprise Properties View - Data Table Implementation
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Pagination from './Pagination';
import { exportProperties, exportPropertiesEnhanced, exportDataWithProgress } from '../utils/exportUtils';
import EnterpriseDataTable from './ui/EnterpriseDataTable';
import EnterpriseSearchBar from './ui/EnterpriseSearchBar';
import BulkActionsToolbar from './ui/BulkActionsToolbar';
import { 
  PROPERTIES_TABLE_COLUMNS, 
  getDefaultSortConfig, 
  filterPropertiesBySearch, 
  sortProperties 
} from './PropertiesTableConfig.jsx';

const PropertiesView = ({
  propertyFilters,
  handlePropertyFilterChange,
  properties,
  totalPages,
  currentPage,
  onPageChange,
  handleNav,
  getStatusColor,
  getPropertyTypeColor,
  getFurnishingStatusColor,
  getFurnishingStatusText,
  formatDate
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState(getDefaultSortConfig());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [tableDensity, setTableDensity] = useState('compact'); // NEW: Density state
  

  // Process properties: filter by search, then sort
  const processedProperties = useMemo(() => {
    let filtered = filterPropertiesBySearch(properties, searchTerm);
    return sortProperties(filtered, sortConfig);
  }, [properties, searchTerm, sortConfig]);

  const handleSort = (newSortConfig) => {
    setSortConfig(newSortConfig);
  };

  const handleRowClick = (property) => {
    handleNav(`properties/${property.id}`);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleToggleFilters = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
  };


  const handleDensityChange = (newDensity) => {
    setTableDensity(newDensity);
  };

  // Bulk selection state and handlers
  const [selectedProperties, setSelectedProperties] = useState([]);
  
  // Export progress state
  const [exportProgress, setExportProgress] = useState({ progress: 0, message: '', isExporting: false });
  
  const handleSelectionChange = (selectedIds) => {
    setSelectedProperties(selectedIds);
  };

  // Bulk action handlers
  const handleBulkExport = async (selectedItems, format) => {
    const itemsToExport = processedProperties.filter(p => selectedItems.includes(p.id));
    
    if (itemsToExport.length === 0) {
      alert('No items to export');
      return;
    }

    try {
      setExportProgress({ progress: 0, message: 'Starting export...', isExporting: true });
      
      const onProgress = (progress, message) => {
        setExportProgress({ progress, message, isExporting: true });
      };

      // Use enhanced export with progress tracking
      await exportPropertiesEnhanced(itemsToExport, null, format, onProgress);
      
      setExportProgress({ progress: 100, message: 'Export completed!', isExporting: false });
      
      // Clear progress after 2 seconds
      setTimeout(() => {
        setExportProgress({ progress: 0, message: '', isExporting: false });
      }, 2000);
      
    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress({ progress: 0, message: `Export failed: ${error.message}`, isExporting: false });
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setExportProgress({ progress: 0, message: '', isExporting: false });
      }, 3000);
    }
  };

  const handleBulkEdit = async (selectedItems) => {
    // Future: open bulk edit modal
    console.log('Bulk editing properties:', selectedItems);
    alert(`Bulk edit modal would open for ${selectedItems.length} properties`);
  };

  const handleBulkArchive = async (selectedItems) => {
    // Future: implement bulk archive
    console.log('Archiving properties:', selectedItems);
    alert(`Would archive ${selectedItems.length} properties`);
  };

  const handleBulkDelete = async (selectedItems) => {
    // Future: implement bulk delete
    console.log('Deleting properties:', selectedItems);
    alert(`Would delete ${selectedItems.length} properties`);
  };

  const handleClearSelection = () => {
    setSelectedProperties([]);
  };

  const handleSelectVisible = () => {
    const visibleIds = paginatedProperties.map(p => p.id);
    setSelectedProperties(visibleIds);
  };

  const handleInvertSelection = () => {
    const allVisibleIds = paginatedProperties.map(p => p.id);
    const invertedSelection = allVisibleIds.filter(id => !selectedProperties.includes(id));
    setSelectedProperties(invertedSelection);
  };

  // Inline cell editing handler
  const handleCellEdit = async (rowId, columnKey, newValue) => {
    console.log(`Editing property ${rowId}: ${columnKey} = ${newValue}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // For demo purposes, just log the change
    // In real implementation, this would call API to update the property
    console.log(`Successfully updated property ${rowId}: ${columnKey} changed to ${newValue}`);
    
    // Could throw error to simulate validation failure:
    // if (!newValue || newValue.trim() === '') {
    //   throw new Error('Value cannot be empty');
    // }
  };

  // Enterprise pagination options
  const [itemsPerPageOption, setItemsPerPageOption] = useState('auto');
  
  const PAGINATION_OPTIONS = [
    { value: 'auto', label: 'Auto (Smart)' },
    { value: 20, label: '20 per page' },
    { value: 50, label: '50 per page' },
    { value: 100, label: '100 per page' },
    { value: 'all', label: 'Show all' }
  ];

  // Smart pagination based on density and screen size
  const getItemsPerPage = () => {
    if (itemsPerPageOption === 'all') return processedProperties.length;
    if (itemsPerPageOption !== 'auto') return itemsPerPageOption;
    
    // Auto mode: adaptive to density
    if (tableDensity === 'ultra') return 25; // Ultra-compact: 25+ visible
    if (tableDensity === 'compact') return 20; // Compact: 20 visible
    if (tableDensity === 'normal') return 15; // Normal: 15 visible
    return 12; // Comfortable: 12 visible
  };
  
  const itemsPerPage = getItemsPerPage();
  const totalProcessedItems = processedProperties.length;
  const totalProcessedPages = Math.ceil(totalProcessedItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProperties = processedProperties.slice(startIndex, startIndex + itemsPerPage);

  const paginationConfig = {
    currentPage,
    totalPages: totalProcessedPages,
    total: totalProcessedItems,
    from: startIndex + 1,
    to: Math.min(startIndex + itemsPerPage, totalProcessedItems),
    prevPage: currentPage > 1,
    nextPage: currentPage < totalProcessedPages,
    onPageChange
  };

  return (
    <div className="space-y-6">
      {/* Enterprise Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Search Properties
              </h3>
              <p className="text-sm text-gray-500">Find properties by name, address, or ID</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm font-medium">
              {processedProperties.length} Found
            </div>
          </div>
        </div>
        
        <EnterpriseSearchBar
          placeholder="Search properties, addresses, IDs..."
          value={searchTerm}
          onSearch={handleSearch}
          showAdvancedFilters={showAdvancedFilters}
          onToggleFilters={handleToggleFilters}
        />
      </div>



      {/* Properties Data Table */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('properties.title')}
              </h2>
              <p className="text-sm text-gray-500">{t('properties.portfolioText', { count: processedProperties.length })}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Enterprise Pagination Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Show:</label>
              <select
                value={itemsPerPageOption}
                onChange={(e) => setItemsPerPageOption(e.target.value === 'all' ? 'all' : parseInt(e.target.value) || 'auto')}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PAGINATION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="h-6 border-l border-gray-300"></div>
            
            <button 
              onClick={async () => {
                try {
                  setExportProgress({ progress: 0, message: 'Starting full export...', isExporting: true });
                  
                  const onProgress = (progress, message) => {
                    setExportProgress({ progress, message, isExporting: true });
                  };

                  await exportPropertiesEnhanced(processedProperties, null, 'csv', onProgress);
                  
                  setExportProgress({ progress: 100, message: 'Export completed!', isExporting: false });
                  
                  setTimeout(() => {
                    setExportProgress({ progress: 0, message: '', isExporting: false });
                  }, 2000);
                  
                } catch (error) {
                  console.error('Export failed:', error);
                  setExportProgress({ progress: 0, message: `Export failed: ${error.message}`, isExporting: false });
                  
                  setTimeout(() => {
                    setExportProgress({ progress: 0, message: '', isExporting: false });
                  }, 3000);
                }
              }}
              disabled={exportProgress.isExporting}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{t('common.export')}</span>
            </button>
            <button 
              onClick={() => handleNav('create-property')} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{t('properties.addProperty')}</span>
            </button>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        <BulkActionsToolbar
          selectedCount={selectedProperties.length}
          selectedItems={selectedProperties}
          totalCount={paginatedProperties.length}
          onExport={handleBulkExport}
          onBulkEdit={handleBulkEdit}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onClear={handleClearSelection}
          onSelectVisible={handleSelectVisible}
          onInvertSelection={handleInvertSelection}
          entityType="properties"
          permissions={{
            canExport: true,
            canEdit: true,
            canArchive: true,
            canDelete: false // Disable delete for safety
          }}
          loading={exportProgress.isExporting}
        />

        {/* Export Progress Indicator */}
        {exportProgress.isExporting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <div>
                  <div className="text-sm font-medium text-blue-900">Exporting Properties</div>
                  <div className="text-xs text-blue-700">{exportProgress.message}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-blue-700 font-medium">{exportProgress.progress}%</div>
                <div className="w-32 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${exportProgress.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Export Status Messages */}
        {!exportProgress.isExporting && exportProgress.message && (
          <div className={`rounded-lg p-4 mb-4 ${
            exportProgress.message.includes('failed') 
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            <div className="flex items-center space-x-2">
              {exportProgress.message.includes('failed') ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{exportProgress.message}</span>
            </div>
          </div>
        )}

        {/* Enterprise Data Table */}
        <EnterpriseDataTable
          data={paginatedProperties}
          columns={PROPERTIES_TABLE_COLUMNS}
          sortConfig={sortConfig}
          onSort={handleSort}
          onRowClick={handleRowClick}
          loading={false}
          pagination={paginationConfig}
          searchTerm={searchTerm}
          density={tableDensity}
          onDensityChange={handleDensityChange}
          selectable={true}
          onSelectionChange={handleSelectionChange}
          onCellEdit={handleCellEdit}
        />
      </div>

      {/* Legacy pagination - keeping for compatibility */}
      <div className="flex justify-center mt-8">
        <Pagination 
          currentPage={currentPage}
          totalPages={totalProcessedPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
};

export default PropertiesView;