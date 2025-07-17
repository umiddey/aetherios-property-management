import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cachedAxios from '../utils/cachedAxios';
import { useLanguage } from '../contexts/LanguageContext';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        const [propertyRes, agreementsRes, invoicesRes] = await Promise.all([
          cachedAxios.get(`${API}/v1/properties/${id}`),
          cachedAxios.get(`${API}/v1/rental-agreements?property_id=${id}`),
          cachedAxios.get(`${API}/v1/invoices?property_id=${id}`)
        ]);
        
        setProperty(propertyRes.data);
        setAgreements(agreementsRes.data);
        setInvoices(invoicesRes.data);
      } catch (error) {
        console.error('Error fetching property details:', error);
        setError('Failed to load property details');
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
          <p className="text-red-600">{error || 'Property not found'}</p>
          <button 
            onClick={() => navigate('/properties')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/properties')}
            className="mb-4 text-blue-500 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Properties
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
          <p className="text-lg text-gray-600">Property Details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Property Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Information</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Type:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPropertyTypeColor(property.property_type)}`}>
                  {property.property_type}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(property.status)}`}>
                  {property.status}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Address:</span>
                <span className="text-gray-900 text-right">
                  {property.street} {property.house_nr}<br/>
                  {property.floor && `Floor ${property.floor}, `}
                  {property.postcode} {property.city}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Surface Area:</span>
                <span className="text-gray-900">{property.surface_area} m²</span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Rooms:</span>
                <span className="text-gray-900">{property.number_of_rooms}</span>
              </div>
              
              {property.num_toilets && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Toilets:</span>
                  <span className="text-gray-900">{property.num_toilets}</span>
                </div>
              )}
              
              {property.rent_per_sqm && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Rent per m²:</span>
                  <span className="text-gray-900">{formatCurrency(property.rent_per_sqm)}</span>
                </div>
              )}
              
              {property.cold_rent && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Cold Rent:</span>
                  <span className="text-gray-900">{formatCurrency(property.cold_rent)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Created:</span>
                <span className="text-gray-900">{formatDate(property.created_at)}</span>
              </div>
              
              {property.description && (
                <div>
                  <span className="font-medium text-gray-700 block mb-2">Description:</span>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{property.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Owner Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Owner Information</h2>
            
            <div className="space-y-4">
              {property.owner_name && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="text-gray-900">{property.owner_name}</span>
                </div>
              )}
              
              {property.owner_email && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Email:</span>
                  <a href={`mailto:${property.owner_email}`} className="text-blue-600 hover:text-blue-800">
                    {property.owner_email}
                  </a>
                </div>
              )}
              
              {property.owner_phone && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Phone:</span>
                  <a href={`tel:${property.owner_phone}`} className="text-blue-600 hover:text-blue-800">
                    {property.owner_phone}
                  </a>
                </div>
              )}
              
              {!property.owner_name && !property.owner_email && !property.owner_phone && (
                <p className="text-gray-500 italic">No owner information available</p>
              )}
            </div>
          </div>
        </div>

        {/* Rental Agreements */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Rental Agreements</h2>
          
          {agreements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deposit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agreements.map(agreement => (
                    <tr key={agreement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getTenantName(agreement.tenant_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(agreement.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agreement.end_date ? formatDate(agreement.end_date) : 'Ongoing'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(agreement.monthly_rent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(agreement.deposit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No rental agreements found for this property</p>
          )}
        </div>

        {/* Invoices */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoices</h2>
          
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.due_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No invoices found for this property</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex space-x-4">
          <button
            onClick={() => handleNav && handleNav('create-task', { propertyId: property.id, propertyName: property.name })}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Assign Task
          </button>
          <button
            onClick={() => navigate('/properties')}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Back to Properties
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;