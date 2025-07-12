// src/App.js
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Dashboard from './components/Dashboard';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n'; // Create i18n.js for setup

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </Router>
    </I18nextProvider>
  );
}

export default App;