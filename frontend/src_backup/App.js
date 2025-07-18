// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Dashboard from './components/Dashboard';
import LoginForm from './components/LoginForm'; // Adjust path if LoginForm is in a different folder
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n'; // Create i18n.js for setup if not already done

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/*" element={<Dashboard />} />
          </Routes>
        </AuthProvider>
      </Router>
    </I18nextProvider>
  );
}

export default App;