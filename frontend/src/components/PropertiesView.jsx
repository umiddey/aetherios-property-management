// src/components/PropertiesView.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';

const PropertiesView = ({
  propertyFilters,
  handlePropertyFilterChange,
  properties,
  totalPages,
  currentPage,
  onPageChange,
  setSelectedProperty,
  selectedProperty,
  propertyAgreements,
  propertyInvoices,
  tenants,
  getTenantName,
  getPropertyName,
  selectedAgreement,
  setSelectedAgreement,
  selectedInvoice,
  setSelectedInvoice,
  handleClickInvoice,
  handleClickAgreement,
  setCreateTaskContext,
  handleNav,
  getStatusColor,
  getPropertyTypeColor,
  formatDate,
  formatCurrency,
  t,
  logAction
}) => {
  const { t: translate } = useTranslation();

  const handleAssignTask = (property) => {
    setCreateTaskContext({ property_id: property.id });
    handleNav('create-task');
  };

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
                <tr key={property.id} onClick={() => setSelectedProperty(property)} className="cursor-pointer hover:bg-gray-50">
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

      {/* Selected Property Details */}
      {selectedProperty && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('Property Details')} - {selectedProperty.name}</h3>
            <button onClick={() => handleAssignTask(selectedProperty)} className="bg-green-500 text-white px-4 py-2 rounded-md">
              {t('Assign Task')}
            </button>
          </div>
          <div className="space-y-4">
            <p><strong>{t('Type')}:</strong> {selectedProperty.property_type}</p>
            <p><strong>{t('Address')}:</strong> {selectedProperty.street} {selectedProperty.house_nr}, {selectedProperty.floor ? `Floor ${selectedProperty.floor},` : ''} {selectedProperty.postcode} {selectedProperty.city}</p>
            <p><strong>{t('Surface Area')}:</strong> {selectedProperty.surface_area} m²</p>
            <p><strong>{t('Rooms')}:</strong> {selectedProperty.number_of_rooms}</p>
            <p><strong>{t('Toilets')}:</strong> {selectedProperty.num_toilets}</p>
            <p><strong>{t('Rent per m²')}:</strong> {formatCurrency(selectedProperty.rent_per_sqm)}</p>
            <p><strong>{t('Cold Rent')}:</strong> {formatCurrency(selectedProperty.cold_rent)}</p>
            <p><strong>{t('Status')}:</strong> {selectedProperty.status}</p>
            <p><strong>{t('Description')}:</strong> {selectedProperty.description}</p>
            <p><strong>{t('Owner')}:</strong> {selectedProperty.owner_name} ({selectedProperty.owner_email}, {selectedProperty.owner_phone})</p>
          </div>

          <h4 className="text-md font-semibold text-gray-900 mt-6 mb-2">{t('Rental Agreements')}</h4>
          <ul className="space-y-2">
            {propertyAgreements.map(agreement => (
              <li key={agreement.id} onClick={() => handleClickAgreement(agreement.id)} className="border-b py-2 cursor-pointer hover:bg-gray-50">
                <p><strong>{getTenantName(agreement.tenant_id)}:</strong> {formatDate(agreement.start_date)} - {agreement.end_date ? formatDate(agreement.end_date) : t('Ongoing')}</p>
                <p>{formatCurrency(agreement.monthly_rent)} / month</p>
              </li>
            ))}
            {propertyAgreements.length === 0 && <p className="text-sm text-gray-500">{t('No agreements')}</p>}
          </ul>

          {selectedAgreement && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h5 className="font-semibold">{t('Agreement Details')}</h5>
              <p><strong>{t('Tenant')}:</strong> {getTenantName(selectedAgreement.tenant_id)}</p>
              <p><strong>{t('Start Date')}:</strong> {formatDate(selectedAgreement.start_date)}</p>
              <p><strong>{t('End Date')}:</strong> {selectedAgreement.end_date ? formatDate(selectedAgreement.end_date) : t('Indefinite')}</p>
              <p><strong>{t('Monthly Rent')}:</strong> {formatCurrency(selectedAgreement.monthly_rent)}</p>
              <p><strong>{t('Deposit')}:</strong> {formatCurrency(selectedAgreement.deposit)}</p>
              <p><strong>{t('Notes')}:</strong> {selectedAgreement.notes}</p>
            </div>
          )}

          <h4 className="text-md font-semibold text-gray-900 mt-6 mb-2">{t('Invoices')}</h4>
          <ul className="space-y-2">
            {propertyInvoices.map(invoice => (
              <li key={invoice.id} onClick={() => handleClickInvoice(invoice.id)} className="border-b py-2 cursor-pointer hover:bg-gray-50">
                <p><strong>{invoice.invoice_number}:</strong> {formatCurrency(invoice.amount)} - {invoice.status}</p>
                <p>{t('Due')}: {formatDate(invoice.due_date)}</p>
              </li>
            ))}
            {propertyInvoices.length === 0 && <p className="text-sm text-gray-500">{t('No invoices')}</p>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PropertiesView;