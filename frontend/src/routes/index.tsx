import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import AdminDashboard from '../pages/AdminDashboard';
import AdminAnalyticsDashboard from '../pages/AdminAnalyticsDashboard';
import AdminTransactions from '../pages/AdminTransactions';
import AdminPayouts from '../pages/AdminPayouts';
import AdminFraudAlerts from '../pages/AdminFraudAlerts';
import VendorDashboard from '../pages/VendorDashboard';
import Shop from '../pages/Shop';
import Unauthorized from '../pages/Unauthorized';
import PaymentStatus from '../pages/PaymentStatus';
import OrderHistory from '../pages/OrderHistory';
import CustomerTransactions from '../pages/CustomerTransactions';

// Protected Route Guard
import ProtectedRoute from './ProtectedRoute';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, role } = useAuth();

  const getDashboardRedirect = () => {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'VENDOR':
        return '/vendor/dashboard';
      case 'CUSTOMER':
        return '/shop';
      default:
        return '/login';
    }
  };

  return (
    <Routes>
      {/* Root Path Handler */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={getDashboardRedirect()} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected Dashboards & Client Gateways */}
      <Route element={<DashboardLayout />}>
        {/* Admin Panel */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminAnalyticsDashboard />} />
          <Route path="/admin/approvals" element={<AdminDashboard />} />
          <Route path="/admin/payouts" element={<AdminPayouts />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/fraud-alerts" element={<AdminFraudAlerts />} />
        </Route>

        {/* Vendor/Merchant Portal */}
        <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
          <Route path="/vendor" element={<Navigate to="/vendor/dashboard" replace />} />
          <Route path="/vendor/dashboard" element={<VendorDashboard key="vendor-dashboard" />} />
          <Route path="/vendor/products" element={<VendorDashboard defaultTab="products" key="vendor-products" />} />
        </Route>

        {/* Customer Shop Front */}
        <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
          <Route path="/shop" element={<Shop />} />
          <Route path="/payment-status" element={<PaymentStatus />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/customer/transactions" element={<CustomerTransactions />} />
        </Route>

        {/* Unauthorized page */}
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Route>

      {/* Catch All Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
