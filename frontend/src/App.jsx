/*
 * ==================================================================================
 * APP.JSX - THE ROOT COMPONENT AND APPLICATION ARCHITECTURE SETUP
 * ==================================================================================
 * 
 * This is the root component of our React application. It sets up the foundational
 * architecture using the "Provider Pattern" to make global data available throughout
 * the entire application.
 * 
 * ARCHITECTURE PATTERN: Provider Wrapper Pattern
 * - Multiple context providers wrapped around each other
 * - Each provider gives all child components access to specific global data
 * - Like Russian nesting dolls - each layer adds functionality
 * 
 * PROVIDER HIERARCHY (outer to inner):
 * ErrorBoundary → LanguageProvider → Router → AuthProvider → Routes
 * 
 * WHY THIS STRUCTURE?
 * - ErrorBoundary: Catches any JavaScript errors in the entire app
 * - LanguageProvider: Makes translation functions available everywhere
 * - Router: Enables URL-based navigation (different "pages")
 * - AuthProvider: Makes user authentication state available everywhere
 * - Routes: Defines which component shows for each URL
 */

// ==================================================================================
// IMPORTS - External libraries and our custom components
// ==================================================================================

// Import React - needed for all React components
import React from 'react';

// Import routing components from react-router-dom
// These enable single-page application (SPA) navigation
import { 
  BrowserRouter as Router,  // Enables browser-based routing (URL changes)
  Route,                    // Defines a single route (URL → Component mapping)
  Routes                    // Container for all Route definitions
} from 'react-router-dom';

// Import our custom context providers
// These are "wrappers" that provide global data to all child components
import { AuthProvider } from './AuthContext';              // Authentication state
import { LanguageProvider } from './contexts/LanguageContext'; // Translation system

// Import our main application components
import Dashboard from './components/Dashboard';             // Main app interface (after login)
import LoginForm from './components/LoginForm';             // Login page
import ErrorBoundary from './components/ErrorBoundary';     // Error handling wrapper

// Import portal components
import PortalLogin from './components/PortalLogin';         // Portal login page
import PortalDashboard from './components/PortalDashboard'; // Portal dashboard
import PortalInvitation from './components/PortalInvitation'; // Portal invitation activation
import ServiceRequestForm from './components/portal/ServiceRequestForm'; // Service request form
import ServiceRequestsList from './components/portal/ServiceRequestsList'; // Service request list

// ==================================================================================
// APP COMPONENT - The root of our entire application
// ==================================================================================

function App() {
  // The return statement defines what this component renders
  return (

    <ErrorBoundary>
      <LanguageProvider>
        <Router>
          <AuthProvider>
            <Routes>
              {/* Main ERP System Routes */}
              <Route path="/login" element={<LoginForm />} />
              <Route path="/*" element={<Dashboard />} />
              
              {/* Customer Portal Routes */}
              <Route path="/portal/login" element={<PortalLogin />} />
              <Route path="/portal/dashboard" element={<PortalDashboard />} />
              <Route path="/portal/invite/:inviteCode" element={<PortalInvitation />} />
              <Route path="/portal/service-request/new" element={<ServiceRequestForm />} />
              <Route path="/portal/service-requests" element={<ServiceRequestsList />} />
            </Routes>
          </AuthProvider>
        </Router>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

/*
 * EXPORT DEFAULT:
 * - Makes this component available for import in other files
 * - "default" means it's the main export from this file
 * - Other files can import it with: import App from './App'
 */
export default App;

/*
 * ==================================================================================
 * DATA FLOW EXPLANATION
 * ==================================================================================
 * 
 * 1. USER VISITS WEBSITE:
 *    Browser loads index.html → loads index.jsx → renders <App />
 * 
 * 2. PROVIDER SETUP:
 *    ErrorBoundary wraps everything → LanguageProvider loads translations →
 *    Router enables URL handling → AuthProvider checks for saved login token
 * 
 * 3. ROUTING DECISION:
 *    Routes component looks at current URL:
 *    - If URL is "/login" → show LoginForm
 *    - If URL is anything else → show Dashboard
 * 
 * 4. AUTHENTICATION CHECK:
 *    Dashboard component checks AuthProvider:
 *    - If user is logged in → show main app interface
 *    - If user is NOT logged in → redirect to "/login"
 * 
 * 5. USER INTERACTION:
 *    - User logs in → AuthProvider updates → Dashboard shows
 *    - User navigates → Router updates URL → appropriate component shows
 *    - User changes language → LanguageProvider updates → all text re-renders
 *    - Error occurs → ErrorBoundary catches → shows error message instead of crash
 * 
 * ==================================================================================
 * KEY REACT CONCEPTS DEMONSTRATED
 * ==================================================================================
 * 
 * 1. COMPONENT COMPOSITION:
 *    Building complex UIs by combining simpler components
 * 
 * 2. CONTEXT PATTERN:
 *    Sharing data between components without "prop drilling"
 *    (passing props down through many component levels)
 * 
 * 3. SINGLE PAGE APPLICATION (SPA):
 *    Different URLs showing different content without page reloads
 * 
 * 4. SEPARATION OF CONCERNS:
 *    - App.jsx: Application structure and providers
 *    - AuthContext: Authentication logic
 *    - LanguageContext: Translation logic
 *    - Components: UI and user interaction
 * 
 * 5. DECLARATIVE PROGRAMMING:
 *    We describe WHAT we want (component structure)
 *    React figures out HOW to make it happen (DOM manipulation)
 */