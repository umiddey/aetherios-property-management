import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';
import Button from './ui/Button';
import { Card, CardHeader, CardBody } from './ui/Card';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const PortalDashboard = () => {
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const token = secureStorage.getPortalToken();
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch service requests
      const serviceRequestsResponse = await axios.get(
        `${BACKEND_URL}/api/v1/service-requests/portal/my-requests?limit=5`,
        { headers }
      );
      setServiceRequests(serviceRequestsResponse.data || []);
      
      // Fetch contracts (placeholder for now)
      // const contractsResponse = await axios.get(`${BACKEND_URL}/api/v1/portal/contracts`, { headers });
      // setContracts(contractsResponse.data || []);
      
      // Fetch invoices (placeholder for now)  
      // const invoicesResponse = await axios.get(`${BACKEND_URL}/api/v1/portal/invoices`, { headers });
      // setInvoices(invoicesResponse.data || []);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Don't fail the entire dashboard if data fetch fails
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    // Check authentication with secure storage
    if (!secureStorage.isAuthenticated()) {
      navigate('/portal/login');
      return;
    }
    
    const userData = secureStorage.getPortalUser();
    if (!userData) {
      navigate('/portal/login');
      return;
    }
    
    setUser(userData);
    setLoading(false);
    
    // Fetch dashboard data
    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    secureStorage.clearPortalAuth();
    navigate('/portal/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-9 h-9 bg-brand-600 rounded-md flex items-center justify-center mr-3 shadow-card">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m5 0v-6a2 2 0 00-2-2H8a2 2 0 00-2 2v6" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Tenant Portal</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.first_name} {user?.last_name}
              </span>
              <Button variant="subtle" size="sm" onClick={handleLogout}>Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="portal-dashboard">
        {/* Welcome Section */}
        <div className="bg-blue-600 rounded-lg text-white p-8 shadow-card mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user?.first_name}!
          </h2>
          <p className="text-blue-100">
            Here's what's happening with your account today.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* My Contracts Card */}
          <Card>
            <CardHeader title="My Contracts" subtitle="View rental agreements" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} />
            <CardBody>
              <div className="text-2xl font-bold text-gray-900 mb-2">1 Active</div>
              <p className="text-sm text-gray-600">Current rental contract</p>
            </CardBody>
          </Card>

          {/* My Invoices Card */}
          <Card>
            <CardHeader title="My Invoices" subtitle="Payment history" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>} />
            <CardBody>
              <div className="text-2xl font-bold text-gray-900 mb-2">2 Recent</div>
              <p className="text-sm text-gray-600">1 paid, 1 pending</p>
            </CardBody>
          </Card>

          {/* Maintenance Requests Card */}
          <Card data-testid="maintenance-card">
            <CardHeader title="Maintenance" subtitle="Service requests" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
            {dashboardLoading ? (
              <CardBody>
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading requests...</p>
                </div>
              </CardBody>
            ) : (
              <CardBody>
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {serviceRequests.length} {serviceRequests.length === 1 ? 'Request' : 'Requests'}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {serviceRequests.filter(r => r.status === 'submitted').length} pending,{' '}
                  {serviceRequests.filter(r => r.status === 'in_progress').length} in progress
                </p>
                {serviceRequests.length > 0 && (
                  <div className="mb-4 space-y-2 max-h-20 overflow-y-auto">
                    {serviceRequests.slice(0, 2).map((request) => (
                      <div key={request.id} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                        <span className="font-medium truncate">{request.title}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <Button className="w-full" variant="primary" onClick={() => navigate('/portal/service-request/new')}>Submit New Request</Button>
                  {serviceRequests.length > 0 && (
                    <Button className="w-full" variant="secondary" onClick={() => navigate('/portal/service-requests')}>View All Requests</Button>
                  )}
                </div>
              </CardBody>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader title="Quick Actions" />
          <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center p-4 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">View Contract</span>
            </button>
            
            <button className="flex items-center p-4 border border-gray-200 rounded-md hover:border-green-300 hover:bg-green-50 transition-colors">
              <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Pay Rent</span>
            </button>
            
            <button 
              onClick={() => navigate('/portal/service-request/new')}
              className="flex items-center p-4 border border-gray-200 rounded-md hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.5 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Report Issue</span>
            </button>
            
            <button className="flex items-center p-4 border border-gray-200 rounded-md hover:border-orange-300 hover:bg-orange-50 transition-colors">
              <svg className="w-6 h-6 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Get Help</span>
            </button>
          </div>
          </CardBody>
        </Card>

        {/* Development Notice */}
        <div className="mt-8 bg-brand-50 border border-brand-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-brand-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700">
              <strong>Portal MVP:</strong> This is a basic version of the tenant portal. More features like contract viewing, payment processing, and maintenance requests will be added soon.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PortalDashboard;