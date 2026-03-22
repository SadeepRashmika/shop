import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Users from './pages/Users/Users';
import Inventory from './pages/Inventory/Inventory';
import Debtors from './pages/Debtors/Debtors';
import Sales from './pages/Sales/Sales';
import Reports from './pages/Reports/Reports';
import CustomerSearch from './pages/Customer/Search';
import CustomerOrders from './pages/Customer/Orders';
import Profile from './pages/Profile/Profile';
import Advertisements from './pages/Advertisements/Advertisements';

import './i18n/i18n';

function App() {
  return (
    <AuthProvider>
      <Router>
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
      </Router>
    </AuthProvider>
  );
}

export default App;
