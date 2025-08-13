// src/components/PropertiesView.js
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Pagination from './Pagination';
import { exportProperties } from '../utils/exportUtils';

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

  return (
    <div className="space-y-8">
      {/* Advanced Filters - Glassmorphism */}
      <div className="bg-white/60 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/30">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-xl rotate-3 hover:rotate-0 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {t('properties.filters')}
              </h3>
              <p className="text-gray-500 text-sm mt-1">{t('properties.smartFilteringText')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">
              {properties.length} Found
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Smart Search Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <svg className="w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('properties.searchPlaceholder')}
              value={propertyFilters.search}
              onChange={(e) => handlePropertyFilterChange('search', e.target.value)}
              className="pl-12 pr-4 py-4 bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 w-full text-gray-900 placeholder-gray-500 shadow-lg hover:shadow-xl"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
          </div>
          
          {/* Property Type Selector */}
          <div className="relative group">
            <select
              value={propertyFilters.property_type}
              onChange={(e) => handlePropertyFilterChange('property_type', e.target.value)}
              className="appearance-none px-4 py-4 bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 w-full text-gray-900 shadow-lg hover:shadow-xl pr-12"
            >
              <option value="">{t('properties.allTypes')}</option>
              <option value="apartment">🏠 {t('properties.apartment')}</option>
              <option value="house">🏡 {t('properties.house')}</option>
              <option value="office">🏢 {t('properties.office')}</option>
              <option value="commercial">🏬 {t('properties.commercial')}</option>
              <option value="complex">🏘️ {t('properties.complex')}</option>
              <option value="building">🏢 {t('properties.building')}</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <svg className="w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Room Range */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">🛏️ Rooms</label>
            <div className="flex space-x-3">
              <input
                type="number"
                placeholder="Min"
                value={propertyFilters.min_rooms}
                onChange={(e) => handlePropertyFilterChange('min_rooms', e.target.value)}
                className="px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 w-full text-gray-900 shadow-lg hover:shadow-xl"
              />
              <input
                type="number"
                placeholder="Max"
                value={propertyFilters.max_rooms}
                onChange={(e) => handlePropertyFilterChange('max_rooms', e.target.value)}
                className="px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 w-full text-gray-900 shadow-lg hover:shadow-xl"
              />
            </div>
          </div>
          
          {/* Surface Range */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">📐 Surface (m²)</label>
            <div className="flex space-x-3">
              <input
                type="number"
                placeholder="Min"
                value={propertyFilters.min_surface}
                onChange={(e) => handlePropertyFilterChange('min_surface', e.target.value)}
                className="px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 w-full text-gray-900 shadow-lg hover:shadow-xl"
              />
              <input
                type="number"
                placeholder="Max"
                value={propertyFilters.max_surface}
                onChange={(e) => handlePropertyFilterChange('max_surface', e.target.value)}
                className="px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 w-full text-gray-900 shadow-lg hover:shadow-xl"
              />
            </div>
          </div>
          
          {/* Archive Toggle */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">🗄️ Archives</label>
            <label className="group flex items-center bg-white/50 backdrop-blur-sm px-6 py-4 rounded-xl hover:bg-white/70 transition-all duration-300 cursor-pointer border border-white/40 shadow-lg hover:shadow-xl">
              <input
                type="checkbox"
                checked={propertyFilters.archived}
                onChange={(e) => handlePropertyFilterChange('archived', e.target.checked)}
                className="mr-4 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200"
              />
              <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{t('properties.showArchived')}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Property Portfolio - Card Grid */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-xl rotate-3 hover:rotate-0 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-4xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {t('properties.title')}
              </h2>
              <p className="text-gray-500 text-sm mt-1">{t('properties.portfolioText', { count: properties.length })}</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => exportProperties(properties)}
              className="group bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl hover:scale-105"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold">{t('common.export')}</span>
            </button>
            <button 
              onClick={() => handleNav('create-property')} 
              className="group bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl hover:scale-105"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-semibold">{t('properties.addProperty')}</span>
            </button>
          </div>
        </div>
        {/* Property Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {properties.map(property => (
            <div
              key={property.id}
              onClick={() => handleNav(`properties/${property.id}`)}
              className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 cursor-pointer overflow-hidden"
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-500/5 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-2 right-2 w-20 h-20 bg-blue-400/20 rounded-full blur-2xl group-hover:bg-blue-400/30 transition-all duration-500"></div>
              
              {/* Status Badge */}
              {/* <div className="absolute top-4 right-4">
                <div className={`px-3 py-1.5 text-xs font-black ${getStatusColor(property.status)} backdrop-blur-sm`}>
                  {property.status === 'empty' ? t('properties.empty') : property.status === 'occupied' ? t('properties.occupied') : property.status}
                </div>
              </div> */}
              
              <div className="relative z-10">
                {/* Property Icon & Type */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <div className={`px-2.5 py-1 text-xs font-black rounded-lg ${getStatusColor(property.status)} backdrop-blur-sm`}>
                      {property.status === 'empty' ? t('properties.empty') : property.status === 'occupied' ? t('properties.occupied') : property.status}
                    </div>
                    <div className={`px-2.5 py-1 text-xs font-black rounded-lg ${getPropertyTypeColor(property.property_type)} shadow-md`}>
                      {property.property_type?.toUpperCase()}
                    </div>
                    <div className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-md ${getFurnishingStatusColor(property.furnishing_status)}`}>
                      {getFurnishingStatusText(property.furnishing_status)}
                    </div>
                  </div>
                </div>
                
                {/* Property Name & ID */}
                <div className="mb-6">
                  <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {property.name}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">ID: {property.id}</p>
                </div>
                
                {/* Address */}
                <div className="flex items-start mb-6">
                  <svg className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-gray-900 font-semibold">{property.street} {property.house_nr}</p>
                    <p className="text-gray-500 text-sm">{property.postcode} {property.city}</p>
                  </div>
                </div>
                
                {/* Rent Display with Betriebskosten Breakdown */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402 2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        {property.betriebskosten_per_sqm ? (
                          <>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Warm Rent (Total)</p>
                            <p className="text-2xl font-black text-gray-900">
                              €{((property.surface_area || 0) * ((property.rent_per_sqm || 0) + property.betriebskosten_per_sqm)).toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Cold Rent</p>
                            <p className="text-2xl font-black text-gray-900">
                              {property.cold_rent ? `€${property.cold_rent}` : 'N/A'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Surface</p>
                      <p className="text-lg font-bold text-gray-700">
                        {property.surface_area || 'N/A'} m²
                      </p>
                    </div>
                  </div>
                  
                  {/* Betriebskosten Breakdown */}
                  {property.betriebskosten_per_sqm && (
                    <div className="mt-3 pt-3 border-t border-gray-200/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cold Rent:</span>
                        <span className="font-semibold">€{((property.surface_area || 0) * (property.rent_per_sqm || 0)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Betriebskosten:</span>
                        <span className="font-semibold">€{((property.surface_area || 0) * property.betriebskosten_per_sqm).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Property Stats */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200/50">
                  <div className="flex items-center text-gray-500">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                    <span className="text-sm font-medium">{property.rooms || '?'} rooms</span>
                  </div>
                  <div className="text-xs text-gray-400 font-medium">
                    Created {formatDate ? formatDate(property.created_at) : 'Unknown'}
                  </div>
                </div>
                
                {/* Hover Indicator */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Empty State */}
          {properties.length === 0 && (
            <div className="col-span-full">
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('properties.noPropertiesFound')}</h3>
                <p className="text-gray-500 mb-8">{t('properties.noPropertiesMessage')}</p>
                <button 
                  onClick={() => handleNav('create-property')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 font-semibold"
                >
                  Add Your First Property
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};

export default PropertiesView;