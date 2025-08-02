import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const ITEM_CATEGORIES = [
  { value: 'furniture', label: '🪑 Furniture', icon: '🪑' },
  { value: 'appliance', label: '🔌 Appliances', icon: '🔌' },
  { value: 'electronics', label: '📺 Electronics', icon: '📺' },
  { value: 'kitchen', label: '🍳 Kitchen', icon: '🍳' },
  { value: 'bathroom', label: '🚿 Bathroom', icon: '🚿' },
  { value: 'decoration', label: '🖼️ Decoration', icon: '🖼️' },
  { value: 'lighting', label: '💡 Lighting', icon: '💡' },
  { value: 'other', label: '📦 Other', icon: '📦' }
];

const ITEM_CONDITIONS = [
  { value: 'new', label: '✨ New', color: 'bg-green-100 text-green-800' },
  { value: 'excellent', label: '⭐ Excellent', color: 'bg-blue-100 text-blue-800' },
  { value: 'good', label: '👍 Good', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'fair', label: '👌 Fair', color: 'bg-orange-100 text-orange-800' },
  { value: 'poor', label: '⚠️ Poor', color: 'bg-red-100 text-red-800' }
];

const OWNERSHIP_TYPES = [
  { value: 'landlord', label: '🏠 Landlord Provided', color: 'bg-blue-100 text-blue-800' },
  { value: 'tenant', label: '👤 Tenant Provided', color: 'bg-purple-100 text-purple-800' }
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newItem = {
      id: editingItem ? editingItem.id : `temp_${Date.now()}`,
      ...formData,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      current_value: formData.current_value ? parseFloat(formData.current_value) : null,
      property_id: propertyId,
      created_at: editingItem ? editingItem.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (editingItem) {
      // Update existing item
      const updatedItems = items.map(item => 
        item.id === editingItem.id ? newItem : item
      );
      onItemsChange(updatedItems);
    } else {
      // Add new item
      onItemsChange([...items, newItem]);
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

  const handleDelete = (itemId) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      const updatedItems = items.filter(item => item.id !== itemId);
      onItemsChange(updatedItems);
    }
  };

  const getCategoryIcon = (category) => {
    const cat = ITEM_CATEGORIES.find(c => c.value === category);
    return cat ? cat.icon : '📦';
  };

  const getConditionStyle = (condition) => {
    const cond = ITEM_CONDITIONS.find(c => c.value === condition);
    return cond ? cond.color : 'bg-gray-100 text-gray-800';
  };

  const getOwnershipStyle = (ownership) => {
    const own = OWNERSHIP_TYPES.find(o => o.value === ownership);
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
            <h3 className="text-xl font-bold text-gray-900">Furnished Items</h3>
            <p className="text-sm text-gray-500">{items.length} items • German legal compliance</p>
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
          Add Item
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
                    {ITEM_CONDITIONS.find(c => c.value === item.condition)?.label || item.condition}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getOwnershipStyle(item.ownership)}`}>
                    {OWNERSHIP_TYPES.find(o => o.value === item.ownership)?.label || item.ownership}
                  </span>
                  {item.is_essential && (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                      ⚡ Essential
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No furnished items yet</h3>
          <p className="text-gray-500 mb-4">Add furniture and appliances to track ownership and liability</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Your First Item
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
                  {editingItem ? 'Edit Item' : 'Add Furnished Item'}
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
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Leather Sofa, Washing Machine"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {ITEM_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Condition *
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {ITEM_CONDITIONS.map(cond => (
                        <option key={cond.value} value={cond.value}>{cond.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., IKEA, Samsung"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., EKTORP, WF45K6500AW"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Ownership *
                    </label>
                    <select
                      value={formData.ownership}
                      onChange={(e) => setFormData({ ...formData, ownership: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {OWNERSHIP_TYPES.map(own => (
                        <option key={own.value} value={own.value}>{own.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Purchase Price (€)
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
                      Current Value (€)
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
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="Additional details about the item..."
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
                        Essential for basic living (affects legal liability)
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    {editingItem ? 'Update Item' : 'Add Item'}
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