// src/components/PropertiesView.js
import React from 'react';
import Pagination from './Pagination';

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
  formatDate,
  t
}) => {

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Filters')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={propertyFilters.property_type}
            onChange={(e) => handlePropertyFilterChange('property_type', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('All Types')}</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="office">Office</option>
            <option value="commercial">Commercial</option>
            <option value="complex">Complex</option>
          </select>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder={t('Min Rooms')}
              value={propertyFilters.min_rooms}
              onChange={(e) => handlePropertyFilterChange('min_rooms', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md w-1/2"
            />
            <input
              type="number"
              placeholder={t('Max Rooms')}
              value={propertyFilters.max_rooms}
              onChange={(e) => handlePropertyFilterChange('max_rooms', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md w-1/2"
            />
          </div>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder={t('Min Surface')}
              value={propertyFilters.min_surface}
              onChange={(e) => handlePropertyFilterChange('min_surface', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md w-1/2"
            />
            <input
              type="number"
              placeholder={t('Max Surface')}
              value={propertyFilters.max_surface}
              onChange={(e) => handlePropertyFilterChange('max_surface', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md w-1/2"
            />
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={propertyFilters.archived}
              onChange={(e) => handlePropertyFilterChange('archived', e.target.checked)}
              className="mr-2"
            />
            {t('Show Archived')}
          </label>
        </div>
      </div>

      {/* Property List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">{t('Properties')}</h2>
          <button onClick={() => handleNav('create-property')} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            {t('Add Property')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Address')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Created')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {properties.map(property => (
                <tr key={property.id} onClick={() => handleNav(`properties/${property.id}`)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{property.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPropertyTypeColor(property.property_type)}`}>
                      {property.property_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{property.street} {property.house_nr}, {property.postcode} {property.city}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(property.status)}`}>
                      {property.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(property.created_at)}</td>
                </tr>
              ))}
              {properties.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">{t('No properties found')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};

export default PropertiesView;