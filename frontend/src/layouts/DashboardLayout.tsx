import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const DashboardLayout: React.FC = () => {
  return (
    <div className="dashboard-layout">
      {/* Global Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="dashboard-content-main">
        <div className="dashboard-container">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>© 2026 FlowPay Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default DashboardLayout;
