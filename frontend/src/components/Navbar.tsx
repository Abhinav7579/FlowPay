import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X, CreditCard, ShoppingBag, Landmark, ShoppingCart, History, Receipt, AlertTriangle, LayoutDashboard, UserCheck, Package } from 'lucide-react';
import Button from './Button';


const Navbar: React.FC = () => {
  const { role, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const getDashboardLink = () => {
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to={getDashboardLink()} className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
          <span className="logo-icon">
            <CreditCard size={24} />
          </span>
          <span className="logo-text">FlowPay</span>
        </Link>

        {/* Desktop Navigation */}
        {isAuthenticated ? (
          <div className="navbar-desktop-menu">
            <div className="navbar-links">
              {role === 'ADMIN' && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`nav-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
                  >
                    <LayoutDashboard size={16} />
                    <span>Admin Dashboard</span>
                  </Link>
                  <Link
                    to="/admin/approvals"
                    className={`nav-link ${isActive('/admin/approvals') ? 'active' : ''}`}
                  >
                    <UserCheck size={16} />
                    <span>Merchant Approvals</span>
                  </Link>
                  <Link
                    to="/admin/fraud-alerts"
                    className={`nav-link ${isActive('/admin/fraud-alerts') ? 'active' : ''}`}
                  >
                    <AlertTriangle size={16} />
                    <span>Fraud Alerts</span>
                  </Link>
                  <Link
                    to="/admin/payouts"
                    className={`nav-link ${isActive('/admin/payouts') ? 'active' : ''}`}
                  >
                    <CreditCard size={16} />
                    <span>Payouts Manager</span>
                  </Link>
                  <Link
                    to="/admin/transactions"
                    className={`nav-link ${isActive('/admin/transactions') ? 'active' : ''}`}
                  >
                    <History size={16} />
                    <span>Transactions Monitor</span>
                  </Link>
                </>
              )}
              {role === 'VENDOR' && (
                <>
                  <Link
                    to="/vendor/dashboard"
                    className={`nav-link ${isActive('/vendor/dashboard') ? 'active' : ''}`}
                  >
                    <Landmark size={16} />
                    <span>Merchant Portal</span>
                  </Link>
                  <Link
                    to="/vendor/products"
                    className={`nav-link ${isActive('/vendor/products') ? 'active' : ''}`}
                  >
                    <Package size={16} />
                    <span>My Products</span>
                  </Link>
                </>
              )}
              {role === 'CUSTOMER' && (
                <>
                  <Link
                    to="/shop"
                    className={`nav-link ${isActive('/shop') ? 'active' : ''}`}
                  >
                    <ShoppingBag size={16} />
                    <span>Customer Shop</span>
                  </Link>
                  <Link
                    to="/customer/transactions"
                    className={`nav-link ${isActive('/customer/transactions') ? 'active' : ''}`}
                  >
                    <Receipt size={16} />
                    <span>My Purchases</span>
                  </Link>
                  <Link
                    to="/orders"
                    className={`nav-link ${isActive('/orders') ? 'active' : ''}`}
                  >
                    <History size={16} />
                    <span>Order History</span>
                  </Link>
                </>
              )}
            </div>

            <div className="navbar-user-actions">
              {role === 'CUSTOMER' && (
                <button className="nav-cart-btn" aria-label="Cart" title="Cart Placeholder">
                  <ShoppingCart size={18} />
                  <span className="cart-badge-dot"></span>
                </button>
              )}
              <span className="user-badge" data-role={role}>
                {role}
              </span>
              <Button
                variant="outline"
                size="sm"
                icon={<LogOut size={14} />}
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </div>
          </div>
        ) : (
          /* Unauthenticated/Guest desktop menu */
          <div className="navbar-desktop-menu">
            <div className="navbar-links">
              <button className="nav-cart-btn" aria-label="Cart" title="Cart Placeholder">
                <ShoppingCart size={18} />
              </button>
            </div>
            <div className="navbar-user-actions">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Toggle Button */}
        {isAuthenticated && (
          <button
            className="navbar-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Drawer */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="navbar-mobile-drawer">
          <div className="mobile-drawer-links">
            {role === 'ADMIN' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`mobile-nav-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard size={18} />
                  <span>Admin Dashboard</span>
                </Link>
                <Link
                  to="/admin/approvals"
                  className={`mobile-nav-link ${isActive('/admin/approvals') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserCheck size={18} />
                  <span>Merchant Approvals</span>
                </Link>
                <Link
                  to="/admin/fraud-alerts"
                  className={`mobile-nav-link ${isActive('/admin/fraud-alerts') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <AlertTriangle size={18} />
                  <span>Fraud Alerts</span>
                </Link>
                <Link
                  to="/admin/payouts"
                  className={`mobile-nav-link ${isActive('/admin/payouts') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <CreditCard size={18} />
                  <span>Payouts Manager</span>
                </Link>
                <Link
                  to="/admin/transactions"
                  className={`mobile-nav-link ${isActive('/admin/transactions') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <History size={18} />
                  <span>Transactions Monitor</span>
                </Link>
              </>
            )}
            {role === 'VENDOR' && (
              <>
                <Link
                  to="/vendor/dashboard"
                  className={`mobile-nav-link ${isActive('/vendor/dashboard') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Landmark size={18} />
                  <span>Merchant Portal</span>
                </Link>
                <Link
                  to="/vendor/products"
                  className={`mobile-nav-link ${isActive('/vendor/products') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Package size={18} />
                  <span>My Products</span>
                </Link>
              </>
            )}
            {role === 'CUSTOMER' && (
              <>
                <Link
                  to="/shop"
                  className={`mobile-nav-link ${isActive('/shop') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingBag size={18} />
                  <span>Customer Shop</span>
                </Link>
                <Link
                  to="/customer/transactions"
                  className={`mobile-nav-link ${isActive('/customer/transactions') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Receipt size={18} />
                  <span>My Purchases</span>
                </Link>
                <Link
                  to="/orders"
                  className={`mobile-nav-link ${isActive('/orders') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <History size={18} />
                  <span>Order History</span>
                </Link>
              </>
            )}

            <div className="mobile-drawer-footer">
              <div className="mobile-user-info">
                {role === 'CUSTOMER' && (
                  <button className="nav-cart-btn" aria-label="Cart">
                    <ShoppingCart size={20} />
                    <span className="cart-badge-dot"></span>
                  </button>
                )}
                <span className="user-badge" data-role={role}>
                  {role}
                </span>
              </div>
              <Button
                variant="danger"
                size="md"
                icon={<LogOut size={16} />}
                onClick={handleLogout}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
