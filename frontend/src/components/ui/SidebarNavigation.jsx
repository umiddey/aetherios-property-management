import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import './SidebarNavigation.css';

const SidebarNavigation = ({ onNavigate, user, canManageLicenses }) => {
  const { t } = useLanguage();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentViewFromPath = location.pathname.slice(1) || 'dashboard';

  // Navigation structure based on user's hierarchy diagram
  const navigationItems = [
    {
      id: 'dashboard',
      label: t('navigation.dashboard'),
      icon: '📊',
      route: '',
      hasSubmenu: false
    },
    {
      id: 'properties',
      label: t('navigation.properties'),
      icon: '🏠',
      route: 'properties',
      hasSubmenu: true,
      submenu: [
        { id: 'properties-list', label: 'All Properties', route: 'properties' },
        { id: 'complexes', label: 'Complexes', route: 'properties', filter: { property_type: 'complex' } },
        { id: 'buildings', label: 'Buildings', route: 'properties', filter: { property_type: 'building' } },
        { id: 'units', label: 'Units', route: 'properties', filter: { property_type: 'unit', unit_type_in: ['apartment', 'office', 'house', 'commercial'] } },
        { id: 'technical-objects', label: 'Technical Objects', route: 'technical-objects' }
      ]
    },
    {
      id: 'accounts',
      label: t('navigation.accounts'),
      icon: '👥',
      route: 'accounts',
      hasSubmenu: true,
      submenu: [
        { id: 'tenants', label: 'Tenants', route: 'accounts', filter: { account_type: 'tenant' } },
        { id: 'creditors', label: 'Creditors', route: 'accounts', filter: { account_type: 'creditor' } }
      ]
    },
    {
      id: 'invoices',
      label: t('navigation.invoices'),
      icon: '💰',
      route: 'invoices',
      hasSubmenu: false
    },
    {
      id: 'service-requests',
      label: 'Service Requests',
      icon: '🔧',
      route: 'service-requests',
      hasSubmenu: true,
      submenu: [
        { id: 'damage-reports', label: 'Damage Reports', route: 'service-requests' },
        { id: 'requests', label: 'Requests', route: 'service-requests' },
        { id: 'request-contracts', label: 'Contracts', route: 'contracts' },
        { id: 'projects', label: 'Projects', route: 'service-requests' }
      ]
    },
    {
      id: 'tasks',
      label: t('navigation.tasks'),
      icon: '📋',
      route: 'tasks',
      hasSubmenu: false
    },
    {
      id: 'contracts',
      label: t('navigation.contracts'),
      icon: '📄',
      route: 'contracts',
      hasSubmenu: false
    }
  ];

  // Add conditional items
  if (canManageLicenses && canManageLicenses(user)) {
    navigationItems.push({
      id: 'license-management',
      label: 'License Management',
      icon: '🏛️',
      route: 'license-management',
      hasSubmenu: false
    });
  }

  if (user?.role === 'super_admin') {
    navigationItems.push({
      id: 'users',
      label: t('navigation.users'),
      icon: '👤',
      route: 'users',
      hasSubmenu: false
    });
  }

  const isActiveRoute = (route) => {
    // Handle active state logic similar to current Dashboard.jsx
    if (route === '' && currentViewFromPath === 'dashboard') return true;
    if (route === 'accounts' && (currentViewFromPath === 'accounts' || currentViewFromPath === 'tenants')) return true;
    return currentViewFromPath === route;
  };

  const handleItemClick = (item) => {
    onNavigate(item.route);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const handleSubmenuClick = (submenuItem) => {
    onNavigate(submenuItem.route, submenuItem.filter || {});
    setHoveredItem(null); // Close submenu after selection
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-lg"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        bg-gray-900 text-white shadow-lg flex flex-col h-screen transition-transform duration-300 ease-in-out z-50
        w-64
        ${isMobileMenuOpen 
          ? 'md:relative md:translate-x-0 fixed inset-y-0 left-0 translate-x-0' 
          : 'md:relative md:translate-x-0 fixed inset-y-0 left-0 -translate-x-full md:translate-x-0'
        }
      `}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Property ERP</h1>
            <p className="text-xs text-gray-400">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 mt-6 relative">
        {navigationItems.map((item) => (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => item.hasSubmenu && setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {/* Main Nav Item */}
            <button
              onClick={() => handleItemClick(item)}
              className={`
                w-full flex items-center px-6 py-3 text-left hover:bg-gray-800 transition-colors duration-150
                ${isActiveRoute(item.route) ? 'bg-blue-600 border-r-4 border-blue-400' : ''}
              `}
            >
              <span className="text-lg mr-3">{item.icon}</span>
              <span className="flex-1 text-sm">{item.label}</span>
              {item.hasSubmenu && (
                <svg 
                  className="w-4 h-4 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            {/* Floating Submenu with Bridge */}
            {item.hasSubmenu && hoveredItem === item.id && (
              <>
                {/* Invisible bridge to prevent gap issues */}
                <div 
                  className="absolute left-full top-0 w-2 h-full z-40"
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                />
                <div 
                  className="absolute left-64 top-0 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-48"
                  style={{ 
                    animation: 'slideIn 0.15s ease-out'
                  }}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {item.submenu.map((submenuItem, index) => (
                    <button
                      key={submenuItem.id}
                      onClick={() => handleSubmenuClick(submenuItem)}
                      className={`
                        w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 text-sm
                        ${index === 0 ? 'rounded-t-lg' : ''} 
                        ${index === item.submenu.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100'}
                      `}
                    >
                      {submenuItem.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-6 border-t border-gray-700">
        <div className="text-sm text-gray-400 hover:text-white cursor-pointer transition-colors">
          ⚙️ Settings
        </div>
        <div className="text-sm text-gray-400 hover:text-white cursor-pointer transition-colors mt-2">
          ❓ Help
        </div>
      </div>
      </div>
    </>
  );
};

export default SidebarNavigation;