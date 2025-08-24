import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import cachedAxios from '../utils/cachedAxios';
import { TECHNICAL_OBJECTS_TABLE_COLUMNS } from './TechnicalObjectsTableConfig.jsx';
import EnterpriseDataTable from './ui/EnterpriseDataTable';
import EnterpriseSearchBar from './ui/EnterpriseSearchBar';
import Pagination from './Pagination';
import { exportDataWithProgress } from '../utils/exportUtils';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getTechnicalObjectTypes = (t) => [
  // German Compliance Types - Schornsteinfeger
  { value: 'heating_gas', label: t('technicalObjects.manager.objectTypes.heating_gas'), icon: '🔥', category: 'heating_combustion' },
  { value: 'heating_oil', label: t('technicalObjects.manager.objectTypes.heating_oil'), icon: '🔥', category: 'heating_combustion' },
  { value: 'heating_wood', label: t('technicalObjects.manager.objectTypes.heating_wood'), icon: '🔥', category: 'heating_combustion' },
  { value: 'chimney', label: t('technicalObjects.manager.objectTypes.chimney'), icon: '🏠', category: 'heating_combustion' },
  
  // German Compliance Types - TÜV
  { value: 'elevator_passenger', label: t('technicalObjects.manager.objectTypes.elevator_passenger'), icon: '🛗', category: 'elevators_lifts' },
  { value: 'elevator_freight', label: t('technicalObjects.manager.objectTypes.elevator_freight'), icon: '🛗', category: 'elevators_lifts' },
  { value: 'pressure_vessel', label: t('technicalObjects.manager.objectTypes.pressure_vessel'), icon: '⚗️', category: 'pressure_equipment' },
  { value: 'boiler_system', label: t('technicalObjects.manager.objectTypes.boiler_system'), icon: '🔥', category: 'pressure_equipment' },
  { value: 'fire_extinguisher', label: t('technicalObjects.manager.objectTypes.fire_extinguisher'), icon: '🚨', category: 'fire_safety_systems' },
  
  // German Compliance Types - DGUV V3
  { value: 'electrical_installation', label: t('technicalObjects.manager.objectTypes.electrical_installation'), icon: '⚡', category: 'electrical_systems' },
  { value: 'electrical_portable', label: t('technicalObjects.manager.objectTypes.electrical_portable'), icon: '⚡', category: 'electrical_systems' },
  
  // Standard Building Systems
  { value: 'intercom', label: t('technicalObjects.manager.objectTypes.intercom'), icon: '📞', category: 'communication' },
  { value: 'building_management', label: t('technicalObjects.manager.objectTypes.building_management'), icon: '🏢', category: 'communication' },
  { value: 'security_system', label: t('technicalObjects.manager.objectTypes.security_system'), icon: '🔒', category: 'security_access' },
  { value: 'ventilation', label: t('technicalObjects.manager.objectTypes.ventilation'), icon: '💨', category: 'hvac_ventilation' },
  { value: 'air_conditioning', label: t('technicalObjects.manager.objectTypes.air_conditioning'), icon: '❄️', category: 'hvac_ventilation' },
  { value: 'water_supply', label: t('technicalObjects.manager.objectTypes.water_supply'), icon: '💧', category: 'water_sanitary' },
  { value: 'sewage_system', label: t('technicalObjects.manager.objectTypes.sewage_system'), icon: '🚰', category: 'water_sanitary' },
  { value: 'solar_panels', label: t('technicalObjects.manager.objectTypes.solar_panels'), icon: '☀️', category: 'building_envelope' }
];

const getObjectStatus = (t) => [
  { value: 'active', label: t('technicalObjects.manager.statuses.active'), color: 'bg-green-100 text-green-800' },
  { value: 'maintenance', label: t('technicalObjects.manager.statuses.maintenance'), color: 'bg-yellow-100 text-yellow-800' },
  { value: 'broken', label: t('technicalObjects.manager.statuses.broken'), color: 'bg-red-100 text-red-800' },
  { value: 'decommissioned', label: t('technicalObjects.manager.statuses.decommissioned'), color: 'bg-gray-100 text-gray-800' },
  { value: 'planned', label: t('technicalObjects.manager.statuses.planned'), color: 'bg-blue-100 text-blue-800' }
];

const getHeatingTypes = (t) => [
  { value: 'zentralheizung', label: t('technicalObjects.manager.heatingTypes.zentralheizung') },
  { value: 'etagenheizung', label: t('technicalObjects.manager.heatingTypes.etagenheizung') },
  { value: 'einzelheizung', label: t('technicalObjects.manager.heatingTypes.einzelheizung') }
];

const getDistributionMethods = (t) => [
  { value: 'surface_area', label: t('technicalObjects.manager.distributionMethods.surface_area') },
  { value: 'consumption', label: t('technicalObjects.manager.distributionMethods.consumption') },
  { value: 'apartment_count', label: t('technicalObjects.manager.distributionMethods.apartment_count') }
];

const getComplianceCategories = (t) => [
  { value: 'all', label: t('technicalObjects.compliance.categories.all'), color: 'bg-gray-100 text-gray-800', icon: '📋' },
  { value: 'elevators_lifts', label: t('technicalObjects.compliance.categories.elevators_lifts'), color: 'bg-red-100 text-red-800', icon: '🛗' },
  { value: 'pressure_equipment', label: t('technicalObjects.compliance.categories.pressure_equipment'), color: 'bg-red-100 text-red-800', icon: '⚡' },
  { value: 'fire_safety_systems', label: t('technicalObjects.compliance.categories.fire_safety_systems'), color: 'bg-red-100 text-red-800', icon: '🚨' },
  { value: 'heating_combustion', label: t('technicalObjects.compliance.categories.heating_combustion'), color: 'bg-orange-100 text-orange-800', icon: '🔥' },
  { value: 'electrical_systems', label: t('technicalObjects.compliance.categories.electrical_systems'), color: 'bg-blue-100 text-blue-800', icon: '⚡' }
];

const TechnicalObjectsManager = ({ 
  propertyId,
  isEditMode = false 
}) => {
  const { t } = useLanguage();
  const [technicalObjects, setTechnicalObjects] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingObject, setEditingObject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // German Compliance State
  const [complianceSummary, setComplianceSummary] = useState(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // --- VIEW TOGGLE STATE MANAGEMENT ---
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'table'
  
  // --- Table View State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedObjects, setSelectedObjects] = useState([]);

  // Map technical objects for table view to ensure 'name' and '_id' fields exist
  const mappedTechnicalObjects = technicalObjects.map(obj => ({
    ...obj,
    name: obj.name || obj.object_name || '',
    _id: obj._id || obj.technical_object_id || obj.id || '',
  }));

  // Filter and paginate technical objects for table view
  const filteredObjects = mappedTechnicalObjects.filter(obj =>
    obj.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.object_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredObjects.length / itemsPerPage);
  const paginatedObjects = filteredObjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- State Persistence for View Mode ---
  useEffect(() => {
    const savedViewMode = localStorage.getItem('technicalObjects_viewMode');
    if (savedViewMode && ['dashboard', 'table'].includes(savedViewMode)) {
      setViewMode(savedViewMode);
    }
  }, []);
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
    localStorage.setItem('technicalObjects_viewMode', newMode);
  };

  const [formData, setFormData] = useState({
    name: '',
    object_type: 'heating_gas',
    manufacturer: '',
    model: '',
    serial_number: '',
    installation_date: '',
    warranty_expiry: '',
    status: 'active',
    last_maintenance_date: '',
    next_maintenance_date: '',
    purchase_cost: '',
    installation_cost: '',
    annual_maintenance_cost: '',
    notes: '',
    
    // Heating system specific fields
    heating_type: '',
    distribution_method: '',
    cost_per_sqm: '',
    fuel_type: '',
    power_output_kw: '',
    efficiency_rating: ''
  });

  // Fetch compliance data for dashboard
  useEffect(() => {
    if (propertyId && isEditMode) {
      // Property-specific mode: load objects and compliance for specific property
      fetchTechnicalObjects();
      fetchComplianceSummary();
    } else {
      // Standalone mode: Load system-wide compliance dashboard
      fetchSystemWideCompliance();
    }
  }, [propertyId, isEditMode]);

  const fetchTechnicalObjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // Choose endpoint based on whether we have a property ID
      const endpoint = propertyId 
        ? `${API}/v1/technical-objects/property/${propertyId}` 
        : `${API}/v1/technical-objects/`;
        
      const response = await cachedAxios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTechnicalObjects(response.data || []);
    } catch (error) {
      console.error('Error fetching technical objects:', error);
      setError(t('technicalObjects.manager.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchComplianceSummary = async () => {
    try {
      setComplianceLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await cachedAxios.get(`${API}/v1/core/compliance/property/${propertyId}/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComplianceSummary(response.data);
    } catch (error) {
      console.error('Error fetching compliance summary:', error);
      // Don't show error for compliance - it's optional enhancement
    } finally {
      setComplianceLoading(false);
    }
  };

  const fetchSystemWideCompliance = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const token = localStorage.getItem('access_token');
      
      // Fetch system-wide overdue inspections
      const overdueResponse = await cachedAxios.get(`${API}/v1/core/compliance/overdue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Transform overdue alerts to display format
      const overdueAlerts = overdueResponse.data || [];
      setTechnicalObjects(overdueAlerts); // Repurpose state for compliance alerts
      
      // Set summary for dashboard view
      const totalOverdue = overdueAlerts.length;
      const criticalCount = overdueAlerts.filter(alert => alert.urgency === 'critical').length;
      const totalCosts = overdueAlerts.reduce((sum, alert) => sum + (alert.estimated_cost || 0), 0);
      
      setComplianceSummary({
        compliance_percentage: totalOverdue > 0 ? 0 : 100, // 0% if any overdue
        compliant_count: 0,
        overdue_count: totalOverdue,
        due_soon_count: overdueAlerts.filter(alert => alert.urgency === 'HIGH').length,
        critical_count: criticalCount,
        total_estimated_costs: totalCosts,
        alerts: overdueAlerts
      });
      
    } catch (error) {
      console.error('Error fetching system-wide compliance:', error);
      // Don't show error - gracefully degrade to "no data available" state
      setError(''); // Clear any existing error
      setTechnicalObjects([]);
      setComplianceSummary({
        compliance_percentage: 100,
        compliant_count: 0, 
        overdue_count: 0,
        due_soon_count: 0,
        critical_count: 0,
        total_estimated_costs: 0,
        alerts: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      object_type: 'heating_gas',
      manufacturer: '',
      model: '',
      serial_number: '',
      installation_date: '',
      warranty_expiry: '',
      status: 'active',
      last_maintenance_date: '',
      next_maintenance_date: '',
      purchase_cost: '',
      installation_cost: '',
      annual_maintenance_cost: '',
      notes: '',
      heating_type: '',
      distribution_method: '',
      cost_per_sqm: '',
      fuel_type: '',
      power_output_kw: '',
      efficiency_rating: ''
    });
    setEditingObject(null);
    setShowAddForm(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // Prepare API payload - explicit field mapping
      const payload = {
        property_id: propertyId,
        name: formData.name,
        object_type: formData.object_type,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        installation_date: formData.installation_date ? new Date(formData.installation_date).toISOString() : null,
        warranty_expiry: formData.warranty_expiry ? new Date(formData.warranty_expiry).toISOString() : null,
        status: formData.status,
        last_maintenance_date: formData.last_maintenance_date ? new Date(formData.last_maintenance_date).toISOString() : null,
        next_maintenance_date: formData.next_maintenance_date ? new Date(formData.next_maintenance_date).toISOString() : null,
        purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
        installation_cost: formData.installation_cost ? parseFloat(formData.installation_cost) : null,
        annual_maintenance_cost: formData.annual_maintenance_cost ? parseFloat(formData.annual_maintenance_cost) : null,
        notes: formData.notes || null
      };

      // Add heating-specific fields ONLY for heating systems with exact backend field names
      if (['heating_gas', 'heating_oil', 'heating_wood'].includes(formData.object_type)) {
        payload.heating_type = formData.heating_type || 'zentralheizung';
        payload.heating_distribution_key = formData.distribution_method || 'surface_area';
        payload.fuel_type = formData.fuel_type || 'gas';
        payload.power_output_kw = formData.power_output_kw ? parseFloat(formData.power_output_kw) : null;
        // Map efficiency_rating to efficiency_class (assuming it's the efficiency class)
        if (formData.efficiency_rating) {
          payload.efficiency_class = formData.efficiency_rating;
        }
      }

      console.log('Payload to be sent:', payload);

      if (editingObject) {
        // Update existing object
        await cachedAxios.put(`${API}/v1/technical-objects/${editingObject._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Create new object
        await cachedAxios.post(`${API}/v1/technical-objects/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      await fetchTechnicalObjects();
      resetForm();
      
    } catch (error) {
      console.error('Error saving technical object:', error);
      console.error('Response data:', error.response?.data);
      
      const errorDetail = error.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        // Handle Pydantic validation errors
        console.error('Validation errors:', errorDetail);
        setError(errorDetail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', '));
      } else if (typeof errorDetail === 'string') {
        setError(errorDetail);
      } else {
        setError(t('technicalObjects.manager.errors.saveFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (object) => {
    setFormData({
      name: object.name,
      object_type: object.object_type,
      manufacturer: object.manufacturer || '',
      model: object.model || '',
      serial_number: object.serial_number || '',
      installation_date: object.installation_date ? object.installation_date.split('T')[0] : '',
      warranty_expiry: object.warranty_expiry ? object.warranty_expiry.split('T')[0] : '',
      status: object.status,
      last_maintenance_date: object.last_maintenance_date ? object.last_maintenance_date.split('T')[0] : '',
      next_maintenance_date: object.next_maintenance_date ? object.next_maintenance_date.split('T')[0] : '',
      purchase_cost: object.purchase_cost || '',
      installation_cost: object.installation_cost || '',
      annual_maintenance_cost: object.annual_maintenance_cost || '',
      notes: object.notes || '',
      heating_type: object.heating_type || '',
      distribution_method: object.heating_distribution_key || '',  // Map backend field to frontend field
      cost_per_sqm: object.cost_per_sqm || '',
      fuel_type: object.fuel_type || '',
      power_output_kw: object.power_output_kw || '',
      efficiency_rating: object.efficiency_class || object.efficiency_rating || ''  // Map backend field
    });
    setEditingObject(object);
    setShowAddForm(true);
  };

  const handleDelete = async (objectId) => {
    if (!window.confirm(t('technicalObjects.manager.deleteConfirm'))) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      await cachedAxios.delete(`${API}/v1/technical-objects/${objectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchTechnicalObjects();
      
    } catch (error) {
      console.error('Error deleting technical object:', error);
      setError(t('technicalObjects.manager.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getObjectTypeInfo = (type) => {
    const types = getTechnicalObjectTypes(t);
    return types.find(obj => obj.value === type) || types[0];
  };

  const getStatusInfo = (status) => {
    const statuses = getObjectStatus(t);
    return statuses.find(s => s.value === status) || statuses[0];
  };

  const handleScheduleInspection = async (objectId) => {
    try {
      const token = localStorage.getItem('access_token');
      await cachedAxios.post(`${API}/v1/core/compliance/technical-object/${objectId}/schedule`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh compliance data
      await fetchComplianceSummary();
      alert(t('technicalObjects.compliance.inspectionScheduled'));
    } catch (error) {
      console.error('Error scheduling inspection:', error);
      alert(t('technicalObjects.compliance.schedulingError'));
    }
  };

  const handleCompleteInspection = async (objectId) => {
    const inspectionDate = prompt(t('technicalObjects.compliance.enterCompletionDate'), 
      new Date().toISOString().split('T')[0]);
    
    if (inspectionDate) {
      const inspectorNotes = prompt(t('technicalObjects.compliance.enterInspectorNotes'), '');
      
      try {
        const token = localStorage.getItem('access_token');
        await cachedAxios.post(`${API}/v1/core/compliance/technical-object/${objectId}/complete-inspection`, {
          inspection_date: new Date(inspectionDate).toISOString(),
          inspector_notes: inspectorNotes || null
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Refresh compliance data
        await fetchComplianceSummary();
        await fetchTechnicalObjects(); // May update last_inspection_date
        alert(t('technicalObjects.compliance.inspectionCompleted'));
      } catch (error) {
        console.error('Error completing inspection:', error);
        alert(t('technicalObjects.compliance.completionError'));
      }
    }
  };

  return (
    <div className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5l-1-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {propertyId && isEditMode 
                  ? t('technicalObjects.manager.title')
                  : t('technicalObjects.compliance.title')
                }
              </h3>
              <p className="text-orange-100 text-sm">
                {propertyId && isEditMode 
                  ? t('technicalObjects.manager.subtitle') 
                  : t('technicalObjects.compliance.subtitle')
                }
              </p>
            </div>
          </div>
          
          {isEditMode && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('technicalObjects.manager.addButton')}
            </button>
          )}
        </div>
        {/* --- VIEW TOGGLE UI --- */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => handleViewModeChange('dashboard')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'dashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Compliance Dashboard
              </button>
              <button
                onClick={() => handleViewModeChange('table')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 Table View
              </button>
            </div>
            {/* Export button only in table view */}
            {viewMode === 'table' && (
              <button
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                onClick={async () => {
                  await exportDataWithProgress(filteredObjects, null, 'csv');
                }}
              >
                📤 Export
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="mt-2 text-gray-600">{t('technicalObjects.manager.loadingMessage')}</p>
          </div>
        )}

        {/* --- CONDITIONAL RENDERING: DASHBOARD OR TABLE VIEW --- */}
        {!loading && viewMode === 'dashboard' && (
          complianceSummary ? (
            // German Compliance Dashboard
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-orange-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  🏛️ {t('technicalObjects.compliance.title')}
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({t('technicalObjects.compliance.subtitle')})
                  </span>
                </h3>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(complianceSummary.compliance_percentage)}%
                  </div>
                  <div className="text-xs text-gray-600">{t('technicalObjects.compliance.compliant')}</div>
                </div>
              </div>

              {/* Compliance Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 bg-green-100 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{complianceSummary.compliant_count}</div>
                  <div className="text-xs text-green-800">{t('technicalObjects.compliance.stats.compliant')}</div>
                </div>
                <div className="text-center p-3 bg-yellow-100 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">{complianceSummary.due_soon_count}</div>
                  <div className="text-xs text-yellow-800">{t('technicalObjects.compliance.stats.dueSoon')}</div>
                </div>
                <div className="text-center p-3 bg-red-100 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{complianceSummary.overdue_count}</div>
                  <div className="text-xs text-red-800">{t('technicalObjects.compliance.stats.overdue')}</div>
                </div>
                <div className="text-center p-3 bg-purple-100 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">€{Math.round(complianceSummary.total_estimated_costs)}</div>
                  <div className="text-xs text-purple-800">{t('technicalObjects.compliance.stats.estimatedCosts')}</div>
                </div>
              </div>

              {/* Critical Alerts */}
              {complianceSummary.alerts && complianceSummary.alerts.filter(alert => alert.urgency === 'critical' || alert.status === 'critical').length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center">
                    🚨 {t('technicalObjects.compliance.criticalAlerts')} ({complianceSummary.alerts.filter(alert => alert.urgency === 'critical' || alert.status === 'critical').length})
                  </h4>
                  <div className="space-y-2">
                    {complianceSummary.alerts.filter(alert => alert.urgency === 'critical' || alert.status === 'critical').slice(0, 3).map((alert) => (
                      <div key={alert.technical_object_id} className="bg-red-50 border border-red-200 rounded p-2 text-sm cursor-pointer hover:bg-red-100 transition-colors"
                           onClick={() => window.location.href = `/technical-objects/${alert.technical_object_id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-red-800">{alert.object_name}</span>
                              <span className="text-red-600 text-xs">
                                {alert.days_until_due < 0 ? `${Math.abs(alert.days_until_due).toLocaleString()} days ${t('technicalObjects.compliance.overdue')}` : `${alert.days_until_due} days ${t('technicalObjects.compliance.remaining')}`}
                              </span>
                            </div>
                            <div className="text-red-600 text-xs mt-1">{alert.legal_requirement}</div>
                            <div className="text-red-500 text-xs mt-1">💰 ~€{alert.estimated_cost} • {alert.consequences}</div>
                            <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleScheduleInspection(alert.technical_object_id)}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                                title={t('technicalObjects.compliance.scheduleInspection')}
                              >
                                📅 Schedule
                              </button>
                              <button
                                onClick={() => handleCompleteInspection(alert.technical_object_id)}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                                title={t('technicalObjects.compliance.markComplete')}
                              >
                                ✅ Complete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {getComplianceCategories(t).map(category => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 flex items-center ${
                      selectedCategory === category.value 
                        ? category.color + ' ring-2 ring-offset-1 ring-blue-300' 
                        : category.color.replace('-800', '-600').replace('bg-', 'bg-').replace('text-', 'text-') + ' opacity-60 hover:opacity-80'
                    }`}
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5l-1-1z" />
              </svg>
              <p>Compliance data not available.</p>
            </div>
          )
        )}
        {!loading && viewMode === 'table' && (
          <>
            <EnterpriseSearchBar
              placeholder="Search technical objects..."
              value={searchTerm}
              onSearch={setSearchTerm}
            />
            <EnterpriseDataTable
              data={paginatedObjects}
              columns={TECHNICAL_OBJECTS_TABLE_COLUMNS}
              selectable={true}
              onSelectionChange={setSelectedObjects}
              loading={false}
              // Mobile responsiveness: pass prop or use CSS to hide columns as needed
              className="overflow-x-auto"
              onRowClick={(row) => window.location.href = `/technical-objects/${row._id || row.id}`}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        {/* Technical Objects List - Only show in property edit mode, not compliance dashboard */}
        {!loading && technicalObjects.length > 0 && isEditMode && (
          <div className="space-y-4 mb-6">
            {technicalObjects.map((object) => {
              const typeInfo = getObjectTypeInfo(object.object_type);
              const statusInfo = getStatusInfo(object.status);
              
              // Find compliance alert for this object
              const complianceAlert = complianceSummary?.alerts?.find(alert => alert.technical_object_id === object._id);
              
              return (
                <div key={object._id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  complianceAlert?.urgency === 'critical' ? 'border-red-300 bg-red-50' :
                  complianceAlert?.urgency === 'high' ? 'border-orange-300 bg-orange-50' :
                  complianceAlert?.urgency === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                  'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <span className="text-2xl mr-3">{typeInfo.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900">{object.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="mr-4">{typeInfo.label}</span>
                          {object.manufacturer && <span className="mr-4">• {object.manufacturer}</span>}
                          {object.model && <span>• {object.model}</span>}
                        </div>
                        {['heating_gas', 'heating_oil', 'heating_wood'].includes(object.object_type) && object.heating_type && (
                          <div className="text-sm text-orange-600 mt-1">
                            🔥 {getHeatingTypes(t).find(h => h.value === object.heating_type)?.label || object.heating_type}
                            {object.cost_per_sqm && <span className="ml-2">• €{object.cost_per_sqm}/m²</span>}
                          </div>
                        )}
                        {/* Compliance Alert */}
                        {complianceAlert && (
                          <div className={`text-sm mt-2 p-2 rounded ${
                            complianceAlert.urgency === 'critical' ? 'bg-red-100 text-red-800' :
                            complianceAlert.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                            complianceAlert.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center">
                                {complianceAlert.urgency === 'critical' && '🚨'}
                                {complianceAlert.urgency === 'high' && '⚠️'}
                                {complianceAlert.urgency === 'medium' && '📅'}
                                <span className="ml-1 font-medium">
                                  {complianceAlert.days_until_due < 0 
                                    ? `${Math.abs(complianceAlert.days_until_due).toLocaleString()} days ${t('technicalObjects.compliance.overdue')}`
                                    : `${t('technicalObjects.compliance.nextInspection')}: ${complianceAlert.days_until_due} days`
                                  }
                                </span>
                              </span>
                              {complianceAlert.estimated_cost && (
                                <span className="text-xs">~€{complianceAlert.estimated_cost}</span>
                              )}
                            </div>
                            <div className="text-xs mt-1 opacity-75">{complianceAlert.legal_requirement}</div>
                            {complianceAlert.inspector_contact_name && (
                              <div className="text-xs mt-1 flex items-center">
                                📞 {complianceAlert.inspector_contact_name}
                                {complianceAlert.inspector_phone && (
                                  <a href={`tel:${complianceAlert.inspector_phone}`} className="ml-2 text-blue-600 hover:text-blue-800">
                                    {complianceAlert.inspector_phone}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isEditMode && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(object)}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title={t('technicalObjects.manager.editButton')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(object._id)}
                            className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title={t('technicalObjects.manager.deleteButton')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        {/* Compliance Actions */}
                        {complianceAlert && (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleScheduleInspection(object._id)}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                              title={t('technicalObjects.compliance.scheduleInspection')}
                            >
                              📅 {t('technicalObjects.compliance.scheduleButton')}
                            </button>
                            <button
                              onClick={() => handleCompleteInspection(object._id)}
                              className="text-xs px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                              title={t('technicalObjects.compliance.markComplete')}
                            >
                              ✅ {t('technicalObjects.compliance.completeButton')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && technicalObjects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {propertyId && isEditMode ? (
              // Property-specific mode: No technical objects for this property
              <>
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5l-1-1z" />
                </svg>
                <p>{t('technicalObjects.manager.noObjectsMessage')}</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('technicalObjects.manager.addFirstButton')}
                </button>
              </>
            ) : (
              // Compliance dashboard mode: No overdue inspections (good news!)
              <>
                <svg className="w-16 h-16 mx-auto mb-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-green-600 mb-2">🎉 Excellent Compliance!</h3>
                <p className="text-green-700">No overdue inspections found. All technical objects are compliant with German legal requirements.</p>
                <div className="mt-4 text-sm text-gray-600">
                  <p>TÜV • Schornsteinfeger • DGUV V3</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              {editingObject ? t('technicalObjects.manager.editTitle') : t('technicalObjects.manager.addTitle')}
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('technicalObjects.manager.form.objectName')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder={t('technicalObjects.manager.form.objectNamePlaceholder')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('technicalObjects.manager.form.objectType')} *
                  </label>
                  <select
                    name="object_type"
                    value={formData.object_type}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {getTechnicalObjectTypes(t).map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('technicalObjects.manager.form.manufacturer')}
                  </label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder={t('technicalObjects.manager.form.manufacturerPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('technicalObjects.manager.form.model')}
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder={t('technicalObjects.manager.form.modelPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('technicalObjects.manager.form.status')}
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {getObjectStatus(t).map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('technicalObjects.manager.form.installationDate')}
                  </label>
                  <input
                    type="date"
                    name="installation_date"
                    value={formData.installation_date}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Heating System Specific Fields */}
              {['heating_gas', 'heating_oil', 'heating_wood'].includes(formData.object_type) && (
                <div className="border-t border-gray-200 pt-4">
                  <h5 className="text-md font-medium text-gray-900 mb-3">{t('technicalObjects.manager.form.heatingSystemDetails')}</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('technicalObjects.manager.form.heatingType')}
                      </label>
                      <select
                        name="heating_type"
                        value={formData.heating_type}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">{t('technicalObjects.manager.form.selectType')}</option>
                        {getHeatingTypes(t).map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('technicalObjects.manager.form.costDistributionMethod')}
                      </label>
                      <select
                        name="distribution_method"
                        value={formData.distribution_method}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">{t('technicalObjects.manager.form.selectMethod')}</option>
                        {getDistributionMethods(t).map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('technicalObjects.manager.form.costPerSqm')}
                      </label>
                      <input
                        type="number"
                        name="cost_per_sqm"
                        value={formData.cost_per_sqm}
                        onChange={handleFormChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder={t('technicalObjects.manager.form.costPerSqmPlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('technicalObjects.manager.form.powerOutput')}
                      </label>
                      <input
                        type="number"
                        name="power_output_kw"
                        value={formData.power_output_kw}
                        onChange={handleFormChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder={t('technicalObjects.manager.form.powerOutputPlaceholder')}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('technicalObjects.manager.form.notes')}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={t('technicalObjects.manager.form.notesPlaceholder')}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  {loading ? t('technicalObjects.manager.form.saving') : (editingObject ? t('technicalObjects.manager.form.updateButton') : t('technicalObjects.manager.form.addButton'))}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  {t('technicalObjects.manager.form.cancelButton')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalObjectsManager;