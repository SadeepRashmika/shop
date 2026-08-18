import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Lazy Loaded Pages for Instant Initial Page Load
const Home = lazy(() => import('./pages/Home/Home'));
const Login = lazy(() => import('./pages/Login/Login'));
const Register = lazy(() => import('./pages/Register/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Users = lazy(() => import('./pages/Users/Users'));
const Inventory = lazy(() => import('./pages/Inventory/Inventory'));
const Debtors = lazy(() => import('./pages/Debtors/Debtors'));
const Sales = lazy(() => import('./pages/Sales/Sales'));
const Reports = lazy(() => import('./pages/Reports/Reports'));
const CustomerSearch = lazy(() => import('./pages/Customer/Search'));
const CustomerOrders = lazy(() => import('./pages/Customer/Orders'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const Advertisements = lazy(() => import('./pages/Advertisements/Advertisements'));
const CashManager = lazy(() => import('./pages/CashManager/CashManager'));
const HomeUse = lazy(() => import('./pages/HomeUse/HomeUse'));
const Reload = lazy(() => import('./pages/Reload/Reload'));
const Milling = lazy(() => import('./pages/Milling/Milling'));
const Settings = lazy(() => import('./pages/Settings/Settings'));

import './i18n/i18n';
import './services/timeService';

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-primary, #0f172a)', color: '#3b82f6', fontSize: '1.2rem', fontWeight: 700, gap: '10px' }}>
      <div style={{ width: '28px', height: '28px', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span>පූරණය වෙමින් පවතී...</span>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes — Dashboard Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />

              {/* Owner Routes */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ads"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <Advertisements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'cashier']}>
                    <Inventory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'cashier']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />

              {/* Cashier Routes */}
              <Route
                path="/items"
                element={
                  <ProtectedRoute allowedRoles={['cashier', 'owner']}>
                    <Inventory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute allowedRoles={['cashier', 'owner']}>
                    <Sales />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/debtors"
                element={
                  <ProtectedRoute allowedRoles={['cashier', 'owner']}>
                    <Debtors />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cash-manager"
                element={
                  <ProtectedRoute allowedRoles={['cashier', 'owner']}>
                    <CashManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/home-use"
                element={
                  <ProtectedRoute allowedRoles={['cashier', 'owner']}>
                    <HomeUse />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reload"
                element={
                  <ProtectedRoute allowedRoles={['cashier', 'owner']}>
                    <Reload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/milling"
                element={
                  <ProtectedRoute allowedRoles={['cashier', 'owner']}>
                    <Milling />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['cashier', 'owner']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Customer Routes */}
              <Route
                path="/search"
                element={
                  <ProtectedRoute allowedRoles={['customer', 'cashier', 'owner']}>
                    <CustomerSearch />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute allowedRoles={['customer', 'cashier', 'owner']}>
                    <CustomerOrders />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  </ThemeProvider>
);
}

export default App;
