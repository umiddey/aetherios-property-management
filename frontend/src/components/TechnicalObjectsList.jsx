import React from 'react';

const getObjectTypeIcon = (objectType) => {
  const iconMap = {
    'heating_system': '🔥',
    'elevator': '🛗',
    'intercom': '📞',
    'security_system': '🔒',
    'fire_safety': '🚨',
    'ventilation': '💨',
    'plumbing': '🚿',
    'electrical': '⚡',
    'other': '🔧'
  };
  return iconMap[objectType] || '🔧';
};

const getObjectTypeLabel = (objectType) => {
  const labelMap = {
    'heating_system': 'Heating System',
    'elevator': 'Elevator',
    'intercom': 'Intercom',
    'security_system': 'Security System',
    'fire_safety': 'Fire Safety',
    'ventilation': 'Ventilation',
    'plumbing': 'Plumbing',
    'electrical': 'Electrical',
    'other': 'Other'
  };
  return labelMap[objectType] || 'Technical Object';
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

const getStatusLabel = (status) => {
  switch (status) {
    case 'active':
      return '✅ Active';
    case 'maintenance':
      return '🔧 Maintenance';
    case 'inactive':
      return '❌ Inactive';
    default:
      return status;
  }
};

const TechnicalObjectsList = ({ objects = [], loading = false }) => {
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
        <p className="text-lg font-medium mb-1">No Technical Objects</p>
        <p className="text-sm">Add technical equipment and systems to track maintenance and compliance</p>
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
              {getStatusLabel(object.status)}
            </span>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span className="font-medium">Type:</span>
              <span>{getObjectTypeLabel(object.object_type)}</span>
            </div>

            {object.manufacturer && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Manufacturer:</span>
                <span className="truncate ml-2">{object.manufacturer}</span>
              </div>
            )}

            {object.model && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Model:</span>
                <span className="truncate ml-2">{object.model}</span>
              </div>
            )}

            {/* Heating System Specific Info */}
            {object.object_type === 'heating_system' && (
              <div className="border-t pt-2 mt-2">
                {object.heating_type && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Heating:</span>
                    <span className="text-xs">
                      {object.heating_type === 'zentralheizung' ? 'Central' :
                       object.heating_type === 'etagenheizung' ? 'Floor' :
                       object.heating_type === 'einzelheizung' ? 'Individual' :
                       object.heating_type}
                    </span>
                  </div>
                )}
                
                {object.fuel_type && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Fuel:</span>
                    <span className="text-xs capitalize">{object.fuel_type}</span>
                  </div>
                )}

                {object.heating_distribution_key && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Distribution:</span>
                    <span className="text-xs">
                      {object.heating_distribution_key === 'surface_area' ? 'Surface Area' :
                       object.heating_distribution_key === 'apartment_count' ? 'Equal' :
                       object.heating_distribution_key === 'consumption' ? 'Consumption' :
                       object.heating_distribution_key}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Installation Date */}
            {object.installation_date && (
              <div className="flex items-center justify-between text-xs pt-1 border-t">
                <span className="font-medium">Installed:</span>
                <span>{new Date(object.installation_date).toLocaleDateString()}</span>
              </div>
            )}

            {/* Created Info */}
            {object.created_by && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Added by:</span>
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