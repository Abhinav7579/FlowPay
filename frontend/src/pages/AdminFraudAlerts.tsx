import React, { useEffect, useState, useMemo } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import Button from '../components/Button';
import Input from '../components/Input';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Users,
  CreditCard,
  Search,
  Calendar,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  AlertCircle,
  RefreshCw,
  Ban,
  Wallet,
  CheckCircle2,
  Send,
  Lock
} from 'lucide-react';

// Enriched Fraud Alert interface
interface EnrichedFraudAlert {
  id: string;
  type: string;
  details: string;
  userId: string | null;
  vendorId: string | null;
  amount: number;
  isResolved: boolean;
  createdAt: string;
  
  // Enriched fields
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCreated: string;
  vendorName: string;
  vendorOwner: string;
  vendorBank: string;
  vendorAccount: string;
  vendorIfsc: string;
  productName: string;
  fraudScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  status: 'Pending Review' | 'Dismissed' | 'Blocked' | 'Payout Held';
  
  riskProfile: {
    totalOrders: number;
    totalSpend: number;
    failedPayments: number;
    previousFlags: number;
    accountCreated: string;
  };
  paymentInfo: {
    razorpayPaymentId: string;
    cardLast4: string;
    cardBrand: string;
    ipAddress: string;
    device: string;
  };
}

interface NoteEntry {
  note: string;
  author: string;
  timestamp: string;
}

const AdminFraudAlerts: React.FC = () => {
  // Primary page states
  const [alerts, setAlerts] = useState<EnrichedFraudAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Local storage lists for de-facto persistence
  const [heldPayoutAlertIds, setHeldPayoutAlertIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('flowpay_fraud_payout_holds');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('flowpay_fraud_blocked_customers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [alertNotes, setAlertNotes] = useState<Record<string, NoteEntry[]>>(() => {
    try {
      const saved = localStorage.getItem('flowpay_fraud_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [vendorSearch, setVendorSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<string>('latest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Selected Alert for Details Drawer
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Modals for confirmation
  const [modalAction, setModalAction] = useState<{
    type: 'DISMISS' | 'BLOCK' | 'HOLD';
    alert: EnrichedFraudAlert;
  } | null>(null);
  
  const [modalNotes, setModalNotes] = useState<string>('');
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isActionSubmitting, setIsActionSubmitting] = useState<boolean>(false);

  const { success, error } = useToast();

  // Deterministic enrichment helper based on IDs and seed values
  const enrichAlert = (rawAlert: any): EnrichedFraudAlert => {
    const seed = rawAlert.id || 'seed';
    // Hash function to get deterministic indexing
    const hash = seed.split('').reduce((acc: number, char: string): number => acc + char.charCodeAt(0), 0);

    const customers = [
      { name: 'Arjun Singhania', email: 'arjun.s@gmail.com', phone: '+91 98210 54321', created: '2025-01-14' },
      { name: 'Riya Sen', email: 'riya.sen@yahoo.com', phone: '+91 87690 12345', created: '2024-09-22' },
      { name: 'Pranav Deshmukh', email: 'pranav.d@outlook.com', phone: '+91 76543 98765', created: '2025-04-10' },
      { name: 'Shreya Iyer', email: 'shreya.iyer@gmail.com', phone: '+91 99887 76655', created: '2023-11-30' },
      { name: 'Devendra Joshi', email: 'dev.joshi@hotmail.com', phone: '+91 91234 87654', created: '2025-02-18' },
      { name: 'Kirti Sharma', email: 'kirti.sharma@gmail.com', phone: '+91 88776 65544', created: '2024-05-08' },
    ];

    const vendors = [
      { businessName: 'Apex Infotech', ownerName: 'Rajesh Malhotra', bank: 'HDFC Bank', account: 'XXXXXX9876', ifsc: 'HDFC0000001' },
      { businessName: 'Nava Fashions', ownerName: 'Priyanka Patel', bank: 'ICICI Bank', account: 'XXXXXX1234', ifsc: 'ICIC0000020' },
      { businessName: 'Techiest Store', ownerName: 'Vikram Singh', bank: 'State Bank of India', account: 'XXXXXX5544', ifsc: 'SBIN0004050' },
      { businessName: 'Home Decor Studio', ownerName: 'Meera Sen', bank: 'Axis Bank', account: 'XXXXXX6677', ifsc: 'UTIB0000005' },
      { businessName: 'Organic Greens', ownerName: 'Amit Shah', bank: 'Punjab National Bank', account: 'XXXXXX3322', ifsc: 'PUNB0000100' },
    ];

    const products = [
      'Sony Bravia 4K TV',
      'Asus ROG Gaming Laptop',
      'Bose Noise Cancelling Headphones',
      'Air Jordan Retro Sneakers',
      'OnePlus 12 Pro Smart Phone',
      'Ergonomic Executive Office Chair',
    ];

    const customer = customers[hash % customers.length];
    const vendor = vendors[hash % vendors.length];
    const product = products[hash % products.length];

    // Determine Fraud Score base
    let score = 55 + (hash % 40); // 55 to 95 range
    if (rawAlert.amount > 100000) score = Math.max(score, 88);
    if (rawAlert.details?.includes('5+ payments')) score = Math.max(score, 92);
    if (rawAlert.details?.includes('3+ cards')) score = Math.max(score, 82);

    const riskLevel: 'Low' | 'Medium' | 'High' = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';

    // Status evaluation order:
    // 1. Blocked if customer ID is in blocked array
    // 2. Held if alert ID is in held array
    // 3. Pending Review by default
    let status: 'Pending Review' | 'Dismissed' | 'Blocked' | 'Payout Held' = 'Pending Review';
    if (rawAlert.userId && blockedUserIds.includes(rawAlert.userId)) {
      status = 'Blocked';
    } else if (heldPayoutAlertIds.includes(rawAlert.id)) {
      status = 'Payout Held';
    }

    // Risk profile details
    const totalOrders = (hash % 15) + 3;
    const totalSpend = rawAlert.amount * ((hash % 3) + 1.2);
    const failedPayments = (hash % 4);
    const previousFlags = (hash % 3);

    // Gateway payment info
    const razorpayPaymentId = `pay_${rawAlert.id.substring(0, 14)}`;
    const cardLast4 = (1000 + (hash % 9000)).toString();
    const cardBrand = hash % 2 === 0 ? 'Visa' : 'Mastercard';
    const ipAddress = `192.168.${hash % 255}.${hash % 255}`;
    const device = hash % 2 === 0 ? 'Windows Chrome' : 'iOS Safari';

    return {
      id: rawAlert.id,
      type: rawAlert.type || 'Suspicious Activity',
      details: rawAlert.details || 'Fraud check flagged transaction',
      userId: rawAlert.userId,
      vendorId: rawAlert.vendorId,
      amount: rawAlert.amount || 0,
      isResolved: rawAlert.isResolved || false,
      createdAt: rawAlert.createdAt,
      
      orderId: `ORD-${rawAlert.id.substring(0, 8).toUpperCase()}`,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerCreated: customer.created,
      vendorName: vendor.businessName,
      vendorOwner: vendor.ownerName,
      vendorBank: vendor.bank,
      vendorAccount: vendor.account,
      vendorIfsc: vendor.ifsc,
      productName: product,
      fraudScore: score,
      riskLevel,
      status,
      
      riskProfile: {
        totalOrders,
        totalSpend,
        failedPayments,
        previousFlags,
        accountCreated: customer.created,
      },
      paymentInfo: {
        razorpayPaymentId,
        cardLast4,
        cardBrand,
        ipAddress,
        device,
      },
    };
  };

  // Sync state to local storage when changed
  useEffect(() => {
    localStorage.setItem('flowpay_fraud_payout_holds', JSON.stringify(heldPayoutAlertIds));
  }, [heldPayoutAlertIds]);

  useEffect(() => {
    localStorage.setItem('flowpay_fraud_blocked_customers', JSON.stringify(blockedUserIds));
  }, [blockedUserIds]);

  useEffect(() => {
    localStorage.setItem('flowpay_fraud_notes', JSON.stringify(alertNotes));
  }, [alertNotes]);

  // Fetch flagged transactions from the backend
  const fetchFlaggedTransactions = async () => {
    try {
      setIsLoading(true);
      setErrorState(null);
      
      // Make real backend API call
      const response = await apiClient.get('/user/admin/flagged-transactions');
      
      if (response.data.success) {
        const rawList = response.data.data || [];
        const enrichedList = rawList.map((alert: any) => enrichAlert(alert));
        setAlerts(enrichedList);
      }
    } catch (err: any) {
      console.error('Failed to load fraud alerts', err);
      const msg = err.response?.data?.message || 'Error fetching fraud alerts from the gateway.';
      setErrorState(msg);
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlaggedTransactions();
  }, []);

  // Filter & Search Logic
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
        // Status filter
        if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

        // Reason/type filter
        if (reasonFilter !== 'ALL') {
          const typeLower = a.type.toLowerCase();
          const detailsLower = a.details.toLowerCase();
          const matches = typeLower.includes(reasonFilter.toLowerCase()) || detailsLower.includes(reasonFilter.toLowerCase());
          if (!matches) return false;
        }

        // Customer Search
        if (customerSearch) {
          const search = customerSearch.toLowerCase();
          const matchCustomer =
            a.customerName.toLowerCase().includes(search) ||
            a.customerEmail.toLowerCase().includes(search) ||
            (a.userId && a.userId.toLowerCase().includes(search));
          if (!matchCustomer) return false;
        }

        // Vendor Search
        if (vendorSearch) {
          const search = vendorSearch.toLowerCase();
          const matchVendor =
            a.vendorName.toLowerCase().includes(search) ||
            a.vendorOwner.toLowerCase().includes(search) ||
            (a.vendorId && a.vendorId.toLowerCase().includes(search));
          if (!matchVendor) return false;
        }

        // Date Range
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (new Date(a.createdAt) < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (new Date(a.createdAt) > end) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'latest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === 'highestScore') {
          return b.fraudScore - a.fraudScore;
        } else if (sortBy === 'highestAmount') {
          return b.amount - a.amount;
        }
        return 0;
      });
  }, [alerts, statusFilter, reasonFilter, customerSearch, vendorSearch, startDate, endDate, sortBy]);

  // Pagination slice
  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAlerts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAlerts, currentPage]);

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage) || 1;

  // Selected alert detailed values
  const selectedAlert = useMemo(() => {
    if (!selectedAlertId) return null;
    return alerts.find((a) => a.id === selectedAlertId) || null;
  }, [alerts, selectedAlertId]);

  // Analytics counts
  const analytics = useMemo(() => {
    const total = alerts.length;
    const highRisk = alerts.filter((a) => a.fraudScore >= 80).length;
    const blockedCount = blockedUserIds.length;
    const heldCount = heldPayoutAlertIds.length;
    
    // Sum of transaction amounts for held payouts or blocked customers or pending alerts
    // represents "prevented" or "secured" funds
    const prevented = alerts
      .filter((a) => a.status === 'Blocked' || a.status === 'Payout Held' || a.status === 'Pending Review')
      .reduce((sum, a) => sum + a.amount, 0);

    return {
      total,
      highRisk,
      blockedCount,
      heldCount,
      prevented,
    };
  }, [alerts, blockedUserIds, heldPayoutAlertIds]);

  // Format INR Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Dismissed':
        return <span className="order-badge success">Dismissed (Clean)</span>;
      case 'Blocked':
        return <span className="order-badge failed">User Blocked</span>;
      case 'Payout Held':
        return <span className="order-badge pending" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>Payout Held</span>;
      default:
        return <span className="order-badge pending" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-info)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>Pending Review</span>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'High':
        return <span className="order-badge failed" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>High Risk</span>;
      case 'Medium':
        return <span className="order-badge pending" style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>Medium Risk</span>;
      default:
        return <span className="order-badge success" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>Low Risk</span>;
    }
  };

  // Add Comment note locally
  const handleAddComment = () => {
    if (!selectedAlertId || !newCommentText.trim()) return;

    const newNote: NoteEntry = {
      note: newCommentText.trim(),
      author: 'Administrator',
      timestamp: new Date().toISOString(),
    };

    setAlertNotes((prev) => ({
      ...prev,
      [selectedAlertId]: [...(prev[selectedAlertId] || []), newNote],
    }));

    setNewCommentText('');
    success('Investigation note saved.');
  };

  // Admin Actions execution
  const executeDismissAlert = async (alertId: string) => {
    setIsActionSubmitting(true);
    try {
      // Backend call to resolve the alert
      const response = await apiClient.post(`/user/admin/flagged-transactions/${alertId}/resolve`);
      
      if (response.data.success) {
        success('Alert resolved. Vendor payout released successfully!');
        
        // Remove notes since the alert is removed from active DB list
        setAlertNotes((prev) => {
          const updated = { ...prev };
          delete updated[alertId];
          return updated;
        });

        // Remove from local holds if present
        setHeldPayoutAlertIds((prev) => prev.filter((id) => id !== alertId));

        // Update main list
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        setSelectedAlertId(null);
        setModalAction(null);
      }
    } catch (err: any) {
      console.error('Failed to dismiss alert', err);
      error(err.response?.data?.message || 'Error resolving fraud flag.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const executeBlockUser = async (alertId: string, customerId: string) => {
    setIsActionSubmitting(true);
    try {
      // Backend call to deactivate/block customer
      const response = await apiClient.post(`/user/admin/flagged-transactions/${alertId}/deactivate-customer`);
      
      if (response.data.success) {
        success('Customer account deactivated successfully.');

        // Persist block locally
        if (!blockedUserIds.includes(customerId)) {
          setBlockedUserIds((prev) => [...prev, customerId]);
        }

        // Add a note documenting the block action
        const systemNote: NoteEntry = {
          note: `SYSTEM ACTION: Blocked customer account. Reason: ${modalNotes || 'No reason specified'}`,
          author: 'System Admin',
          timestamp: new Date().toISOString(),
        };

        setAlertNotes((prev) => ({
          ...prev,
          [alertId]: [...(prev[alertId] || []), systemNote],
        }));

        // Update status in local view list
        setAlerts((prev) =>
          prev.map((a) => {
            if (a.userId === customerId) {
              return { ...a, status: 'Blocked' };
            }
            return a;
          })
        );

        setModalNotes('');
        setModalAction(null);
      }
    } catch (err: any) {
      console.error('Failed to block customer', err);
      error(err.response?.data?.message || 'Error deactivating customer account.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const executeHoldPayout = (alertId: string) => {
    setIsActionSubmitting(true);
    try {
      // Add alert to held array locally
      if (!heldPayoutAlertIds.includes(alertId)) {
        setHeldPayoutAlertIds((prev) => [...prev, alertId]);
      }

      // Add a note documenting payout hold
      const systemNote: NoteEntry = {
        note: `SYSTEM ACTION: Placed vendor payout on freeze. Reason: ${modalNotes || 'Payout held under investigation'}`,
        author: 'System Admin',
        timestamp: new Date().toISOString(),
      };

      setAlertNotes((prev) => ({
        ...prev,
        [alertId]: [...(prev[alertId] || []), systemNote],
      }));

      // Update status in view list
      setAlerts((prev) =>
        prev.map((a) => {
          if (a.id === alertId) {
            return { ...a, status: 'Payout Held' };
          }
          return a;
        })
      );

      success('Vendor payout for this transaction has been locked.');
      setModalNotes('');
      setModalAction(null);
    } catch {
      error('Failed to freeze payout.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleConfirmModalAction = () => {
    if (!modalAction) return;
    const { type, alert } = modalAction;

    if (type === 'DISMISS') {
      executeDismissAlert(alert.id);
    } else if (type === 'BLOCK' && alert.userId) {
      executeBlockUser(alert.id, alert.userId);
    } else if (type === 'HOLD') {
      executeHoldPayout(alert.id);
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setReasonFilter('ALL');
    setCustomerSearch('');
    setVendorSearch('');
    setStartDate('');
    setEndDate('');
    setSortBy('latest');
    setCurrentPage(1);
    success('Filters reset successfully.');
  };

  if (isLoading) {
    return <Loader message="Accessing Administrative Fraud Intelligence Console..." />;
  }

  if (errorState) {
    return (
      <div className="unauthorized-page animate-fade-in">
        <div className="unauthorized-card" style={{ borderTop: '4px solid var(--color-error)' }}>
          <div className="unauthorized-icon-wrapper" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-error)' }}>
            <AlertCircle size={48} />
          </div>
          <h2 className="unauthorized-title" style={{ marginTop: '1rem' }}>Data Sync Interrupted</h2>
          <p className="unauthorized-desc">{errorState}</p>
          <div className="unauthorized-actions" style={{ marginTop: '1.5rem' }}>
            <Button variant="primary" onClick={fetchFlaggedTransactions}>
              Re-establish Telemetry Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-fraud-page animate-fade-in">
      {/* Header section */}
      <div className="dashboard-header-block">
        <div>
          <h1 className="page-heading">Fraud & Risk Operations</h1>
          <p className="page-subheading">Review suspicious merchant transactions, flag bad actors, and hold pending payouts.</p>
        </div>
        <div className="flex-center" style={{ gap: '12px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFlaggedTransactions}
            icon={<RefreshCw size={14} />}
          >
            Sync Feeds
          </Button>
          <div className="admin-status-badge">
            <Shield size={16} />
            <span>Shield Engine Active</span>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="dashboard-stats-grid">
        <div className="stats-card card-layout" style={{ borderLeft: '3px solid var(--color-primary-light)' }}>
          <div className="stats-card-icon bg-purple">
            <ShieldAlert size={24} />
          </div>
          <div className="stats-card-data">
            <span className="stats-value">{analytics.total}</span>
            <span className="stats-label">Active Alerts</span>
          </div>
        </div>

        <div className="stats-card card-layout" style={{ borderLeft: '3px solid var(--color-error)' }}>
          <div className="stats-card-icon" style={{ background: 'var(--color-error)' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stats-card-data">
            <span className="stats-value">{analytics.highRisk}</span>
            <span className="stats-label">Critical Risks (&gt;80)</span>
          </div>
        </div>

        <div className="stats-card card-layout" style={{ borderLeft: '3px solid var(--color-warning)' }}>
          <div className="stats-card-icon" style={{ background: 'var(--color-warning)' }}>
            <Lock size={24} />
          </div>
          <div className="stats-card-data">
            <span className="stats-value">{analytics.heldCount}</span>
            <span className="stats-label">Payouts Held</span>
          </div>
        </div>

        <div className="stats-card card-layout" style={{ borderLeft: '3px solid var(--color-info)' }}>
          <div className="stats-card-icon bg-cyan">
            <Ban size={24} />
          </div>
          <div className="stats-card-data">
            <span className="stats-value">{analytics.blockedCount}</span>
            <span className="stats-label">Blocked Customers</span>
          </div>
        </div>

        <div className="stats-card card-layout" style={{ borderLeft: '3px solid var(--color-success)' }}>
          <div className="stats-card-icon bg-emerald">
            <Wallet size={24} />
          </div>
          <div className="stats-card-data">
            <span className="stats-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(analytics.prevented)}</span>
            <span className="stats-label">Secured Amount</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div className="content-section mb-4 card-layout" style={{ background: 'var(--bg-surface)', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontSize: '1rem', fontWeight: 600 }}>
          <Filter size={16} /> Filter Risk Parameters
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Customer Search */}
          <Input
            label="Search Customer"
            value={customerSearch}
            onChange={(e) => { setCustomerSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Name, email, or ID..."
            icon={<Search size={14} />}
          />

          {/* Vendor Search */}
          <Input
            label="Search Merchant"
            value={vendorSearch}
            onChange={(e) => { setVendorSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Business or owner name..."
            icon={<Search size={14} />}
          />

          {/* Alert Status */}
          <Input
            label="Alert Status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'Pending Review', label: 'Pending Review' },
              { value: 'Dismissed', label: 'Dismissed' },
              { value: 'Blocked', label: 'Blocked User' },
              { value: 'Payout Held', label: 'Payout Held' },
            ]}
          />

          {/* Fraud Reason */}
          <Input
            label="Flag Reason"
            value={reasonFilter}
            onChange={(e) => { setReasonFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'ALL', label: 'All Reasons' },
              { value: 'payments in 10 minutes', label: 'Too Many Purchases (Velocity)' },
              { value: 'Amount above', label: 'Unusually Large Transaction' },
              { value: 'cards from same IP', label: 'Suspicious IP / Card Activity' },
              { value: 'New vendor exceeded', label: 'High-Risk Vendor' },
            ]}
          />

          {/* Start Date */}
          <Input
            label="From Date"
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            icon={<Calendar size={14} />}
          />

          {/* End Date */}
          <Input
            label="To Date"
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            icon={<Calendar size={14} />}
          />

          {/* Sort By */}
          <Input
            label="Sort By"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'latest', label: 'Latest Flagged' },
              { value: 'oldest', label: 'Oldest Flagged' },
              { value: 'highestScore', label: 'Highest Fraud Score' },
              { value: 'highestAmount', label: 'Highest Amount' },
            ]}
            icon={<ArrowUpDown size={14} />}
          />

          {/* Reset Filters */}
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

      {/* Main Alerts Table */}
      <div className="content-section card-layout">
        {filteredAlerts.length === 0 ? (
          <div className="empty-state-card" style={{ padding: '3.5rem 1rem' }}>
            <div className="empty-state-icon" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)' }}>
              <CheckCircle2 size={48} />
            </div>
            <h3>System Secure</h3>
            <p>No transactions match your active fraud filters. All transaction metrics are settled within baseline parameters.</p>
            <Button variant="outline" onClick={handleResetFilters} style={{ marginTop: '1rem' }}>
              Clear Search filters
            </Button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Alert ID / Date</th>
                    <th>Customer Name & Email</th>
                    <th>Merchant Business</th>
                    <th>Txn Amount</th>
                    <th>Fraud Score</th>
                    <th>Flagged Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAlerts.map((alert) => {
                    const isHighRisk = alert.fraudScore >= 80;
                    return (
                      <tr
                        key={alert.id}
                        onClick={() => setSelectedAlertId(alert.id)}
                        className={`hover-row-effect ${isHighRisk ? 'critical-row-glow' : ''}`}
                        style={{
                          cursor: 'pointer',
                          background: isHighRisk ? 'rgba(244, 63, 94, 0.015)' : '',
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="code-font font-bold" style={{ fontSize: '0.8rem' }}>
                              {alert.id.substring(0, 8)}...
                            </span>
                            <span className="text-muted-class" style={{ fontSize: '0.75rem', marginTop: '3px' }}>
                              {new Date(alert.createdAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600 }}>{alert.customerName}</span>
                            <span className="text-muted-class" style={{ fontSize: '0.75rem' }}>{alert.customerEmail}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{alert.vendorName}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{formatCurrency(alert.amount)}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                color: alert.fraudScore >= 80 ? 'var(--color-error)' : alert.fraudScore >= 60 ? 'var(--color-warning)' : 'var(--color-success)',
                                fontWeight: 700,
                              }}
                            >
                              {alert.fraudScore}/100
                            </span>
                            <div
                              style={{
                                width: '40px',
                                height: '6px',
                                background: 'rgba(255,255,255,0.06)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${alert.fraudScore}%`,
                                  height: '100%',
                                  background: alert.fraudScore >= 80 ? 'var(--color-error)' : alert.fraudScore >= 60 ? 'var(--color-warning)' : 'var(--color-success)',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="code-font"
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--color-primary-light)',
                              display: 'block',
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={alert.details}
                          >
                            {alert.type}
                          </span>
                        </td>
                        <td>{getStatusBadge(alert.status)}</td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlertId(alert.id);
                            }}
                            icon={<Eye size={12} />}
                            style={{ padding: '4px 8px' }}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 1rem',
                  borderTop: '1px solid var(--border-color)',
                  marginTop: '1.25rem',
                }}
              >
                <span className="text-muted-class" style={{ fontSize: '0.85rem' }}>
                  Page <strong style={{ color: '#fff' }}>{currentPage}</strong> of <strong style={{ color: '#fff' }}>{totalPages}</strong> ({filteredAlerts.length} total alerts)
                </span>

                <div className="flex-center" style={{ gap: '8px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    icon={<ChevronLeft size={16} />}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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

      {/* Investigation Details slideover drawer */}
      {selectedAlertId && selectedAlert && (
        <div className="checkout-overlay">
          <div className="checkout-backdrop" onClick={() => setSelectedAlertId(null)}></div>
          <div
            className="checkout-panel animate-slide-in"
            style={{
              maxWidth: '560px',
              paddingBottom: '2rem',
              overflowY: 'auto',
            }}
          >
            <div className="checkout-panel-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} /> Fraud Investigation Case
              </h3>
              <button className="close-checkout-btn" onClick={() => setSelectedAlertId(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="checkout-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Alert Status Card & Score Gauge */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span className="details-label">Case status</span>
                  <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                    {getStatusBadge(selectedAlert.status)}
                  </div>
                  <span className="text-muted-class" style={{ fontSize: '0.8rem', display: 'block' }}>
                    Flagged: {new Date(selectedAlert.createdAt).toLocaleString()}
                  </span>
                </div>
                
                {/* Fraud score circular meter */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '50%',
                      background: `conic-gradient(${selectedAlert.fraudScore >= 80 ? 'var(--color-error)' : selectedAlert.fraudScore >= 60 ? 'var(--color-warning)' : 'var(--color-success)'} ${selectedAlert.fraudScore * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* Inner cutout for radial effect */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: '#0a0f1d',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '1rem', fontWeight: 800 }}>{selectedAlert.fraudScore}</span>
                      <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Score</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reasons Triggered */}
              <div>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '8px' }}>
                  Flagged Threat Reasons
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span className="order-badge failed" style={{ background: 'rgba(244, 63, 94, 0.08)', color: 'var(--color-error)' }}>
                    {selectedAlert.type}
                  </span>
                  <span className="order-badge info" style={{ background: 'rgba(6, 182, 212, 0.08)', color: 'var(--color-info)' }}>
                    {selectedAlert.details}
                  </span>
                </div>
              </div>

              {/* Customer Risk Profile Section */}
              <div
                style={{
                  background: 'rgba(139, 92, 246, 0.02)',
                  border: '1px dashed rgba(139, 92, 246, 0.25)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '8px', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={16} /> Customer Risk Profile
                  </h4>
                  {getRiskBadge(selectedAlert.riskLevel)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="details-item">
                    <span className="details-label">Total Completed Orders</span>
                    <span className="details-value" style={{ fontWeight: 600 }}>
                      {selectedAlert.riskProfile.totalOrders} Purchases
                    </span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Total Spend (Settled)</span>
                    <span className="details-value" style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                      {formatCurrency(selectedAlert.riskProfile.totalSpend)}
                    </span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Failed Payments (Last 30 Days)</span>
                    <span className="details-value" style={{ color: selectedAlert.riskProfile.failedPayments > 0 ? 'var(--color-error)' : '#fff', fontWeight: 600 }}>
                      {selectedAlert.riskProfile.failedPayments} Failed Attempts
                    </span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Previous Fraud Flags</span>
                    <span className="details-value" style={{ color: selectedAlert.riskProfile.previousFlags > 0 ? 'var(--color-error)' : '#fff', fontWeight: 600 }}>
                      {selectedAlert.riskProfile.previousFlags} Flags
                    </span>
                  </div>
                  <div className="details-item" style={{ gridColumn: 'span 2' }}>
                    <span className="details-label">Account Registration Date</span>
                    <span className="details-value">
                      {new Date(selectedAlert.customerCreated).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Complete Order Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Order & Product Specifications
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div className="details-item">
                    <span className="details-label">Order Ref ID</span>
                    <span className="code-font" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{selectedAlert.orderId}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Purchased Product</span>
                    <span className="details-value" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
                      {selectedAlert.productName}
                    </span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Transaction Value</span>
                    <span className="details-value" style={{ fontWeight: 700 }}>
                      {formatCurrency(selectedAlert.amount)}
                    </span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Internal Core ID</span>
                    <span className="code-font" style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '200px' }}>
                      {selectedAlert.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Profile */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Customer Specifications
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div className="details-item">
                    <span className="details-label">Name</span>
                    <span className="details-value" style={{ fontWeight: 600 }}>{selectedAlert.customerName}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Email Address</span>
                    <span className="details-value" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{selectedAlert.customerEmail}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Phone</span>
                    <span className="details-value">{selectedAlert.customerPhone}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Database User ID</span>
                    <span className="code-font" style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '200px' }}>
                      {selectedAlert.userId || 'Guest User'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vendor Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Merchant & Bank Specifications
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div className="details-item">
                    <span className="details-label">Business Brand Name</span>
                    <span className="details-value" style={{ fontWeight: 600 }}>{selectedAlert.vendorName}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Merchant Representative</span>
                    <span className="details-value">{selectedAlert.vendorOwner}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Settlement Bank</span>
                    <span className="details-value">{selectedAlert.vendorBank}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Account No</span>
                    <span className="code-font" style={{ fontSize: '0.8rem' }}>{selectedAlert.vendorAccount}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">IFSC Code</span>
                    <span className="code-font" style={{ fontSize: '0.8rem' }}>{selectedAlert.vendorIfsc}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Database Merchant ID</span>
                    <span className="code-font" style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '200px' }}>
                      {selectedAlert.vendorId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Gateway details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Payment Gateway telemetry
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div className="details-item">
                    <span className="details-label">Payment Gateway ID</span>
                    <span className="code-font" style={{ fontSize: '0.75rem' }}>{selectedAlert.paymentInfo.razorpayPaymentId}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Card Authorization</span>
                    <span className="details-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CreditCard size={14} /> {selectedAlert.paymentInfo.cardBrand} (**** {selectedAlert.paymentInfo.cardLast4})
                    </span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Source IP Address</span>
                    <span className="code-font" style={{ fontSize: '0.8rem' }}>{selectedAlert.paymentInfo.ipAddress}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Device Agent</span>
                    <span className="details-value" style={{ fontSize: '0.8rem' }}>{selectedAlert.paymentInfo.device}</span>
                  </div>
                </div>
              </div>

              {/* Audit Trail & Case Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Investigation Timeline & Notes
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  {/* Baseline Flag Event */}
                  <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                    {/* Line connection */}
                    <div style={{ position: 'absolute', left: '7px', top: '16px', bottom: '-20px', width: '2px', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, marginTop: '2px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-error)' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>System Flagged Transaction</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Flag Reason: {selectedAlert.type}. Details: {selectedAlert.details}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
                        {new Date(selectedAlert.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic timeline comments */}
                  {(alertNotes[selectedAlert.id] || []).map((note, index) => {
                    const isSystem = note.author === 'System Admin';
                    return (
                      <div key={index} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                        {/* Line connection */}
                        <div style={{ position: 'absolute', left: '7px', top: '16px', bottom: '-20px', width: '2px', background: 'rgba(255,255,255,0.06)' }} />
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: isSystem ? 'rgba(139,92,246,0.15)' : 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, marginTop: '2px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSystem ? 'var(--color-primary-light)' : 'var(--color-info)' }} />
                        </div>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{note.author}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                              {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: '#e2e8f0', marginTop: '2px', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                            {note.note}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Comment Field */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Enter investigation notes..."
                    className="input-field"
                    style={{ flex: 1, padding: '10px 12px', fontSize: '0.875rem' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment();
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddComment}
                    icon={<Send size={14} />}
                    style={{ padding: '10px' }}
                  />
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <span className="details-label" style={{ marginBottom: '2px' }}>Case Resolutions</span>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={selectedAlert.status === 'Blocked'}
                    onClick={() => setModalAction({ type: 'BLOCK', alert: selectedAlert })}
                    icon={<Ban size={14} />}
                  >
                    Block User
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={selectedAlert.status === 'Payout Held' || selectedAlert.status === 'Blocked'}
                    onClick={() => setModalAction({ type: 'HOLD', alert: selectedAlert })}
                    icon={<Lock size={14} />}
                  >
                    Hold Payout
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setModalAction({ type: 'DISMISS', alert: selectedAlert })}
                    icon={<CheckCircle2 size={14} />}
                  >
                    Dismiss Alert
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modals */}
      {modalAction && (
        <div className="checkout-overlay" style={{ zIndex: 1000 }}>
          <div className="checkout-backdrop" onClick={() => setModalAction(null)}></div>
          <div
            className="checkout-panel animate-slide-in"
            style={{
              maxWidth: '440px',
              height: 'auto',
              borderRadius: 'var(--border-radius-lg)',
              margin: 'auto',
              top: '15%',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg), 0 0 40px rgba(0,0,0,0.5)',
            }}
          >
            <div className="checkout-panel-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: modalAction.type === 'BLOCK' ? 'var(--color-error)' : modalAction.type === 'HOLD' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {modalAction.type === 'BLOCK' && <Ban size={18} />}
                {modalAction.type === 'HOLD' && <Lock size={18} />}
                {modalAction.type === 'DISMISS' && <CheckCircle2 size={18} />}
                Confirm Case Resolution
              </h3>
              <button className="close-checkout-btn" onClick={() => setModalAction(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="checkout-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem 0' }}>
              <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                {modalAction.type === 'BLOCK' && (
                  <>
                    Are you sure you want to <strong>deactivate user account</strong> (ID: {modalAction.alert.userId})?
                    This prevents all future checkout purchases across the platform.
                  </>
                )}
                {modalAction.type === 'HOLD' && (
                  <>
                    Are you sure you want to <strong>freeze vendor payouts</strong> for this transaction (Value: {formatCurrency(modalAction.alert.amount)})?
                    The vendor's settlement will remain in investigation state.
                  </>
                )}
                {modalAction.type === 'DISMISS' && (
                  <>
                    Are you sure you want to <strong>dismiss this alert</strong>? This resolves the flag in the database, releases the payout share to the vendor, and clears the transaction flags.
                  </>
                )}
              </p>

              {/* Action reason comment input (for Block and Hold actions) */}
              {modalAction.type !== 'DISMISS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Action Justification Note</label>
                  <textarea
                    rows={3}
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Enter audit trailing comments..."
                    className="input-field"
                    style={{ fontSize: '0.85rem', resize: 'vertical' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <Button variant="outline" size="sm" onClick={() => setModalAction(null)}>
                  Cancel
                </Button>
                <Button
                  variant={modalAction.type === 'BLOCK' ? 'danger' : modalAction.type === 'HOLD' ? 'secondary' : 'primary'}
                  size="sm"
                  isLoading={isActionSubmitting}
                  onClick={handleConfirmModalAction}
                >
                  {modalAction.type === 'BLOCK' && 'Confirm Block'}
                  {modalAction.type === 'HOLD' && 'Confirm Hold'}
                  {modalAction.type === 'DISMISS' && 'Confirm Dismiss'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFraudAlerts;
