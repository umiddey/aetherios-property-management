import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import cachedAxios from '../utils/cachedAxios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TECHNICAL_OBJECT_TYPES = [
  { value: 'heating_system', label: '🔥 Heating System', icon: '🔥' },
  { value: 'elevator', label: '🛗 Elevator', icon: '🛗' },
  { value: 'intercom', label: '📞 Intercom', icon: '📞' },
  { value: 'building_management', label: '🏢 Building Management', icon: '🏢' },
  { value: 'security_system', label: '🔒 Security System', icon: '🔒' },
  { value: 'ventilation', label: '💨 Ventilation', icon: '💨' },
  { value: 'solar_panels', label: '☀️ Solar Panels', icon: '☀️' },
  { value: 'fire_safety', label: '🚨 Fire Safety', icon: '🚨' },
  { value: 'water_system', label: '💧 Water System', icon: '💧' },
  { value: 'electrical_system', label: '⚡ Electrical System', icon: '⚡' }
];

const OBJECT_STATUS = [
  { value: 'active', label: '✅ Active', color: 'bg-green-100 text-green-800' },
  { value: 'maintenance', label: '🔧 Under Maintenance', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'broken', label: '❌ Broken', color: 'bg-red-100 text-red-800' },
  { value: 'decommissioned', label: '🔐 Decommissioned', color: 'bg-gray-100 text-gray-800' },
  { value: 'planned', label: '📅 Planned', color: 'bg-blue-100 text-blue-800' }
];

const HEATING_TYPES = [
  { value: 'zentralheizung', label: 'Zentralheizung (Central)' },
  { value: 'gasheizung', label: 'Gasheizung (Gas)' },
  { value: 'fernwaerme', label: 'Fernwärme (District)' },
  { value: 'waermepumpe', label: 'Wärmepumpe (Heat Pump)' },
  { value: 'elektroheizung', label: 'Elektroheizung (Electric)' }
];

const DISTRIBUTION_METHODS = [
  { value: 'surface_area', label: 'Surface Area (m²)' },
  { value: 'consumption', label: 'Consumption Based (BetrKV)' },
  { value: 'apartment_count', label: 'Equal Distribution' }
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
      setError('Failed to load technical objects');
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
        setError('Failed to save technical object');
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
    if (!window.confirm('Are you sure you want to delete this technical object?')) {
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
      setError('Failed to delete technical object');
    } finally {
      setLoading(false);
    }
  };

  const getObjectTypeInfo = (type) => {
    return TECHNICAL_OBJECT_TYPES.find(t => t.value === type) || TECHNICAL_OBJECT_TYPES[0];
  };

  const getStatusInfo = (status) => {
    return OBJECT_STATUS.find(s => s.value === status) || OBJECT_STATUS[0];
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
              <h3 className="text-lg font-bold text-white">Technical Objects</h3>
              <p className="text-orange-100 text-sm">Manage property equipment and systems</p>
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
              Add Technical Object
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
            <p className="mt-2 text-gray-600">Loading technical objects...</p>
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
                            🔥 {HEATING_TYPES.find(h => h.value === object.heating_type)?.label || object.heating_type}
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
            <p>No technical objects configured for this property</p>
            {isEditMode && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add First Technical Object
              </button>
            )}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              {editingObject ? 'Edit Technical Object' : 'Add New Technical Object'}
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Object Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g., Central Heating System"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Object Type *
                  </label>
                  <select
                    name="object_type"
                    value={formData.object_type}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {TECHNICAL_OBJECT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g., Viessmann"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g., Vitocrossal 300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {OBJECT_STATUS.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Installation Date
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
                  <h5 className="text-md font-medium text-gray-900 mb-3">🔥 Heating System Details</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Heating Type
                      </label>
                      <select
                        name="heating_type"
                        value={formData.heating_type}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">Select Type</option>
                        {HEATING_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost Distribution Method
                      </label>
                      <select
                        name="distribution_method"
                        value={formData.distribution_method}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">Select Method</option>
                        {DISTRIBUTION_METHODS.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost per m² (€)
                      </label>
                      <input
                        type="number"
                        name="cost_per_sqm"
                        value={formData.cost_per_sqm}
                        onChange={handleFormChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., 2.50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Power Output (kW)
                      </label>
                      <input
                        type="number"
                        name="power_output_kw"
                        value={formData.power_output_kw}
                        onChange={handleFormChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., 150.0"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Additional notes, maintenance history, etc."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Saving...' : (editingObject ? 'Update Object' : 'Add Object')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Cancel
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