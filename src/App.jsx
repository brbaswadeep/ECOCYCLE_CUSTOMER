import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { APILoader } from '@googlemaps/extended-component-library/react';
import Layout from './layouts/Layout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SmartScan from './pages/SmartScan';
import History from './pages/History';
import HistoryDetail from './pages/HistoryDetail';
import OrderDetails from './pages/OrderDetails';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Shop from './pages/Shop';
import ProtectedRoute from './components/ProtectedRoute';

import React, { useEffect } from 'react';

function App() {
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      // Check for Firestore "blocked by client" errors (often due to AdBlockers)
      if (event.reason && (
        event.reason.code === 'unavailable' ||
        event.reason.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
        event.reason.toString().includes('ERR_BLOCKED_BY_CLIENT')
      )) {
        // Prevent default console error if possible (though often not for network errors)
        // event.preventDefault(); 

        // Show user-friendly alert (can be replaced with a Toast)
        alert("Connection Issue Detected: It seems your browser or an extension (like an AdBlocker) is blocking access to our database. Please disable ad blockers for this site to continue.");
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <APILoader apiKey={GOOGLE_MAPS_API_KEY} solutionChannel="GMP_GE_mapsandplacesautocomplete_v2" />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/smart-scan"
              element={
                <ProtectedRoute>
                  <SmartScan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop"
              element={
                <ProtectedRoute>
                  <Shop />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history/:id"
              element={
                <ProtectedRoute>
                  <HistoryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:orderId"
              element={
                <ProtectedRoute>
                  <OrderDetails />
                </ProtectedRoute>
              }
            />
            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
