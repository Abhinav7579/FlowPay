import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import Button from '../components/Button';
import { Shield, Users, Landmark, FileCheck, ArrowRight, UserCheck } from 'lucide-react';
import type { Vendor } from '../types';

const AdminDashboard: React.FC = () => {
  const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const { success, error } = useToast();

  const fetchPendingVendors = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/user/admin/pending-vendors');
      if (response.data.success) {
        setPendingVendors(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch pending vendors', err);
      error(err.response?.data?.message || 'Error loading pending vendors list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingVendors();
  }, []);

  const handleApproveVendor = async (vendorId: string) => {
    setApprovingId(vendorId);
    try {
      const response = await apiClient.post(`/user/admin/approve-vendor/${vendorId}`);
      if (response.data.success) {
        success('Vendor approved successfully!');
        // Update local list
        setPendingVendors((prev) => prev.filter((v) => v.id !== vendorId));
      }
    } catch (err: any) {
      console.error('Failed to approve vendor', err);
      error(err.response?.data?.message || 'Error approving vendor.');
    } finally {
      setApprovingId(null);
    }
  };

  if (isLoading) {
    return <Loader message="Loading administrative console..." />;
  }

  return (
    <div className="admin-dashboard animate-fade-in">
      {/* Header section */}
      <div className="dashboard-header-block">
        <div>
          <h1 className="page-heading">Platform Administration</h1>
          <p className="page-subheading">Oversee system activity, onboarded merchants, and vendor approvals.</p>
        </div>
        <div className="admin-status-badge">
          <Shield size={16} />
          <span>System Active</span>
        </div>
      </div>

      {/* Analytics Card deck */}
      <div className="dashboard-stats-grid">
        <div className="stats-card">
          <div className="stats-card-icon bg-purple">
            <Users size={24} />
          </div>
          <div className="stats-card-data">
            <span className="stats-value">{pendingVendors.length}</span>
            <span className="stats-label">Awaiting Approvals</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon bg-cyan">
            <Landmark size={24} />
          </div>
          <div className="stats-card-data">
            <span className="stats-value">12</span>
            <span className="stats-label">Active Merchants</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon bg-emerald">
            <FileCheck size={24} />
          </div>
          <div className="stats-card-data">
            <span className="stats-value">98.4%</span>
            <span className="stats-label">Automated Audits</span>
          </div>
        </div>
      </div>

      {/* Section body */}
      <div className="content-section">
        <h2 className="section-title">Pending Merchant Approvals</h2>
        
        {pendingVendors.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon">
              <UserCheck size={48} />
            </div>
            <h3>All Clear!</h3>
            <p>There are no pending vendor registration requests to audit at this time.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Bank Account</th>
                  <th>IFSC Code</th>
                  <th>Registered On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingVendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <div className="business-name-cell">
                        <span className="business-avatar">
                          {vendor.businessName.substring(0, 2).toUpperCase()}
                        </span>
                        <span>{vendor.businessName}</span>
                      </div>
                    </td>
                    <td>
                      <code className="code-font">{vendor.bankAccount}</code>
                    </td>
                    <td>
                      <code className="code-font">{vendor.ifscCode}</code>
                    </td>
                    <td>
                      {new Date(vendor.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={approvingId === vendor.id}
                        onClick={() => handleApproveVendor(vendor.id)}
                        icon={<ArrowRight size={14} />}
                      >
                        Approve Merchant
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
