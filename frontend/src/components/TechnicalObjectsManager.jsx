import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import cachedAxios from '../utils/cachedAxios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getTechnicalObjectTypes = (t) => [
  { value: 'heating_system', label: t('technicalObjects.manager.objectTypes.heating_system'), icon: '🔥' },
  { value: 'elevator', label: t('technicalObjects.manager.objectTypes.elevator'), icon: '🛗' },
  { value: 'intercom', label: t('technicalObjects.manager.objectTypes.intercom'), icon: '📞' },
  { value: 'building_management', label: t('technicalObjects.manager.objectTypes.building_management'), icon: '🏢' },
  { value: 'security_system', label: t('technicalObjects.manager.objectTypes.security_system'), icon: '🔒' },
  { value: 'ventilation', label: t('technicalObjects.manager.objectTypes.ventilation'), icon: '💨' },
  { value: 'solar_panels', label: t('technicalObjects.manager.objectTypes.solar_panels'), icon: '☀️' },
  { value: 'fire_safety', label: t('technicalObjects.manager.objectTypes.fire_safety'), icon: '🚨' },
  { value: 'water_system', label: t('technicalObjects.manager.objectTypes.water_system'), icon: '💧' },
  { value: 'electrical_system', label: t('technicalObjects.manager.objectTypes.electrical_system'), icon: '⚡' }
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
  { value: 'gasheizung', label: t('technicalObjects.manager.heatingTypes.gasheizung') },
  { value: 'fernwaerme', label: t('technicalObjects.manager.heatingTypes.fernwaerme') },
  { value: 'waermepumpe', label: t('technicalObjects.manager.heatingTypes.waermepumpe') },
  { value: 'elektroheizung', label: t('technicalObjects.manager.heatingTypes.elektroheizung') }
];

const getDistributionMethods = (t) => [
  { value: 'surface_area', label: t('technicalObjects.manager.distributionMethods.surface_area') },
  { value: 'consumption', label: t('technicalObjects.manager.distributionMethods.consumption') },
  { value: 'apartment_count', label: t('technicalObjects.manager.distributionMethods.apartment_count') }
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
  
  const [formData, setFormData] = useState({
    name: '',
    object_type: 'heating_system',
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

  // Fetch technical objects for property
  useEffect(() => {
    if (propertyId && isEditMode) {
      fetchTechnicalObjects();
    }
  }, [propertyId, isEditMode]);

  const fetchTechnicalObjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await cachedAxios.get(`${API}/v1/technical-objects/property/${propertyId}`, {
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
      object_type: 'heating_system',
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
      if (formData.object_type === 'heating_system') {
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

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5l-1-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('technicalObjects.manager.title')}</h3>
              <p className="text-orange-100 text-sm">{t('technicalObjects.manager.subtitle')}</p>
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

        {/* Technical Objects List */}
        {!loading && technicalObjects.length > 0 && (
          <div className="space-y-4 mb-6">
            {technicalObjects.map((object) => {
              const typeInfo = getObjectTypeInfo(object.object_type);
              const statusInfo = getStatusInfo(object.status);
              
              return (
                <div key={object._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
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
                        {object.object_type === 'heating_system' && object.heating_type && (
                          <div className="text-sm text-orange-600 mt-1">
                            🔥 {getHeatingTypes(t).find(h => h.value === object.heating_type)?.label || object.heating_type}
                            {object.cost_per_sqm && <span className="ml-2">• €{object.cost_per_sqm}/m²</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isEditMode && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(object)}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(object._id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5l-1-1z" />
            </svg>
            <p>{t('technicalObjects.manager.noObjectsMessage')}</p>
            {isEditMode && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {t('technicalObjects.manager.addFirstButton')}
              </button>
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
              {formData.object_type === 'heating_system' && (
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