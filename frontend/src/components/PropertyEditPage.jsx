import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import FurnishedItemsManager from './FurnishedItemsManager';
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
    cold_rent: '',
    status: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    furnishing_status: 'unfurnished'
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
          cold_rent: propertyData.cold_rent?.toString() || '',
          status: propertyData.status || '',
          owner_name: propertyData.owner_name || '',
          owner_email: propertyData.owner_email || '',
          owner_phone: propertyData.owner_phone || '',
          furnishing_status: propertyData.furnishing_status || 'unfurnished'
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        <h2 className="text-lg font-semibold text-red-800 mb-2">Property Not Found</h2>
        <p className="text-red-600 mb-4">The property you're trying to edit could not be found.</p>
        <button 
          onClick={() => navigate('/properties')}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Back to Properties
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
              Edit Property
            </h1>
            <p className="text-gray-500 mt-1">ID: {property.id}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
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
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Surface Area (m²)</label>
              <input
                type="number"
                name="surface_area"
                value={formData.surface_area}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Number of Rooms</label>
              <input
                type="number"
                name="number_of_rooms"
                value={formData.number_of_rooms}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Cold Rent (€)</label>
              <input
                type="number"
                step="0.01"
                name="cold_rent"
                value={formData.cold_rent}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Optional Details</h3>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Floor</label>
              <input
                type="text"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Number of Toilets</label>
              <input
                type="number"
                name="num_toilets"
                value={formData.num_toilets}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
              />
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

      {/* Furnished Items Management */}
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
    </div>
  );
};

export default PropertyEditPage;