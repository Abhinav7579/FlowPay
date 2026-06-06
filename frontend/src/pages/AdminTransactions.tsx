import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import Button from '../components/Button';
import Input from '../components/Input';
import { 
  History, 
  Search, 
  Calendar, 
  Filter, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Download, 
  Eye, 
  AlertCircle, 
  RefreshCw,
  TrendingUp,
  Award,
  Wallet,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type { Transaction, TransactionStatus } from '../types';

interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface TransactionStats {
  totalRevenue: number;
  totalPlatformEarnings: number;
  totalVendorPayouts: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  refundedTransactions: number;
}

const AdminTransactions: React.FC = () => {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [detailedTransaction, setDetailedTransaction] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [vendorSearch, setVendorSearch] = useState<string>('');
  const [orderIdSearch, setOrderIdSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('latest');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const { success, error } = useToast();

  // Fetch transaction stats
  const fetchStats = async () => {
    try {
      setIsStatsLoading(true);
      const response = await apiClient.get('/user/admin/transactions/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch transaction statistics', err);
      error(err.response?.data?.message || 'Error loading transaction statistics.');
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Fetch transactions list
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/user/admin/transactions', {
        params: {
          status: statusFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          customerSearch: customerSearch || undefined,
          vendorSearch: vendorSearch || undefined,
          orderIdSearch: orderIdSearch || undefined,
          sort: sortBy,
          page: currentPage,
          limit: 10
        }
      });
      
      if (response.data.success) {
        setTransactions(response.data.data);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions', err);
      error(err.response?.data?.message || 'Error loading transactions list.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, startDate, endDate, customerSearch, vendorSearch, orderIdSearch, sortBy, currentPage, error]);

  // Fetch single transaction details
  const fetchTransactionDetails = async (id: string) => {
    try {
      setIsDetailLoading(true);
      setSelectedTransactionId(id);
      const response = await apiClient.get(`/user/admin/transactions/${id}`);
      if (response.data.success) {
        setDetailedTransaction(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch transaction details', err);
      error(err.response?.data?.message || 'Error loading transaction details.');
      setSelectedTransactionId(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Trigger loads on mount & changes
  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset all filters
  const handleResetFilters = () => {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setCustomerSearch('');
    setVendorSearch('');
    setOrderIdSearch('');
    setSortBy('latest');
    setCurrentPage(1);
    success('Filters cleared.');
  };

  // Export filtered transactions to CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const response = await apiClient.get('/user/admin/transactions', {
        params: {
          status: statusFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          customerSearch: customerSearch || undefined,
          vendorSearch: vendorSearch || undefined,
          orderIdSearch: orderIdSearch || undefined,
          sort: sortBy,
          page: 1,
          limit: 10000 // high limit to fetch all filtered transactions
        }
      });
      
      const list = response.data.data || [];
      if (list.length === 0) {
        error('No transactions available with current filters.');
        return;
      }

      // Build CSV
      const headers = [
        'Transaction ID',
        'Razorpay Order ID',
        'Razorpay Payment ID',
        'Customer Name',
        'Customer Email',
        'Vendor Business Name',
        'Product Name',
        'Total Amount (INR)',
        'Platform Fee (INR)',
        'Vendor Amount (INR)',
        'Status',
        'Created At'
      ];

      const csvRows = [
        headers.join(','),
        ...list.map((t: any) => [
          `"${t.id}"`,
          `"${t.razorpayOrderId}"`,
          `"${t.razorpayPaymentId || 'N/A'}"`,
          `"${t.customer?.name || 'N/A'}"`,
          `"${t.customer?.email || 'N/A'}"`,
          `"${t.vendor?.businessName || 'N/A'}"`,
          `"${t.product?.name || 'N/A'}"`,
          t.totalAmount,
          t.platformFee,
          t.vendorAmount,
          `"${t.status}"`,
          `"${new Date(t.createdAt).toLocaleString()}"`
        ].join(','))
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `flowpay_transactions_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success(`Successfully exported ${list.length} transactions.`);
    } catch (err: any) {
      console.error('Failed to export transactions to CSV', err);
      error('Failed to export CSV report.');
    } finally {
      setIsExporting(false);
    }
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
    <div className="admin-transactions-page animate-fade-in">
      {/* Page Header */}
      <div className="dashboard-header-block">
        <div>
          <h1 className="page-heading">Transactions Monitor</h1>
          <p className="page-subheading">Track platform payments, audit merchant payouts, and inspect transaction breakdowns.</p>
        </div>
        <div className="flex-center" style={{ gap: '12px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchTransactions();
              success('Dashboard refreshed.');
            }}
            icon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            isLoading={isExporting}
            icon={<Download size={14} />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Deck */}
      {!isStatsLoading && stats && (
        <div className="dashboard-stats-grid">
          <div className="stats-card">
            <div className="stats-card-icon bg-purple" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stats-card-data">
              <span className="stats-value">{formatCurrency(stats.totalRevenue)}</span>
              <span className="stats-label">Total Revenue (GMV)</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-card-icon bg-cyan" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
              <Award size={24} />
            </div>
            <div className="stats-card-data">
              <span className="stats-value">{formatCurrency(stats.totalPlatformEarnings)}</span>
              <span className="stats-label">Platform Earnings</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-card-icon bg-emerald" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <Wallet size={24} />
            </div>
            <div className="stats-card-data">
              <span className="stats-value">{formatCurrency(stats.totalVendorPayouts)}</span>
              <span className="stats-label">Vendor Shares</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--color-success)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div className="stats-card-data">
              <span className="stats-value">{stats.successfulTransactions}</span>
              <span className="stats-label">Successful Txns</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-card-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--color-error)' }}>
              <XCircle size={24} />
            </div>
            <div className="stats-card-data">
              <span className="stats-value">{stats.failedTransactions}</span>
              <span className="stats-label">Failed Txns</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Query Controls panel */}
      <div className="content-section mb-4 card-layout" style={{ background: 'var(--bg-surface)', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontSize: '1rem', fontWeight: 600 }}>
          <Filter size={16} /> Filters & Queries
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {/* Order ID Search */}
          <Input 
            label="Search ID / Razorpay ID"
            value={orderIdSearch}
            onChange={(e) => { setOrderIdSearch(e.target.value); setCurrentPage(1); }}
            placeholder="TXN ID or order_..."
            icon={<Search size={14} />}
          />

          {/* Customer search */}
          <Input 
            label="Search Customer"
            value={customerSearch}
            onChange={(e) => { setCustomerSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Name or email..."
            icon={<Search size={14} />}
          />

          {/* Vendor search */}
          <Input 
            label="Search Merchant"
            value={vendorSearch}
            onChange={(e) => { setVendorSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Business Name..."
            icon={<Search size={14} />}
          />

          {/* Status dropdown */}
          <Input 
            label="Status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'SUCCESS', label: 'Success' },
              { value: 'FAILED', label: 'Failed' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'REFUNDED', label: 'Refunded' },
              { value: 'FLAGGED', label: 'Flagged' },
            ]}
          />

          {/* Date from */}
          <Input 
            label="From Date"
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            icon={<Calendar size={14} />}
          />

          {/* Date to */}
          <Input 
            label="To Date"
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            icon={<Calendar size={14} />}
          />

          {/* Sorting */}
          <Input 
            label="Sort By"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'latest', label: 'Latest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'highest', label: 'Highest Amount' },
              { value: 'lowest', label: 'Lowest Amount' },
            ]}
            icon={<ArrowUpDown size={14} />}
          />

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button 
              variant="outline" 
              onClick={handleResetFilters} 
              className="w-full"
              style={{ height: '45px' }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table view */}
      <div className="content-section card-layout">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <Loader message="Fetching transaction logs..." />
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon">
              <AlertCircle size={48} />
            </div>
            <h3>No Transactions Found</h3>
            <p>We couldn't find any transaction logs matching your filters. Try updating your filters or search keywords.</p>
            <Button variant="outline" onClick={handleResetFilters} style={{ marginTop: '1rem' }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID / Date</th>
                    <th>Customer</th>
                    <th>Merchant</th>
                    <th>Product</th>
                    <th>Paid Amount</th>
                    <th>Platform Fee</th>
                    <th>Vendor share</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr 
                      key={txn.id} 
                      onClick={() => fetchTransactionDetails(txn.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="font-bold code-font" style={{ fontSize: '0.8rem', padding: '2px 6px', width: 'fit-content' }}>
                            {txn.id.substring(0, 8)}...
                          </span>
                          <span className="text-muted-class" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                            {new Date(txn.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>{txn.customer?.name || 'N/A'}</span>
                          <span className="text-muted-class" style={{ fontSize: '0.75rem' }}>{txn.customer?.email}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{txn.vendor?.businessName || 'N/A'}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-primary-light)', fontWeight: 500 }}>{txn.product?.name || 'N/A'}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{formatCurrency(txn.totalAmount)}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-info)', fontWeight: 500 }}>{formatCurrency(txn.platformFee)}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>{formatCurrency(txn.vendorAmount)}</span>
                      </td>
                      <td>
                        {getStatusBadge(txn.status)}
                      </td>
                      <td>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchTransactionDetails(txn.id);
                          }}
                          icon={<Eye size={12} />}
                          style={{ padding: '4px 8px' }}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1rem', borderTop: '1px solid var(--border-color)', marginTop: '1rem' }}>
                <span className="text-muted-class" style={{ fontSize: '0.85rem' }}>
                  Showing page <strong style={{ color: '#fff' }}>{pagination.page}</strong> of <strong style={{ color: '#fff' }}>{pagination.pages}</strong> ({pagination.total} total transactions)
                </span>
                
                <div className="flex-center" style={{ gap: '8px' }}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    icon={<ChevronLeft size={16} />}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === pagination.pages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                    icon={<ChevronRight size={16} />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction Details slideover drawer / modal */}
      {selectedTransactionId && (
        <div className="checkout-overlay">
          <div className="checkout-backdrop" onClick={() => setSelectedTransactionId(null)}></div>
          <div className="checkout-panel animate-slide-in" style={{ maxWidth: '480px' }}>
            <div className="checkout-panel-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} /> Transaction Logs
              </h3>
              <button className="close-checkout-btn" onClick={() => setSelectedTransactionId(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="checkout-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {isDetailLoading || !detailedTransaction ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                  <Loader message="Retrieving transaction log details..." />
                </div>
              ) : (
                <>
                  {/* Status header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="details-label">Payment Status</span>
                      <div style={{ marginTop: '4px' }}>
                        {getStatusBadge(detailedTransaction.status)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="details-label">Date & Time</span>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
                        {new Date(detailedTransaction.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Amounts breakdown */}
                  <div className="summary-block">
                    <span className="summary-label">Financial Settlement</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span className="text-muted-class">Customer Paid Amount:</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(detailedTransaction.totalAmount)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span className="text-muted-class">Platform Fee Share (10%):</span>
                        <span style={{ color: 'var(--color-info)', fontWeight: 600 }}>+ {formatCurrency(detailedTransaction.platformFee)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span className="text-muted-class">Merchant share (90%):</span>
                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>+ {formatCurrency(detailedTransaction.vendorAmount)}</span>
                      </div>
                    </div>

                    <div className="summary-price-row">
                      <span style={{ fontWeight: 700 }}>Total Collected:</span>
                      <span className="amount-highlight">{formatCurrency(detailedTransaction.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Reference details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                      Identifiers & References
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      <div className="details-item">
                        <span className="details-label">Internal ID</span>
                        <span className="code-font" style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {detailedTransaction.id}
                        </span>
                      </div>
                      
                      <div className="details-item">
                        <span className="details-label">Razorpay Order ID</span>
                        <span className="code-font" style={{ fontSize: '0.75rem' }}>
                          {detailedTransaction.razorpayOrderId}
                        </span>
                      </div>

                      <div className="details-item" style={{ gridColumn: 'span 2' }}>
                        <span className="details-label">Razorpay Payment ID</span>
                        <span className="code-font" style={{ fontSize: '0.75rem', display: 'block', wordBreak: 'break-all' }}>
                          {detailedTransaction.razorpayPaymentId || 'UNASSIGNED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                      Customer Profile
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="details-item">
                        <span className="details-label">Name</span>
                        <span className="details-value">{detailedTransaction.customer?.name || 'N/A'}</span>
                      </div>
                      <div className="details-item">
                        <span className="details-label">Email Address</span>
                        <span className="details-value" style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>{detailedTransaction.customer?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vendor details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                      Merchant Info
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="details-item">
                        <span className="details-label">Business Name</span>
                        <span className="details-value">{detailedTransaction.vendor?.businessName || 'N/A'}</span>
                      </div>
                      <div className="details-item">
                        <span className="details-label">Merchant Name</span>
                        <span className="details-value">{detailedTransaction.vendor?.user?.name || 'N/A'}</span>
                      </div>
                      <div className="details-item">
                        <span className="details-label">Bank Account</span>
                        <span className="details-value code-font" style={{ fontSize: '0.8rem' }}>{detailedTransaction.vendor?.bankAccount || 'N/A'}</span>
                      </div>
                      <div className="details-item">
                        <span className="details-label">Bank IFSC Code</span>
                        <span className="details-value code-font" style={{ fontSize: '0.8rem' }}>{detailedTransaction.vendor?.ifscCode || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Product details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                      Purchased Product
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="details-item">
                        <span className="details-label">Product Name</span>
                        <span className="details-value" style={{ color: 'var(--color-primary-light)' }}>
                          {detailedTransaction.product?.name || 'N/A'}
                        </span>
                      </div>
                      <div className="details-item">
                        <span className="details-label">Price Cataloged</span>
                        <span className="details-value">{formatCurrency(detailedTransaction.product?.price || 0)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
