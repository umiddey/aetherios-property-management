import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import FurnishedItemsManager from './FurnishedItemsManager';
import TechnicalObjectsManager from './TechnicalObjectsManager';
import cachedAxios from '../utils/cachedAxios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PropertyEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [property, setProperty] = useState(null);
  const [furnishedItems, setFurnishedItems] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    property_type: '',
    street: '',
    house_nr: '',
    postcode: '',
    city: '',
    floor: '',
    surface_area: '',
    number_of_rooms: '',
    num_toilets: '',
    max_tenants: '',
    description: '',
    rent_per_sqm: '',
    betriebskosten_per_sqm: '',
    cold_rent: '',
    status: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    furnishing_status: 'unfurnished',
    owned_by_firm: false
  });

  // Load property data on mount
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch property details
        const propertyResponse = await cachedAxios.get(`${API}/v1/properties/${id}`, { headers });
        const propertyData = propertyResponse.data;
        setProperty(propertyData);
        
        // Set form data
        setFormData({
          name: propertyData.name || '',
          property_type: propertyData.property_type || '',
          street: propertyData.street || '',
          house_nr: propertyData.house_nr || '',
          postcode: propertyData.postcode || '',
          city: propertyData.city || '',
          floor: propertyData.floor || '',
          surface_area: propertyData.surface_area?.toString() || '',
          number_of_rooms: propertyData.number_of_rooms?.toString() || '',
          num_toilets: propertyData.num_toilets?.toString() || '',
          max_tenants: propertyData.max_tenants?.toString() || '',
          description: propertyData.description || '',
          rent_per_sqm: propertyData.rent_per_sqm?.toString() || '',
          betriebskosten_per_sqm: propertyData.betriebskosten_per_sqm?.toString() || '',
          cold_rent: propertyData.cold_rent?.toString() || '',
          status: propertyData.status || '',
          owner_name: propertyData.owner_name || '',
          owner_email: propertyData.owner_email || '',
          owner_phone: propertyData.owner_phone || '',
          furnishing_status: propertyData.furnishing_status || 'unfurnished',
          owned_by_firm: propertyData.owned_by_firm || false
        });
        
        // Always try to fetch furnished items for the property
        try {
          const itemsResponse = await cachedAxios.get(`${API}/v1/furnished-items/property/${id}`, { headers });
          console.log('Furnished items response:', itemsResponse.data);
          setFurnishedItems(itemsResponse.data || []);
        } catch (itemsError) {
          console.warn('Could not fetch furnished items:', itemsError);
          setFurnishedItems([]);
        }
        
      } catch (error) {
        setError('Failed to load property data');
        console.error('Property fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Prepare update data (only include changed fields)
      const updateData = {
        name: formData.name,
        property_type: formData.property_type,
        street: formData.street,
        house_nr: formData.house_nr,
        postcode: formData.postcode,
        city: formData.city,
        floor: formData.floor || null,
        surface_area: parseFloat(formData.surface_area),
        number_of_rooms: parseInt(formData.number_of_rooms),
        num_toilets: formData.num_toilets ? parseInt(formData.num_toilets) : null,
        max_tenants: formData.max_tenants ? parseInt(formData.max_tenants) : null,
        description: formData.description || null,
        rent_per_sqm: formData.rent_per_sqm ? parseFloat(formData.rent_per_sqm) : null,
        betriebskosten_per_sqm: formData.betriebskosten_per_sqm ? parseFloat(formData.betriebskosten_per_sqm) : null,
        cold_rent: formData.cold_rent ? parseFloat(formData.cold_rent) : null,
        status: formData.status,
        owner_name: formData.owner_name || null,
        owner_email: formData.owner_email || null,
        owner_phone: formData.owner_phone || null,
        furnishing_status: formData.furnishing_status
      };
      
      // Update property
      await cachedAxios.put(`${API}/v1/properties/${id}`, updateData, { headers });
      
      // Navigate back to property detail page
      navigate(`/properties/${id}`);
      
    } catch (error) {
      setError('Failed to save property changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/properties/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold text-red-800 mb-2">{t('properties.propertyNotFoundTitle')}</h2>
        <p className="text-red-600 mb-4">{t('properties.propertyNotFoundMessage')}</p>
        <button 
          onClick={() => navigate('/properties')}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          {t('properties.backToProperties')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {t('properties.editProperty')}
            </h1>
            <p className="text-gray-500 mt-1">ID: {property.id}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Property Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Property Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Property Type</label>
              <select
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              >
                <option value="apartment">🏠 Apartment</option>
                <option value="house">🏡 House</option>
                <option value="office">🏢 Office</option>
                <option value="commercial">🏬 Commercial</option>
                <option value="complex">🏘️ Complex</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="empty">Empty</option>
                <option value="occupied">Occupied</option>
                <option value="active">Active</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Furnishing Status</label>
              <select
                name="furnishing_status"
                value={formData.furnishing_status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="unfurnished">🏠 Unfurnished</option>
                <option value="furnished">🛋️ Furnished</option>
                <option value="partially_furnished">🏡 Partially Furnished</option>
              </select>
            </div>

            {/* Property Ownership Section */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="owned_by_firm"
                  id="owned_by_firm"
                  checked={formData.owned_by_firm}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="owned_by_firm" className="ml-3 text-sm font-medium text-gray-900">
                  🏢 Property owned by firm
                </label>
              </div>
              <p className="text-xs text-amber-700 mt-2 ml-7">
                Check this if the property management firm owns this property (affects invoice accounting)
              </p>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Street</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">House Number</label>
              <input
                type="text"
                name="house_nr"
                value={formData.house_nr}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Postal Code</label>
              <input
                type="text"
                name="postcode"
                value={formData.postcode}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Floor field - hide for Complex and Building */}
              {!['complex', 'building'].includes(property?.property_type) && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Floor</label>
                  <input
                    type="text"
                    name="floor"
                    value={formData.floor}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="e.g., 2nd, Ground"
                  />
                </div>
              )}

              {/* Number of Floors for Building */}
              {property?.property_type === 'building' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Number of Floors *</label>
                  <input
                    type="number"
                    name="floor"
                    value={formData.floor}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    min="1"
                    placeholder="Total floors in building"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Surface Area (m²) *</label>
                <input
                  type="number"
                  name="surface_area"
                  value={formData.surface_area}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {property?.property_type === 'building' 
                    ? 'Number of Apartments *' 
                    : property?.property_type === 'complex'
                    ? 'Number of Buildings *'
                    : 'Number of Rooms *'}
                </label>
                <input
                  type="number"
                  name="number_of_rooms"
                  value={formData.number_of_rooms}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  min="1"
                  required
                />
              </div>
            </div>

          </div>

          {/* Rental Information Section - Hide for Complex */}
          {property?.property_type !== 'complex' && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rental Information</h3>
                
                {property?.property_type === 'building' ? (
                  // Buildings: Only rent per sqm and betriebskosten
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Rent per m² (€) *</label>
                      <input
                        type="number"
                        step="0.01"
                        name="rent_per_sqm"
                        value={formData.rent_per_sqm}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Betriebskosten per m² (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="betriebskosten_per_sqm"
                        value={formData.betriebskosten_per_sqm}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="e.g. 2.50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Cold Rent (Kaltmiete) (€)</label>
                      <input
                        type="text"
                        value={((parseFloat(formData.surface_area) || 0) * (parseFloat(formData.rent_per_sqm) || 0)).toFixed(2)}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100"
                      />
                    </div>
                  </div>
                ) : (
                  // Apartments, Offices, Houses, Commercial: Full rental section
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Number of Toilets</label>
                      <input
                        type="number"
                        name="num_toilets"
                        value={formData.num_toilets}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Max Tenants</label>
                      <input
                        type="number"
                        name="max_tenants"
                        value={formData.max_tenants}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        min="1"
                        placeholder="Leave empty for no limit"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Rent per m² (€) *</label>
                      <input
                        type="number"
                        step="0.01"
                        name="rent_per_sqm"
                        value={formData.rent_per_sqm}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Betriebskosten per m² (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="betriebskosten_per_sqm"
                        value={formData.betriebskosten_per_sqm}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="e.g. 2.50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Cold Rent (Kaltmiete) (€)</label>
                      <input
                        type="text"
                        value={((parseFloat(formData.surface_area) || 0) * (parseFloat(formData.rent_per_sqm) || 0)).toFixed(2)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Betriebskosten Total (€)</label>
                      <input
                        type="text"
                        value={((parseFloat(formData.surface_area) || 0) * (parseFloat(formData.betriebskosten_per_sqm) || 0)).toFixed(2)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Warm Rent (Warmmiete) (€)</label>
                      <input
                        type="text"
                        value={((parseFloat(formData.surface_area) || 0) * ((parseFloat(formData.rent_per_sqm) || 0) + (parseFloat(formData.betriebskosten_per_sqm) || 0))).toFixed(2)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Property Status and Ownership */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Status & Ownership</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Property Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="empty">Empty</option>
                  <option value="active">Active</option>
                  <option value="cancel">{t('common.cancel')}</option>
                </select>
              </div>

              {/* Hide furnishing fields for Complex */}
              {property?.property_type !== 'complex' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Furnishing Status</label>
                  <select
                    name="furnishing_status"
                    value={formData.furnishing_status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="unfurnished">Unfurnished</option>
                    <option value="furnished">Furnished</option>
                    <option value="partially_furnished">Partially Furnished</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Owner Name</label>
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Owner Email</label>
                <input
                  type="email"
                  name="owner_email"
                  value={formData.owner_email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Owner Phone</label>
                <input
                  type="tel"
                  name="owner_phone"
                  value={formData.owner_phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="Optional property description..."
          />
        </div>
      </div>

      {/* Furnished Items Management - Hide for Complex */}
      {property?.property_type !== 'complex' && (
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="mb-6">
          <h2 className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
            Furnished Items Management
          </h2>
          <p className="text-gray-500">
            Manage the furnished items for this property. This affects the German legal liability classification.
          </p>
        </div>
        
        <FurnishedItemsManager
          items={furnishedItems}
          onItemsChange={setFurnishedItems}
          propertyId={id}
          isEditMode={true}
        />
        </div>
      )}

      {/* Technical Objects Management */}
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="mb-6">
          <h2 className="text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            Technical Objects Management
          </h2>
          <p className="text-gray-500">
            Manage technical equipment and systems for this property. Includes heating, elevators, and other building systems with German BetrKV compliance.
          </p>
        </div>
        
        <TechnicalObjectsManager
          propertyId={id}
          isEditMode={true}
        />
      </div>
    </div>
  );
};

export default PropertyEditPage;