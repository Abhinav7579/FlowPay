import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CreditCard } from 'lucide-react';
import Loader from '../components/Loader';

const AuthLayout: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  // If already logged in, redirect to respective dashboard
  if (isLoading) {
    return <Loader fullPage message="Authenticating session..." />;
  }

  if (isAuthenticated && role) {
    const dashboardRoutes: Record<string, string> = {
      ADMIN: '/admin',
      VENDOR: '/vendor/dashboard',
      CUSTOMER: '/shop',
    };
    return <Navigate to={dashboardRoutes[role] || '/login'} replace />;
  }

  return (
    <div className="auth-layout">
      {/* Dynamic Background Glowing Orbs */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      <div className="auth-container">
        <div className="auth-card-wrapper">
          {/* Brand Presentation */}
          <div className="auth-header">
            <div className="auth-logo">
              <CreditCard size={32} />
            </div>
            <h1 className="auth-title">FlowPay</h1>
            <p className="auth-subtitle">Seamless payouts, billing, and checkout systems.</p>
          </div>

          {/* Form Card Content */}
          <div className="auth-card">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
