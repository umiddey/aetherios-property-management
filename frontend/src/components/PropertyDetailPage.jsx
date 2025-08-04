import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cachedAxios from '../utils/cachedAxios';
import { useLanguage } from '../contexts/LanguageContext';
import TechnicalObjectsList from './TechnicalObjectsList';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PropertyDetailPage = ({ 
  getStatusColor, 
  getPropertyTypeColor, 
  formatDate, 
  formatCurrency, 
  getTenantName,
  handleNav 
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [property, setProperty] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [manager, setManager] = useState(null);
  const [furnishedItems, setFurnishedItems] = useState([]);
  const [technicalObjects, setTechnicalObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        const [propertyRes, agreementsRes, invoicesRes, technicalObjectsRes] = await Promise.all([
          cachedAxios.get(`${API}/v1/properties/${id}`),
          cachedAxios.get(`${API}/v1/contracts/by-entity/property/${id}`),
          cachedAxios.get(`${API}/v1/invoices/?property_id=${id}`),
          cachedAxios.get(`${API}/v1/technical-objects/property/${id}`)
        ]);
        
        setProperty(propertyRes.data);
        setAgreements(agreementsRes.data.filter(contract => contract.contract_type === 'rental'));
        setInvoices(invoicesRes.data);
        setTechnicalObjects(technicalObjectsRes.data || []);
        
        // Fetch manager information if manager_id exists
        if (propertyRes.data.manager_id) {
          try {
            const managerRes = await cachedAxios.get(`${API}/v1/users/${propertyRes.data.manager_id}`);
            setManager(managerRes.data);
          } catch (managerError) {
            console.warn('Could not fetch manager details:', managerError);
          }
        }
        
        // Fetch furnished items for the property
        try {
          const itemsRes = await cachedAxios.get(`${API}/v1/furnished-items/property/${id}`);
          setFurnishedItems(itemsRes.data || []);
        } catch (itemsError) {
          console.warn('Could not fetch furnished items:', itemsError);
          setFurnishedItems([]);
        }
      } catch (error) {
        console.error('Error fetching property details:', error);
        setError(t('properties.errors.loadPropertyDetails'));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPropertyDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || t('properties.propertyNotFound')}</p>
          <button 
            onClick={() => navigate('/properties')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            {t('properties.backToProperties')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/properties')}
            className="mb-6 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('properties.backToProperties')}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{property.name}</h1>
              <div className="flex items-center gap-4">
                <p className="text-lg text-gray-600">{t('properties.propertyDetails')}</p>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(property.status)}`}>
                  {property.status}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPropertyTypeColor(property.property_type)}`}>
                  {property.property_type}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/properties/${property.id}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('common.edit')} {t('properties.title')}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Property Information */}
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {t('properties.propertyInformation')}
            </h2>
            
            <div className="space-y-6">
              {/* Address Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('properties.address')}
                </h3>
                <p className="text-gray-700">
                  {property.street} {property.house_nr}
                  {property.floor && `, Floor ${property.floor}`}<br/>
                  {property.postcode} {property.city}
                </p>
              </div>

              {/* Property Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-sm text-blue-600 font-medium">{t('properties.surfaceArea')}</div>
                  <div className="text-xl font-bold text-blue-900">{property.surface_area} m²</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-sm text-green-600 font-medium">Rooms</div>
                  <div className="text-xl font-bold text-green-900">{property.number_of_rooms}</div>
                </div>
                {property.num_toilets && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-sm text-purple-600 font-medium">Toilets</div>
                    <div className="text-xl font-bold text-purple-900">{property.num_toilets}</div>
                  </div>
                )}
                {property.rent_per_sqm && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="text-sm text-yellow-600 font-medium">{t('properties.rentPerSqm')}</div>
                    <div className="text-xl font-bold text-yellow-900">{formatCurrency(property.rent_per_sqm)}</div>
                  </div>
                )}
              </div>

              {/* Financial Information */}
              {(property.cold_rent || property.betriebskosten_per_sqm) && (
                <div className="bg-emerald-50 rounded-lg p-4">
                  <h3 className="font-medium text-emerald-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Monthly Rent
                  </h3>
                  
                  {property.betriebskosten_per_sqm ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-emerald-700">{t('properties.coldRent')}:</span>
                        <span className="font-bold text-emerald-900">
                          {formatCurrency((property.surface_area || 0) * (property.rent_per_sqm || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-700">{t('properties.betriebskosten')}:</span>
                        <span className="font-bold text-emerald-900">
                          {formatCurrency((property.surface_area || 0) * property.betriebskosten_per_sqm)}
                        </span>
                      </div>
                      <div className="border-t border-emerald-200 pt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-emerald-800">{t('properties.warmRent')}:</span>
                          <span className="text-2xl font-bold text-emerald-900">
                            {formatCurrency((property.surface_area || 0) * ((property.rent_per_sqm || 0) + property.betriebskosten_per_sqm))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : property.cold_rent ? (
                    <div>
                      <span className="text-emerald-700">Cold Rent:</span>
                      <p className="text-2xl font-bold text-emerald-900">{formatCurrency(property.cold_rent)}</p>
                    </div>
                  ) : null}
                </div>
              )}
              
              {/* Manager Information */}
              {manager && (
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="font-medium text-indigo-900 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Property Manager
                  </h3>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-indigo-900">{manager.full_name || manager.username}</p>
                    {manager.email && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href={`mailto:${manager.email}`} className="text-indigo-700 hover:text-indigo-800 hover:underline">
                          {manager.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Meta Information */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-700">{formatDate(property.created_at)}</span>
                </div>
              </div>
              
              {property.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{property.description}</p>
                </div>
              )}
            </div>
            
          </div>

          {/* Owner Information */}
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Owner Information
            </h2>
            
            <div className="space-y-4">
              {property.owner_name || property.owner_email || property.owner_phone ? (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {property.owner_name && (
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium text-purple-900">{property.owner_name}</span>
                      </div>
                    )}
                    
                    {property.owner_email && (
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href={`mailto:${property.owner_email}`} className="text-purple-700 hover:text-purple-800 hover:underline">
                          {property.owner_email}
                        </a>
                      </div>
                    )}
                    
                    {property.owner_phone && (
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <a href={`tel:${property.owner_phone}`} className="text-purple-700 hover:text-purple-800 hover:underline">
                          {property.owner_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No owner information</h3>
                  <p className="mt-1 text-sm text-gray-500">{t('properties.ownerDetailsNotAvailable')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rental Agreements */}
        <div className="mt-8 bg-white shadow-lg rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('tenants.rentalAgreements')}
            </h2>
{agreements.length > 0 && (
              <button
                onClick={() => navigate('/create-contract', { 
                  state: { 
                    prefilledData: { 
                      contract_type: 'rental',
                      property_id: property.id,
                      property_name: property.name,
                      title: `Rental Agreement - ${property.name}`,
                      parties: [
                        {
                          name: property.owner_name || 'Property Owner',
                          role: 'Landlord',
                          contact_email: property.owner_email || '',
                          contact_phone: property.owner_phone || ''
                        },
                        {
                          name: '',
                          role: 'Tenant',
                          contact_email: '',
                          contact_phone: ''
                        }
                      ]
                    }
                  } 
                })}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('contracts.createRentalContract')}
              </button>
            )}
          </div>
          
          {agreements.length > 0 ? (
            <div className="space-y-4">
              {agreements.map(contract => {
                const currentDate = new Date();
                const startDate = new Date(contract.start_date);
                const endDate = contract.end_date ? new Date(contract.end_date) : null;
                
                let status = contract.status || 'active';
                let statusColor = 'bg-green-100 text-green-800';
                let statusIcon = '✓';
                
                if (contract.status === 'expired' || (endDate && endDate < currentDate)) {
                  status = 'expired';
                  statusColor = 'bg-red-100 text-red-800';
                  statusIcon = '⚠';
                } else if (contract.status === 'pending' || startDate > currentDate) {
                  status = 'upcoming';
                  statusColor = 'bg-yellow-100 text-yellow-800';
                  statusIcon = '⏰';
                } else if (contract.status === 'terminated' || contract.is_archived) {
                  status = 'historical';
                  statusColor = 'bg-gray-100 text-gray-800';
                  statusIcon = '📁';
                }
                
                // Extract tenant name from parties
                const tenantParty = contract.parties?.find(party => party.role === 'Tenant');
                const tenantName = tenantParty?.name || t('tenants.unknownTenant');
                
                return (
                  <div key={contract.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{tenantName}</h3>
                          <p className="text-sm text-gray-600">{formatDate(contract.start_date)} - {contract.end_date ? formatDate(contract.end_date) : t('contracts.ongoing')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor} flex items-center gap-1`}>
                          <span>{statusIcon}</span>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        <button
                          onClick={() => navigate(`/contracts/${contract.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {t('properties.viewContract')}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Contract Value:</span>
                        <p className="text-gray-900">{formatCurrency(contract.value || 0)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Type:</span>
                        <p className="text-gray-900">{contract.contract_type}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Duration:</span>
                        <p className="text-gray-900">
                          {endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30)) : t('contracts.ongoing')} 
                          {endDate ? ' months' : ''}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{t('common.status')}:</span>
                        <p className="text-gray-900">{contract.status}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No rental contracts</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a rental contract for this property.</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/create-contract', { 
                    state: { 
                      prefilledData: { 
                        contract_type: 'rental',
                        property_id: property.id,
                        property_name: property.name,
                        title: `Rental Agreement - ${property.name}`,
                        parties: [
                          {
                            name: property.owner_name || 'Property Owner',
                            role: 'Landlord',
                            contact_email: property.owner_email || '',
                            contact_phone: property.owner_phone || ''
                          },
                          {
                            name: '',
                            role: 'Tenant',
                            contact_email: '',
                            contact_phone: ''
                          }
                        ]
                      }
                    } 
                  })}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('contracts.createFirstRentalContract')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="mt-8 bg-white shadow-lg rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {t('invoices.title')}
            </h2>
{invoices.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  {t('invoices.createFromContractNote')}
                </p>
              </div>
            )}
          </div>
          
          {invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map(invoice => {
                const currentDate = new Date();
                const dueDate = new Date(invoice.due_date);
                const isOverdue = dueDate < currentDate && invoice.status !== 'paid';
                
                let statusColor = 'bg-yellow-100 text-yellow-800';
                let statusIcon = '⏳';
                
                if (invoice.status === 'paid') {
                  statusColor = 'bg-green-100 text-green-800';
                  statusIcon = '✓';
                } else if (isOverdue) {
                  statusColor = 'bg-red-100 text-red-800';
                  statusIcon = '⚠';
                } else if (invoice.status === 'pending') {
                  statusColor = 'bg-yellow-100 text-yellow-800';
                  statusIcon = '⏳';
                }
                
                return (
                  <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                       onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{invoice.invoice_number}</h3>
                          <p className="text-sm text-gray-600">{getTenantName(invoice.tenant_id)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor} flex items-center gap-1`}>
                          <span>{statusIcon}</span>
                          {isOverdue ? 'Overdue' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(invoice.amount)}</p>
                          <p className="text-sm text-gray-600">Due: {formatDate(invoice.due_date)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Invoice Date:</span>
                        <p className="text-gray-900">{formatDate(invoice.invoice_date)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Due Date:</span>
                        <p className="text-gray-900">{formatDate(invoice.due_date)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{t('common.status')}:</span>
                        <p className="text-gray-900">{isOverdue ? 'Overdue' : invoice.status}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Days Until Due:</span>
                        <p className="text-gray-900">
                          {invoice.status === 'paid' ? 'Paid' : Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24))} days
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
              <p className="mt-1 text-sm text-gray-500">{t('invoices.createFromContractInstructions')}</p>
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 text-center">
                  {t('invoices.createFromContractNote')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Furnished Items Section */}
        {property.furnishing_status !== 'unfurnished' && (
          <div className="mt-8 bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {t('properties.furnishedItems', { count: furnishedItems.length })}
              </h2>
              <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
                property.furnishing_status === 'furnished' ? 'bg-emerald-100 text-emerald-800' :
                property.furnishing_status === 'partially_furnished' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {property.furnishing_status === 'furnished' ? '🛋️ Furnished' :
                 property.furnishing_status === 'partially_furnished' ? '🏡 Partially Furnished' :
                 '🏠 Unfurnished'}
              </span>
            </div>
            
            {furnishedItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {furnishedItems.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.ownership === 'landlord' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.ownership === 'landlord' ? '🏠 Landlord' : '👤 Tenant'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Category:</span> {item.category}</p>
                      {item.brand && <p><span className="font-medium">Brand:</span> {item.brand}</p>}
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Condition:</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.condition === 'new' ? 'bg-green-100 text-green-800' :
                          item.condition === 'excellent' ? 'bg-blue-100 text-blue-800' :
                          item.condition === 'good' ? 'bg-yellow-100 text-yellow-800' :
                          item.condition === 'fair' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.condition}
                        </span>
                      </div>
                      {item.current_value && (
                        <p><span className="font-medium">Value:</span> €{item.current_value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <p>{t('properties.noFurnishedItems')}</p>
                <p className="text-sm">{t('properties.manageFurnishedItems')}</p>
              </div>
            )}
          </div>
        )}

        {/* Technical Objects Section */}
        <div className="mt-8 bg-white shadow-lg rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('properties.technicalObjects', { count: technicalObjects.length })}
            </h2>
            <button
              onClick={() => navigate(`/properties/${id}/edit#technical-objects`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('properties.addTechnicalObjects')}
            </button>
          </div>
          
          <TechnicalObjectsList objects={technicalObjects} loading={loading} />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white shadow-lg rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('dashboard.quickActions')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => handleNav && handleNav('create-task', { propertyId: property.id, propertyName: property.name })}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="font-medium">Assign Task</span>
            </button>
            <button
              onClick={() => navigate('/properties')}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">{t('properties.backToProperties')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;