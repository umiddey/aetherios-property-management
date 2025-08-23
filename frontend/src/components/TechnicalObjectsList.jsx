import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const getObjectTypeIcon = (objectType) => {
  const iconMap = {
    // German Compliance Types - Schornsteinfeger
    'heating_gas': '🔥',
    'heating_oil': '🔥', 
    'heating_wood': '🔥',
    'chimney': '🏠',
    // German Compliance Types - TÜV
    'elevator_passenger': '🛗',
    'elevator_freight': '🛗',
    'pressure_vessel': '⚗️',
    'boiler_system': '🔥',
    'fire_extinguisher': '🚨',
    // German Compliance Types - DGUV V3
    'electrical_installation': '⚡',
    'electrical_portable': '⚡',
    // Standard Building Systems
    'intercom': '📞',
    'building_management': '🏢',
    'security_system': '🔒',
    'ventilation': '💨',
    'air_conditioning': '❄️',
    'water_supply': '💧',
    'sewage_system': '🚰',
    'solar_panels': '☀️',
    // Legacy fallbacks
    'elevator': '🛗',
    'fire_safety': '🚨',
    'plumbing': '🚿',
    'electrical': '⚡',
    'other': '🔧'
  };
  return iconMap[objectType] || '🔧';
};

const getObjectTypeLabel = (objectType, t) => {
  return t(`technicalObjects.types.${objectType}`) || t('technicalObjects.types.technical_object');
};

const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800';
    case 'inactive':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status, t) => {
  const statusKey = `technicalObjects.status.${status}`;
  return t(statusKey) || status;
};

const TechnicalObjectsList = ({ objects = [], loading = false }) => {
  const { t } = useLanguage();
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              <div className="h-6 bg-gray-300 rounded w-16"></div>
            </div>
            <div className="space-y-1">
              <div className="h-3 bg-gray-300 rounded w-1/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-3">🔧</div>
        <p className="text-lg font-medium mb-1">{t('technicalObjects.noObjectsTitle')}</p>
        <p className="text-sm">{t('technicalObjects.noObjectsDescription')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {objects.map((object) => (
        <div 
          key={object._id} 
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getObjectTypeIcon(object.object_type)}</span>
              <h3 className="font-medium text-gray-900 truncate">{object.name}</h3>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(object.status)}`}>
              {getStatusLabel(object.status, t)}
            </span>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t('technicalObjects.type')}:</span>
              <span>{getObjectTypeLabel(object.object_type, t)}</span>
            </div>

            {object.manufacturer && (
              <div className="flex items-center justify-between">
                <span className="font-medium">{t('technicalObjects.manufacturer')}:</span>
                <span className="truncate ml-2">{object.manufacturer}</span>
              </div>
            )}

            {object.model && (
              <div className="flex items-center justify-between">
                <span className="font-medium">{t('technicalObjects.model')}:</span>
                <span className="truncate ml-2">{object.model}</span>
              </div>
            )}

            {/* Heating System Specific Info */}
            {['heating_gas', 'heating_oil', 'heating_wood'].includes(object.object_type) && (
              <div className="border-t pt-2 mt-2">
                {object.heating_type && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('technicalObjects.heating')}:</span>
                    <span className="text-xs">
                      {t(`technicalObjects.heatingTypes.${object.heating_type}`) || object.heating_type}
                    </span>
                  </div>
                )}
                
                {object.fuel_type && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('technicalObjects.fuel')}:</span>
                    <span className="text-xs capitalize">{object.fuel_type}</span>
                  </div>
                )}

                {object.heating_distribution_key && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('technicalObjects.distribution')}:</span>
                    <span className="text-xs">
                      {t(`technicalObjects.distributionTypes.${object.heating_distribution_key}`) || object.heating_distribution_key}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Installation Date */}
            {object.installation_date && (
              <div className="flex items-center justify-between text-xs pt-1 border-t">
                <span className="font-medium">{t('technicalObjects.installed')}:</span>
                <span>{new Date(object.installation_date).toLocaleDateString()}</span>
              </div>
            )}

            {/* Created Info */}
            {object.created_by && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{t('technicalObjects.addedBy')}:</span>
                <span>{object.created_by}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TechnicalObjectsList;