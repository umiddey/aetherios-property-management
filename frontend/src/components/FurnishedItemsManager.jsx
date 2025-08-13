import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import cachedAxios from '../utils/cachedAxios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getItemCategories = (t) => [
  { value: 'furniture', label: t('furnishedItems.categories.furniture'), icon: '🪑' },
  { value: 'appliance', label: t('furnishedItems.categories.appliance'), icon: '🔌' },
  { value: 'electronics', label: t('furnishedItems.categories.electronics'), icon: '📺' },
  { value: 'kitchen', label: t('furnishedItems.categories.kitchen'), icon: '🍳' },
  { value: 'bathroom', label: t('furnishedItems.categories.bathroom'), icon: '🚿' },
  { value: 'decoration', label: t('furnishedItems.categories.decoration'), icon: '🖼️' },
  { value: 'lighting', label: t('furnishedItems.categories.lighting'), icon: '💡' },
  { value: 'other', label: t('furnishedItems.categories.other'), icon: '📦' }
];

const getItemConditions = (t) => [
  { value: 'new', label: t('furnishedItems.conditions.new'), color: 'bg-green-100 text-green-800' },
  { value: 'excellent', label: t('furnishedItems.conditions.excellent'), color: 'bg-blue-100 text-blue-800' },
  { value: 'good', label: t('furnishedItems.conditions.good'), color: 'bg-yellow-100 text-yellow-800' },
  { value: 'fair', label: t('furnishedItems.conditions.fair'), color: 'bg-orange-100 text-orange-800' },
  { value: 'poor', label: t('furnishedItems.conditions.poor'), color: 'bg-red-100 text-red-800' }
];

const getOwnershipTypes = (t) => [
  { value: 'landlord', label: t('furnishedItems.ownership.landlord'), color: 'bg-blue-100 text-blue-800' },
  { value: 'tenant', label: t('furnishedItems.ownership.tenant'), color: 'bg-purple-100 text-purple-800' }
];

const FurnishedItemsManager = ({ 
  items = [], 
  onItemsChange, 
  propertyId = null,
  isEditMode = false 
}) => {
  const { t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'furniture',
    description: '',
    brand: '',
    model: '',
    condition: 'good',
    ownership: 'landlord',
    purchase_price: '',
    current_value: '',
    is_essential: false
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'furniture',
      description: '',
      brand: '',
      model: '',
      condition: 'good',
      ownership: 'landlord',
      purchase_price: '',
      current_value: '',
      is_essential: false
    });
    setShowAddForm(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const itemData = {
      name: formData.name.trim(),
      category: formData.category,
      description: formData.description || null,
      brand: formData.brand || null,
      model: formData.model || null,
      condition: formData.condition,
      ownership: formData.ownership,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      current_value: formData.current_value ? parseFloat(formData.current_value) : null,
      is_essential: formData.is_essential
    };

    if (isEditMode && propertyId) {
      // API mode - save to database
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        if (editingItem) {
          // Update existing item
          const response = await cachedAxios.put(
            `${API}/v1/furnished-items/${editingItem.id}?property_id=${propertyId}`,
            itemData,
            { headers }
          );
          
          const updatedItems = items.map(item => 
            item.id === editingItem.id ? response.data : item
          );
          onItemsChange(updatedItems);
        } else {
          // Create new item
          const response = await cachedAxios.post(
            `${API}/v1/furnished-items/`,
            { ...itemData, property_id: propertyId },
            { headers }
          );
          
          onItemsChange([...items, response.data]);
        }
      } catch (error) {
        console.error('Error saving furnished item:', error);
        alert(t('furnishedItems.errors.saveFailed'));
        return;
      }
    } else {
      // Local state mode (for property creation)
      const newItem = {
        id: editingItem ? editingItem.id : `temp_${Date.now()}`,
        ...itemData,
        property_id: propertyId,
        created_at: editingItem ? editingItem.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        const updatedItems = items.map(item => 
          item.id === editingItem.id ? newItem : item
        );
        onItemsChange(updatedItems);
      } else {
        onItemsChange([...items, newItem]);
      }
    }

    resetForm();
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'furniture',
      description: item.description || '',
      brand: item.brand || '',
      model: item.model || '',
      condition: item.condition || 'good',
      ownership: item.ownership || 'landlord',
      purchase_price: item.purchase_price || '',
      current_value: item.current_value || '',
      is_essential: item.is_essential || false
    });
    setShowAddForm(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm(t('furnishedItems.deleteConfirm'))) {
      if (isEditMode && propertyId) {
        // API mode - delete from database
        try {
          const token = localStorage.getItem('token');
          const headers = { Authorization: `Bearer ${token}` };
          
          await cachedAxios.delete(
            `${API}/v1/furnished-items/${itemId}?property_id=${propertyId}`,
            { headers }
          );
          
          const updatedItems = items.filter(item => item.id !== itemId);
          onItemsChange(updatedItems);
        } catch (error) {
          console.error('Error deleting furnished item:', error);
          alert(t('furnishedItems.errors.deleteFailed'));
        }
      } else {
        // Local state mode
        const updatedItems = items.filter(item => item.id !== itemId);
        onItemsChange(updatedItems);
      }
    }
  };

  const getCategoryIcon = (category) => {
    const cat = getItemCategories(t).find(c => c.value === category);
    return cat ? cat.icon : '📦';
  };

  const getConditionStyle = (condition) => {
    const cond = getItemConditions(t).find(c => c.value === condition);
    return cond ? cond.color : 'bg-gray-100 text-gray-800';
  };

  const getOwnershipStyle = (ownership) => {
    const own = getOwnershipTypes(t).find(o => o.value === ownership);
    return own ? own.color : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{t('furnishedItems.title')}</h3>
            <p className="text-sm text-gray-500">{t('furnishedItems.subtitle', { count: items.length })}</p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('furnishedItems.addButton')}
        </button>
      </div>

      {/* Items List */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{getCategoryIcon(item.category)}</span>
                  <div>
                    <h4 className="font-bold text-gray-900">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.brand} {item.model}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${getConditionStyle(item.condition)}`}>
                    {getItemConditions(t).find(c => c.value === item.condition)?.label || item.condition}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getOwnershipStyle(item.ownership)}`}>
                    {getOwnershipTypes(t).find(o => o.value === item.ownership)?.label || item.ownership}
                  </span>
                  {item.is_essential && (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                      ⚡ {t('furnishedItems.essential')}
                    </span>
                  )}
                </div>
                
                {item.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
                )}
                
                {(item.current_value || item.purchase_price) && (
                  <div className="text-xs text-gray-500">
                    {item.current_value && <span>Value: €{item.current_value}</span>}
                    {item.purchase_price && item.current_value && <span> • </span>}
                    {item.purchase_price && <span>Purchased: €{item.purchase_price}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('furnishedItems.noItemsTitle')}</h3>
          <p className="text-gray-500 mb-4">{t('furnishedItems.noItemsDescription')}</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('furnishedItems.addButton')}
          </button>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingItem ? t('furnishedItems.editTitle') : t('furnishedItems.addTitle')}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('furnishedItems.form.itemName')} *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('furnishedItems.form.itemNamePlaceholder')}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('furnishedItems.form.category')} *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {getItemCategories(t).map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('furnishedItems.form.condition')} *
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {getItemConditions(t).map(cond => (
                        <option key={cond.value} value={cond.value}>{cond.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('furnishedItems.form.brand')}
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('furnishedItems.form.brandPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('furnishedItems.form.model')}
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('furnishedItems.form.modelPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('furnishedItems.form.ownership')} *
                    </label>
                    <select
                      value={formData.ownership}
                      onChange={(e) => setFormData({ ...formData, ownership: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {getOwnershipTypes(t).map(own => (
                        <option key={own.value} value={own.value}>{own.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('furnishedItems.form.purchasePrice')}
                    </label>
                    <input
                      type="number"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('furnishedItems.form.currentValue')}
                    </label>
                    <input
                      type="number"
                      value={formData.current_value}
                      onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('furnishedItems.form.description')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder={t('furnishedItems.form.descriptionPlaceholder')}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_essential}
                        onChange={(e) => setFormData({ ...formData, is_essential: e.target.checked })}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-bold text-gray-700">
                        {t('furnishedItems.form.essentialDescription')}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    {t('furnishedItems.form.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    {editingItem ? t('furnishedItems.form.save') : t('furnishedItems.form.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FurnishedItemsManager;