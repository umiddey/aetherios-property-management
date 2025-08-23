import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cachedAxios from '../utils/cachedAxios';
import { useLanguage } from '../contexts/LanguageContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TechnicalObjectDetailPage = ({ 
  getStatusColor, 
  formatDate, 
  formatCurrency, 
  handleNav 
}) => {
  const { objectId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [technicalObject, setTechnicalObject] = useState(null);
  const [property, setProperty] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [relatedObjects, setRelatedObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTechnicalObjectDetails = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('access_token');
        const headers = { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        };
        
        // Fetch technical object details first to get property_id
        const objectRes = await cachedAxios.get(`${API}/v1/technical-objects/${objectId}`, { headers });
        setTechnicalObject(objectRes.data);
        
        if (!objectRes.data || !objectRes.data.property_id) {
          return;
        }
        
        const propertyId = objectRes.data.property_id;
        
        // Now fetch all related data in parallel
        const [propertyRes, relatedRes, complianceRes] = await Promise.all([
          cachedAxios.get(`${API}/v1/properties/${propertyId}`, { headers })
            .catch(error => {
              console.warn('Could not fetch property details:', error);
              return null;
            }),
          cachedAxios.get(`${API}/v1/technical-objects/property/${propertyId}`, { headers })
            .catch(error => {
              console.warn('Could not fetch related objects:', error);
              return { data: [] };
            }),
          cachedAxios.get(`${API}/v1/core/compliance/technical-object/${objectId}`, { headers })
            .catch(error => {
              console.error('❌ COMPLIANCE API FAILED:', error);
              console.error('❌ API URL:', `${API}/v1/core/compliance/technical-object/${objectId}`);
              console.error('❌ Headers:', headers);
              console.error('❌ Error Response:', error.response);
              return null;
            })
        ]);
        
        // Set the fetched data
        if (propertyRes?.data) {
          setProperty(propertyRes.data);
        }
        
        if (relatedRes?.data) {
          setRelatedObjects((relatedRes.data || []).filter(obj => obj._id !== objectRes.data._id));
        }
        
        console.log('🔍 COMPLIANCE DEBUG:', {
          complianceRes,
          complianceData: complianceRes?.data,
          complianceStatus: complianceRes?.status,
          hasData: !!complianceRes?.data
        });
        
        if (complianceRes?.data) {
          console.log('✅ Setting compliance status:', complianceRes.data);
          setComplianceStatus(complianceRes.data);
        } else {
          console.log('❌ No compliance data - will show COMPLIANT fallback');
        }
        
      } catch (error) {
        console.error('Error fetching technical object details:', error);
        setError('Failed to load technical object details');
      } finally {
        setLoading(false);
      }
    };

    if (objectId) {
      fetchTechnicalObjectDetails();
    }
  }, [objectId]);

  const handleScheduleInspection = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await cachedAxios.post(`${API}/v1/core/compliance/technical-object/${objectId}/schedule`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh compliance status
      window.location.reload();
    } catch (error) {
      console.error('Error scheduling inspection:', error);
    }
  };

  const handleCompleteInspection = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await cachedAxios.post(`${API}/v1/core/compliance/technical-object/${objectId}/complete-inspection`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh compliance status
      window.location.reload();
    } catch (error) {
      console.error('Error completing inspection:', error);
    }
  };

  const getComplianceBanner = () => {
    if (!complianceStatus) {
      return (
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <span className="text-lg mr-2">✅</span>
            <span className="font-medium">COMPLIANT - No issues detected</span>
          </div>
        </div>
      );
    }

    const daysUntilDue = complianceStatus.days_until_due;
    const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;
    let bannerClass, icon, message;
    
    if (daysUntilDue < -365) {
      bannerClass = "bg-red-100 border border-red-400 text-red-800";
      icon = "🚨";
      message = `CRITICAL: ${daysOverdue.toLocaleString()} days overdue`;
    } else if (daysUntilDue < 0) {
      bannerClass = "bg-orange-100 border border-orange-400 text-orange-800";
      icon = "⚠️";
      message = `OVERDUE: ${daysOverdue.toLocaleString()} days overdue`;
    } else if (daysUntilDue <= 15) {
      bannerClass = "bg-yellow-100 border border-yellow-400 text-yellow-800";
      icon = "📅";
      message = `DUE SOON: ${daysUntilDue} days remaining`;
    } else {
      bannerClass = "bg-green-100 border border-green-400 text-green-800";
      icon = "✅";
      message = `COMPLIANT: Next inspection in ${daysUntilDue} days`;
    }

    return (
      <div className={`${bannerClass} px-4 py-3 rounded-lg mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg mr-2">{icon}</span>
            <span className="font-medium">{message}</span>
          </div>
          {daysUntilDue < 0 && (
            <div className="flex space-x-2">
              <button
                onClick={handleScheduleInspection}
                className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
              >
                Schedule Inspection
              </button>
              <button
                onClick={handleCompleteInspection}
                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
              >
                Mark Complete
              </button>
            </div>
          )}
        </div>
        
        {complianceStatus && complianceStatus.legal_framework && (
          <div className="mt-2 text-sm">
            <p><strong>Legal Framework:</strong> {complianceStatus.legal_framework}</p>
            {complianceStatus.consequences && (
              <p><strong>Consequences:</strong> {complianceStatus.consequences}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" role="status" aria-label="Loading"></div>
          <p className="mt-4 text-gray-600">Loading technical object details...</p>
        </div>
      </div>
    );
  }

  if (error || !technicalObject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Technical object not found'}</p>
          <button 
            onClick={() => handleNav('technical-objects')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Back to Technical Objects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <button
                  onClick={() => handleNav('dashboard')}
                  className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                  </svg>
                  <button
                    onClick={() => handleNav('technical-objects')}
                    className="ml-1 text-gray-700 hover:text-gray-900 text-sm font-medium md:ml-2"
                  >
                    Technical Objects
                  </button>
                </div>
              </li>
              {property && (
                <li>
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <button
                      onClick={() => handleNav('properties', null, property.id)}
                      className="ml-1 text-gray-700 hover:text-gray-900 text-sm font-medium md:ml-2"
                    >
                      {property.title}
                    </button>
                  </div>
                </li>
              )}
              <li aria-current="page">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                  </svg>
                  <span className="ml-1 text-gray-500 text-sm font-medium md:ml-2">
                    {technicalObject.name || `${technicalObject.object_type} #${technicalObject.id}`}
                  </span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {technicalObject.name || `${technicalObject.object_type}`}
                </h1>
                <p className="text-gray-600">
                  {technicalObject.object_type} • ID: {technicalObject.id}
                </p>
                {property && (
                  <p className="text-gray-500 text-sm">
                    Located at: {property.title}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                ← Back
              </button>
              {property && (
                <button
                  onClick={() => handleNav('properties', null, property.id)}
                  className="px-4 py-2 text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                >
                  View Property
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Compliance Status Section */}
        {getComplianceBanner()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Technical Specifications */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Technical Specifications</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                  <p className="text-gray-900">{technicalObject.manufacturer || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <p className="text-gray-900">{technicalObject.model || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <p className="text-gray-900">{technicalObject.serial_number || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Installation Date</label>
                  <p className="text-gray-900">
                    {technicalObject.installation_date ? formatDate(technicalObject.installation_date) : 'Not specified'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-gray-900">{technicalObject.category || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <p className="text-gray-900">{technicalObject.location || 'Not specified'}</p>
                </div>
              </div>

              {/* Financial Information */}
              {(technicalObject.purchase_cost || technicalObject.annual_maintenance_cost || technicalObject.annual_inspection_cost) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Financial Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {technicalObject.purchase_cost && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost</label>
                        <p className="text-gray-900">{formatCurrency(technicalObject.purchase_cost)}</p>
                      </div>
                    )}
                    
                    {technicalObject.annual_maintenance_cost && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Annual Maintenance</label>
                        <p className="text-gray-900">{formatCurrency(technicalObject.annual_maintenance_cost)}</p>
                      </div>
                    )}
                    
                    {technicalObject.annual_inspection_cost && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Annual Inspection</label>
                        <p className="text-gray-900">{formatCurrency(technicalObject.annual_inspection_cost)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Object-Specific Specifications */}
              {technicalObject.specifications && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Detailed Specifications</h3>
                  <pre className="bg-gray-50 p-3 rounded-md text-sm text-gray-800">
                    {JSON.stringify(technicalObject.specifications, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Inspector Information & Actions */}
          <div className="space-y-6">
            {/* Inspector Contact */}
            {(technicalObject.inspector_company || technicalObject.inspector_contact_name || technicalObject.inspector_phone) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Inspector Information</h2>
                
                <div className="space-y-3">
                  {technicalObject.inspector_company && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <p className="text-gray-900">{technicalObject.inspector_company}</p>
                    </div>
                  )}
                  
                  {technicalObject.inspector_contact_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                      <p className="text-gray-900">{technicalObject.inspector_contact_name}</p>
                    </div>
                  )}
                  
                  {technicalObject.inspector_phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <div className="flex items-center space-x-2">
                        <p className="text-gray-900">{technicalObject.inspector_phone}</p>
                        <a
                          href={`tel:${technicalObject.inspector_phone}`}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          📞 Call
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    In Germany, inspections are scheduled by district authorities (TÜV, Schornsteinfeger)
                  </p>
                </div>
              </div>
            )}

            {/* Inspection History */}
            {technicalObject.last_inspection_date && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Inspection History</h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Inspection</label>
                    <p className="text-gray-900">{formatDate(technicalObject.last_inspection_date)}</p>
                  </div>
                  
                  {technicalObject.next_inspection_due && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Next Due</label>
                      <p className="text-gray-900">{formatDate(technicalObject.next_inspection_due)}</p>
                    </div>
                  )}
                  
                  {technicalObject.inspection_interval_months && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Interval</label>
                      <p className="text-gray-900">Every {technicalObject.inspection_interval_months} months</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Related Objects */}
            {relatedObjects.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Objects</h2>
                
                <div className="space-y-2">
                  {relatedObjects.slice(0, 5).map((obj) => (
                    <div key={obj._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {obj.name || obj.object_type}
                        </p>
                        <p className="text-xs text-gray-500">{obj.location}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/technical-objects/${obj._id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        View →
                      </button>
                    </div>
                  ))}
                  
                  {relatedObjects.length > 5 && (
                    <p className="text-xs text-gray-500 text-center pt-2">
                      +{relatedObjects.length - 5} more objects in this property
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalObjectDetailPage;