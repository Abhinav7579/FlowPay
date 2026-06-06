import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import Button from '../components/Button';
import Input from '../components/Input';
import { 
  Receipt, 
  Search, 
  Calendar, 
  Filter, 
  X, 
  Eye, 
  RefreshCw,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type { Transaction, TransactionStatus } from '../types';

interface CustomerStats {
  totalOrders: number;
  totalAmountSpent: number;
  successfulPayments: number;
  failedPayments: number;
}

const CustomerTransactions: React.FC = () => {
  // All transactions retrieved from backend
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');

  const { success, error } = useToast();

  // Fetch customer's transactions history from /customer/transactions/my
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/customer/transactions/my');
      if (response.data.success) {
        setAllTransactions(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions history', err);
      error(err.response?.data?.message || 'Error loading transaction history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Compute stats client-side in-memory
  const computedStats: CustomerStats = React.useMemo(() => {
    const totalOrders = allTransactions.length;
    const successfulPayments = allTransactions.filter(t => t.status === 'SUCCESS').length;
    const failedPayments = allTransactions.filter(t => t.status === 'FAILED').length;
    const totalAmountSpent = allTransactions
      .filter(t => t.status === 'SUCCESS')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    return {
      totalOrders,
      totalAmountSpent,
      successfulPayments,
      failedPayments
    };
  }, [allTransactions]);

  // Filter transactions client-side
  const filteredTransactions = React.useMemo(() => {
    return allTransactions.filter(txn => {
      // 1. Status Filter
      if (statusFilter && txn.status !== statusFilter) {
        return false;
      }
      
      // 2. Product Name search
      if (productSearch) {
        const name = txn.product?.name || '';
        if (!name.toLowerCase().includes(productSearch.toLowerCase())) {
          return false;
        }
      }

      // 3. Date range filter
      if (startDate) {
        const start = new Date(startDate);
        const txnDate = new Date(txn.createdAt);
        if (txnDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const txnDate = new Date(txn.createdAt);
        if (txnDate > end) return false;
      }

      return true;
    });
  }, [allTransactions, statusFilter, productSearch, startDate, endDate]);

  const handleResetFilters = () => {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setProductSearch('');
    success('Filters reset successfully.');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="order-badge success">Success</span>;
      case 'FAILED':
        return <span className="order-badge failed">Failed</span>;
      case 'PENDING':
        return <span className="order-badge pending">Pending</span>;
      case 'REFUNDED':
        return <span className="order-badge refunded">Refunded</span>;
      case 'FLAGGED':
        return <span className="order-badge failed">Flagged</span>;
      default:
        return <span className="order-badge pending">{status}</span>;
    }
  };

  return (
    <div className="customer-transactions-page animate-fade-in">
      {/* Header section */}
      <div className="dashboard-header-block">
        <div>
          <h1 className="page-heading">My Purchases</h1>
          <p className="page-subheading">View your purchase receipts, payment summaries, and transaction records.</p>
        </div>
        <div className="flex-center" style={{ gap: '12px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchTransactions();
              success('Dashboard updated.');
            }}
            icon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary stats deck (computed client-side) */}
      {!isLoading && (
        <div className="dashboard-stats-grid">
          <div className="stats-card">
            <div className="stats-card-icon bg-purple" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
              <ShoppingBag size={24} />
            </div>
            <div className="stats-card-data">
              <span className="stats-value">{computedStats.totalOrders}</span>
              <span className="stats-label">Total Purchases</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-card-icon bg-cyan" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
              <CreditCard size={24} />
            </div>
            <div className="stats-card-data">
              <span className="stats-value">{formatCurrency(computedStats.totalAmountSpent)}</span>
              <span className="stats-label">Total Amount Spent</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-card-icon bg-emerald" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div className="stats-card-data">
              <span className="stats-value">{computedStats.successfulPayments}</span>
              <span className="stats-label">Successful Payments</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-card-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--color-error)' }}>
              <XCircle size={24} />
            </div>
            <div className="stats-card-data">
              <span className="stats-value">{computedStats.failedPayments}</span>
              <span className="stats-label">Failed Payments</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters panels */}
      <div className="content-section mb-4 card-layout" style={{ background: 'var(--bg-surface)', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontSize: '1rem', fontWeight: 600 }}>
          <Filter size={16} /> Filter Purchases
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {/* Product Search */}
          <Input 
            label="Product Name"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search items..."
            icon={<Search size={14} />}
          />

          {/* Status select */}
          <Input 
            label="Payment Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'SUCCESS', label: 'Success' },
              { value: 'FAILED', label: 'Failed' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'REFUNDED', label: 'Refunded' },
            ]}
          />

          {/* Start Date */}
          <Input 
            label="Purchased From"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            icon={<Calendar size={14} />}
          />

          {/* End Date */}
          <Input 
            label="Purchased To"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            icon={<Calendar size={14} />}
          />

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button 
              variant="outline" 
              onClick={handleResetFilters} 
              className="w-full"
              style={{ height: '45px' }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Main transactions logs lists */}
      <div className="content-section card-layout">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <Loader message="Gathering purchase records..." />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon">
              <Receipt size={48} />
            </div>
            <h3>No Purchases Found</h3>
            <p>You don't have any purchase records matching the filters. Explore the shop to get premium products!</p>
            <Button variant="outline" onClick={handleResetFilters} style={{ marginTop: '1rem' }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Order ID</th>
                  <th>Merchant Name</th>
                  <th>Amount Paid</th>
                  <th>Status</th>
                  <th>Date Purchased</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((txn) => (
                  <tr 
                    key={txn.id} 
                    onClick={() => setSelectedTxn(txn)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="order-product-cell">
                        {/* Fallback to premium static product cover since image isn't selected in backend response */}
                        <img 
                          src="https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=600&auto=format&fit=crop" 
                          alt={txn.product?.name || 'Product'} 
                          className="order-product-image"
                        />
                        <div className="order-product-info">
                          <span className="order-product-name">{txn.product?.name || 'FlowPay Item'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="code-font" style={{ fontSize: '0.8rem' }}>
                        {txn.id.substring(0, 8)}...
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{txn.vendor?.businessName || 'FlowPay Merchant'}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{formatCurrency(txn.totalAmount)}</span>
                    </td>
                    <td>
                      {getStatusBadge(txn.status)}
                    </td>
                    <td>
                      <span className="text-muted-class" style={{ fontSize: '0.85rem' }}>
                        {new Date(txn.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                    <td>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTxn(txn);
                        }}
                        icon={<Eye size={12} />}
                        style={{ padding: '4px 8px' }}
                      >
                        Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details Modal/Slide-over panel */}
      {selectedTxn && (
        <div className="checkout-overlay">
          <div className="checkout-backdrop" onClick={() => setSelectedTxn(null)}></div>
          <div className="checkout-panel animate-slide-in" style={{ maxWidth: '460px' }}>
            <div className="checkout-panel-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={18} /> Purchase Receipt
              </h3>
              <button className="close-checkout-btn" onClick={() => setSelectedTxn(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="checkout-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
              {/* Status header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="details-label">Order Status</span>
                  <div style={{ marginTop: '4px' }}>
                    {getStatusBadge(selectedTxn.status)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="details-label">Purchase Date</span>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
                    {new Date(selectedTxn.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Summary Block receipt */}
              <div className="receipt-block">
                <span className="summary-label">Receipt Amount</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span className="text-muted-class">Product Catalog Price:</span>
                    <span>{formatCurrency(selectedTxn.totalAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span className="text-muted-class">Processing Fees:</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Included (₹0.00)</span>
                  </div>
                </div>

                <div className="receipt-row" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  <span style={{ fontWeight: 700 }}>Total Paid:</span>
                  <span className="amount-highlight">{formatCurrency(selectedTxn.totalAmount)}</span>
                </div>
              </div>

              {/* Reference ID logs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Payment Identifiers
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div className="details-item">
                    <span className="details-label">Order Ref ID</span>
                    <span className="code-font" style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedTxn.id}
                    </span>
                  </div>
                  
                  <div className="details-item">
                    <span className="details-label">Razorpay Order ID</span>
                    <span className="code-font" style={{ fontSize: '0.75rem' }}>
                      {selectedTxn.razorpayOrderId}
                    </span>
                  </div>

                  <div className="details-item" style={{ gridColumn: 'span 2' }}>
                    <span className="details-label">Razorpay Payment ID</span>
                    <span className="code-font" style={{ fontSize: '0.75rem', display: 'block', wordBreak: 'break-all' }}>
                      {selectedTxn.razorpayPaymentId || 'UNASSIGNED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product card block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Product Details
                </h4>
                
                <div className="order-product-cell" style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                  <img 
                    src="https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=600&auto=format&fit=crop" 
                    alt={selectedTxn.product?.name || 'Product'} 
                    style={{ width: '64px', height: '64px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                  />
                  <div className="order-product-info">
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedTxn.product?.name || 'FlowPay Item'}</span>
                    <span className="text-muted-class" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                      Price: {formatCurrency(selectedTxn.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vendor Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Merchant Information
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <div className="details-item">
                    <span className="details-label">Merchant Store</span>
                    <span className="details-value">{selectedTxn.vendor?.businessName || 'FlowPay Partner'}</span>
                  </div>
                </div>
              </div>

              {/* Close action */}
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                <Button variant="primary" className="w-full" onClick={() => setSelectedTxn(null)}>
                  Close Receipt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerTransactions;
