import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import Input from '../components/Input';
import Button from '../components/Button';
import { 
  Landmark, 
  ArrowRight, 
  Hourglass, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  ShieldAlert, 
  Award,
  History,
  AlertCircle,
  Eye,
  X,
  CreditCard,
  Calendar,
  Filter,
  ArrowUpRight,
  ListOrdered,
  Package,
  Plus
} from 'lucide-react';
import type { Vendor, Transaction, Payout, Product } from '../types';

// Matching backend validation schema
const onboardSchema = z.object({
  businessName: z.string().min(4, 'Business name must be at least 4 characters long'),
  accountNumber: z.string().regex(/^\d{9,18}$/, 'Account number must be between 9 and 18 digits'),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code (e.g. SBIN0012345)'),
});

type OnboardFormInputs = z.infer<typeof onboardSchema>;

interface VendorDashboardProps {
  defaultTab?: 'analytics' | 'sales' | 'payouts' | 'products';
}

const VendorDashboard: React.FC<VendorDashboardProps> = ({ defaultTab }) => {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Data loading states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isTxnsLoading, setIsTxnsLoading] = useState<boolean>(false);
  const [isPayoutsLoading, setIsPayoutsLoading] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Detail overlays
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);

  // Update bank details states
  const [isEditingBank, setIsEditingBank] = useState<boolean>(false);
  const [editAccountNumber, setEditAccountNumber] = useState<string>('');
  const [editIfsc, setEditIfsc] = useState<string>('');
  const [isUpdatingBank, setIsUpdatingBank] = useState<boolean>(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Tab state: 'analytics' | 'sales' | 'payouts' | 'products'
  const [activeTab, setActiveTab] = useState<'analytics' | 'sales' | 'payouts' | 'products'>(defaultTab || 'analytics');

  // Product states
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(false);

  // Sync tab with route defaultTab prop changes or vendor approval lifecycle
  useEffect(() => {
    if (vendor && !vendor.isApproved) {
      setActiveTab('products');
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    } else {
      setActiveTab('analytics');
    }
  }, [defaultTab, vendor]);
  
  // Add product form states
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductPrice, setNewProductPrice] = useState<string>('');
  const [newProductImage, setNewProductImage] = useState<string>('');
  const [addProductError, setAddProductError] = useState<string | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState<boolean>(false);

  // Filters for Payouts
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const { success, error } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardFormInputs>({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      businessName: '',
      accountNumber: '',
      ifsc: '',
    },
  });

  const checkOnboardStatus = async () => {
    try {
      setIsLoading(true);
      setErrorState(null);
      const response = await apiClient.get('/user/vendor');
      if (response.data.success) {
        setIsOnboarded(response.data.onboarded);
        setVendor(response.data.vendor);
      }
    } catch (err: any) {
      console.error('Check onboard error', err);
      const msg = err.response?.data?.message || 'Error checking onboarding status.';
      setErrorState(msg);
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setIsTxnsLoading(true);
      const response = await apiClient.get('/user/vendor/transactions');
      if (response.data.success) {
        setTransactions(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch vendor transactions', err);
      error(err.response?.data?.message || 'Error loading transaction records.');
    } finally {
      setIsTxnsLoading(false);
    }
  };

  const fetchPayouts = async () => {
    try {
      setIsPayoutsLoading(true);
      const response = await apiClient.get('/user/vendor/payouts');
      if (response.data.success) {
        setPayouts(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch vendor payouts', err);
      error(err.response?.data?.message || 'Error loading payout records.');
    } finally {
      setIsPayoutsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsProductsLoading(true);
      const response = await apiClient.get('/products');
      setProducts(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch products', err);
    } finally {
      setIsProductsLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim()) {
      setAddProductError('Product name is required');
      return;
    }
    if (newProductName.trim().length < 3) {
      setAddProductError('Product name must be at least 3 characters');
      return;
    }
    const priceNum = parseFloat(newProductPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setAddProductError('Price must be greater than 0');
      return;
    }
    if (!newProductImage.trim()) {
      setAddProductError('Image URL is required');
      return;
    }
    try {
      new URL(newProductImage);
    } catch (_) {
      setAddProductError('Please provide a valid image URL');
      return;
    }

    setIsSubmittingProduct(true);
    setAddProductError(null);

    try {
      const response = await apiClient.post('/user/vendor/add-product', {
        name: newProductName,
        price: priceNum,
        image: newProductImage
      });

      if (response.data.success) {
        success('Product added successfully!');
        setNewProductName('');
        setNewProductPrice('');
        setNewProductImage('');
        fetchProducts();
      }
    } catch (err: any) {
      console.error('Failed to add product', err);
      const msg = err.response?.data?.message || 'Failed to add product.';
      setAddProductError(msg);
      error(msg);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  useEffect(() => {
    checkOnboardStatus();
  }, []);

  // Fetch sales, payouts, and products records if the vendor is onboarded
  useEffect(() => {
    if (isOnboarded) {
      if (vendor?.isApproved) {
        fetchTransactions();
        fetchPayouts();
      }
      fetchProducts();
    }
  }, [isOnboarded, vendor]);

  const onSubmit = async (data: OnboardFormInputs) => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/user/vendor/onboard', data);
      if (response.data.success) {
        success('Onboarding complete! Your profile is submitted for approval.');
        setIsOnboarded(true);
        setVendor(response.data.data);
      }
    } catch (err: any) {
      console.error('Onboarding submit error', err);
      error(err.response?.data?.message || 'Failed to complete merchant onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBankDetails = async () => {
    if (!vendor) return;
    
    // Client-side validation matching the schema
    const accountRegex = /^\d{9,18}$/;
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!accountRegex.test(editAccountNumber)) {
      setBankError('Account number must be between 9 and 18 digits');
      return;
    }

    if (!ifscRegex.test(editIfsc)) {
      setBankError('Invalid IFSC code (e.g. SBIN0012345)');
      return;
    }

    setIsUpdatingBank(true);
    setBankError(null);

    try {
      const response = await apiClient.post('/user/vendor/change-bank-details', {
        businessName: vendor.businessName,
        accountNumber: editAccountNumber,
        ifsc: editIfsc
      });

      if (response.data.success) {
        success('Bank details updated successfully!');
        setVendor(response.data.data);
        setIsEditingBank(false);
      }
    } catch (err: any) {
      console.error('Failed to update bank details', err);
      const msg = err.response?.data?.message || 'Failed to update bank details.';
      setBankError(msg);
      error(msg);
    } finally {
      setIsUpdatingBank(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
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

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="order-badge success">Completed</span>;
      case 'PROCESSING':
        return <span className="order-badge info">Processing</span>;
      case 'SCHEDULED':
        return <span className="order-badge pending">Pending</span>;
      case 'FAILED':
        return <span className="order-badge failed">Failed</span>;
      default:
        return <span className="order-badge pending">{status}</span>;
    }
  };

  // Heuristic matching helper: pairs payouts with their source transactions
  const getTransactionsForPayout = React.useCallback((payout: Payout) => {
    return transactions.filter(t => {
      // Exact ID link if present
      if ((t as any).payoutId === payout.id) return true;
      
      // Fallback matching: same vendor, successful status, matching amount, created within a 15-second block
      const pTime = new Date(payout.createdAt).getTime();
      const tTime = new Date(t.createdAt).getTime();
      const isSuccess = t.status === 'SUCCESS';
      const amountMatches = Math.abs(t.vendorAmount - payout.amount) < 0.01;
      const timeMatches = Math.abs(pTime - tTime) < 15000; // 15 seconds window
      
      return isSuccess && amountMatches && timeMatches;
    });
  }, [transactions]);

  // Filters logic for payouts
  const filteredPayouts = React.useMemo(() => {
    return payouts.filter(p => {
      // Filter by status
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'PENDING' && p.status !== 'SCHEDULED') return false;
        if (filterStatus !== 'PENDING' && p.status !== filterStatus) return false;
      }
      
      // Filter by date range
      const payoutDate = new Date(p.createdAt);
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        if (payoutDate < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        if (payoutDate > end) return false;
      }
      return true;
    });
  }, [payouts, filterStatus, filterStartDate, filterEndDate]);

  // --- REVENUE ANALYTICS ---
  const dailyEarnings = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return transactions
      .filter(t => t.status === 'SUCCESS' && new Date(t.createdAt) >= today)
      .reduce((sum, t) => sum + t.vendorAmount, 0);
  }, [transactions]);

  const weeklyEarnings = React.useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return transactions
      .filter(t => t.status === 'SUCCESS' && new Date(t.createdAt) >= sevenDaysAgo)
      .reduce((sum, t) => sum + t.vendorAmount, 0);
  }, [transactions]);

  const monthlyEarnings = React.useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return transactions
      .filter(t => t.status === 'SUCCESS' && new Date(t.createdAt) >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.vendorAmount, 0);
  }, [transactions]);

  const lifetimeEarnings = React.useMemo(() => {
    return transactions
      .filter(t => t.status === 'SUCCESS')
      .reduce((sum, t) => sum + t.vendorAmount, 0);
  }, [transactions]);

  // --- SUMMARY CARDS ---
  const pendingPayoutAmount = React.useMemo(() => {
    return payouts
      .filter(p => p.status === 'SCHEDULED' || p.status === 'PROCESSING')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payouts]);

  const nextPayoutDate = React.useMemo(() => {
    const upcoming = payouts
      .filter(p => p.status === 'SCHEDULED' || p.status === 'PROCESSING')
      .map(p => new Date(p.scheduledFor))
      .sort((a, b) => a.getTime() - b.getTime());
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [payouts]);

  const totalOrdersSold = React.useMemo(() => {
    return transactions.filter(t => t.status === 'SUCCESS').length;
  }, [transactions]);

  const totalCompletedPayouts = React.useMemo(() => {
    return payouts.filter(p => p.status === 'COMPLETED').length;
  }, [payouts]);

  const handleClearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterStatus('ALL');
  };

  if (isLoading) {
    return <Loader message="Accessing merchant profile..." />;
  }

  if (errorState) {
    return (
      <div className="unauthorized-page animate-fade-in">
        <div className="unauthorized-card" style={{ borderTop: '4px solid var(--color-error)' }}>
          <div className="unauthorized-icon-wrapper" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-error)' }}>
            <AlertCircle size={48} />
          </div>
          <h2 className="unauthorized-title" style={{ marginTop: '1rem' }}>Failed to Load Dashboard</h2>
          <p className="unauthorized-desc">{errorState}</p>
          <div className="unauthorized-actions" style={{ marginTop: '1.5rem' }}>
            <Button variant="primary" onClick={checkOnboardStatus}>
              Retry Loading
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render onboarding form if not onboarded
  if (!isOnboarded) {
    return (
      <div className="onboarding-page animate-fade-in">
        <div className="onboarding-container">
          <div className="onboarding-header">
            <div className="onboarding-icon">
              <Landmark size={32} />
            </div>
            <h2>Merchant Onboarding</h2>
            <p>
              Provide your business and settlement account coordinates to activate payout routing.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="onboarding-form card-layout">
            <Input
              label="Registered Business Name"
              type="text"
              placeholder="e.g. Acme Corporation"
              error={errors.businessName?.message}
              {...register('businessName')}
            />

            <Input
              label="Settlement Bank Account Number"
              type="text"
              placeholder="e.g. 987654321012"
              error={errors.accountNumber?.message}
              {...register('accountNumber')}
            />

            <Input
              label="Bank IFSC Code"
              type="text"
              placeholder="e.g. HDFC0001234"
              error={errors.ifsc?.message}
              {...register('ifsc')}
            />

            <Button
              type="submit"
              isLoading={isSubmitting}
              icon={<ArrowRight size={16} />}
              className="w-full mt-4"
            >
              Submit Onboarding Profile
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Render Dashboard if already onboarded
  return (
    <div className="vendor-dashboard animate-fade-in">
      <div className="dashboard-header-block">
        <div>
          <h1 className="page-heading">Merchant Portal</h1>
          <p className="page-subheading">
            Track business settlements, payout timelines, and platform compliance.
          </p>
        </div>
        
        {/* Verification Status Badge */}
        {vendor?.isApproved ? (
          <div className="status-approved-badge">
            <CheckCircle2 size={16} />
            <span>Approved Merchant</span>
          </div>
        ) : (
          <div className="status-pending-badge">
            <Hourglass size={16} className="animate-spin-slow" />
            <span>Pending Audit</span>
          </div>
        )}
      </div>

      {/* Warning if pending */}
      {!vendor?.isApproved && (
        <div className="status-warning-card">
          <ShieldAlert className="warning-icon" size={24} />
          <div className="warning-content">
            <h4>Merchant Profile Under Review</h4>
            <p>
              Your billing and payout channel registration is pending manual system audit. 
              Payout functions and transaction interfaces remain restricted until approved by an administrator.
            </p>
          </div>
        </div>
      )}

      {vendor?.isApproved && (
        <>
          {/* Revenue Analytics Deck */}
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-light)' }}>
            <TrendingUp size={20} /> Revenue Analytics
          </h2>
          <div className="dashboard-stats-grid" style={{ marginBottom: '2.5rem' }}>
            <div className="stats-card card-layout" style={{ borderLeft: '3px solid var(--color-primary-light)' }}>
              <div className="stats-card-icon bg-purple" style={{ width: '46px', height: '46px' }}>
                <DollarSign size={20} />
              </div>
              <div className="stats-card-data">
                <span className="stats-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(dailyEarnings)}</span>
                <span className="stats-label" style={{ fontSize: '0.75rem' }}>Daily Earnings</span>
              </div>
            </div>

            <div className="stats-card card-layout" style={{ borderLeft: '3px solid var(--color-info)' }}>
              <div className="stats-card-icon bg-cyan" style={{ width: '46px', height: '46px' }}>
                <TrendingUp size={20} />
              </div>
              <div className="stats-card-data">
                <span className="stats-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(weeklyEarnings)}</span>
                <span className="stats-label" style={{ fontSize: '0.75rem' }}>Weekly Earnings</span>
              </div>
            </div>

            <div className="stats-card card-layout" style={{ borderLeft: '3px solid var(--color-success)' }}>
              <div className="stats-card-icon bg-emerald" style={{ width: '46px', height: '46px' }}>
                <Calendar size={20} />
              </div>
              <div className="stats-card-data">
                <span className="stats-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(monthlyEarnings)}</span>
                <span className="stats-label" style={{ fontSize: '0.75rem' }}>Monthly Earnings</span>
              </div>
            </div>

            <div className="stats-card card-layout" style={{ borderLeft: '3px solid var(--color-primary)' }}>
              <div className="stats-card-icon bg-purple" style={{ width: '46px', height: '46px' }}>
                <Award size={20} />
              </div>
              <div className="stats-card-data">
                <span className="stats-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(lifetimeEarnings)}</span>
                <span className="stats-label" style={{ fontSize: '0.75rem' }}>Lifetime Earnings</span>
              </div>
            </div>
          </div>

          {/* Summary Cards Grid */}
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-light)' }}>
            <ListOrdered size={20} /> Settlement Summary
          </h2>
          <div className="dashboard-stats-grid" style={{ marginBottom: '2.5rem' }}>
            <div className="stats-card">
              <div className="stats-card-icon bg-purple">
                <DollarSign size={24} />
              </div>
              <div className="stats-card-data">
                <span className="stats-value">
                  {formatCurrency(lifetimeEarnings)}
                </span>
                <span className="stats-label">Total Earnings</span>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-icon bg-cyan">
                <Hourglass size={24} />
              </div>
              <div className="stats-card-data">
                <span className="stats-value">
                  {formatCurrency(pendingPayoutAmount)}
                </span>
                <span className="stats-label">Pending Payout Amount</span>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-icon bg-emerald">
                <Calendar size={24} />
              </div>
              <div className="stats-card-data">
                <span className="stats-value" style={{ fontSize: nextPayoutDate ? '1.25rem' : '1.5rem', lineHeight: '2rem' }}>
                  {nextPayoutDate ? nextPayoutDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </span>
                <span className="stats-label">Next Payout Date</span>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-icon bg-purple" style={{ background: 'var(--color-cyan-gradient)' }}>
                <ArrowUpRight size={24} />
              </div>
              <div className="stats-card-data">
                <span className="stats-value">{totalOrdersSold}</span>
                <span className="stats-label">Total Orders Sold</span>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-icon bg-emerald">
                <CheckCircle2 size={24} />
              </div>
              <div className="stats-card-data">
                <span className="stats-value">{totalCompletedPayouts}</span>
                <span className="stats-label">Total Completed Payouts</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Account Profile Details Section */}
      <div className="vendor-details-section">
        {/* Settlement Account Card */}
        <div className="details-card card-layout">
          <h3 className="details-card-title">
            <Landmark size={18} />
            <span>Settlement Account Details</span>
          </h3>
          
          <div className="details-grid">
            <div className="details-item">
              <span className="details-label">Business Name</span>
              <span className="details-value">{vendor?.businessName}</span>
            </div>
            
            <div className="details-item">
              <span className="details-label">Settlement Account</span>
              <span className="details-value code-font">
                •••• •••• {vendor?.bankAccount ? vendor.bankAccount.slice(-4) : '0000'}
              </span>
            </div>

            <div className="details-item">
              <span className="details-label">IFSC Code</span>
              <span className="details-value code-font">{vendor?.ifscCode}</span>
            </div>

            <div className="details-item">
              <span className="details-label">Registration Date</span>
              <span className="details-value">
                {vendor?.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditAccountNumber(vendor?.bankAccount || '');
                setEditIfsc(vendor?.ifscCode || '');
                setBankError(null);
                setIsEditingBank(true);
              }}
              icon={<Landmark size={14} />}
            >
              Update Details
            </Button>
          </div>
        </div>

        {/* Integration Credentials card */}
        <div className="details-card card-layout">
          <h3 className="details-card-title">
            <Award size={18} />
            <span>Merchant Integration API Keys</span>
          </h3>
          <p className="details-desc">
            Use these system credentials to connect FlowPay's checkout gateway to your application.
          </p>

          <div className="api-key-block">
            <div className="key-item">
              <span className="key-label">Merchant ID</span>
              <code className="key-code">{vendor?.id}</code>
            </div>
            <div className="key-item">
              <span className="key-label">Secret Webhook Key</span>
              <code className="key-code">whsec_••••••••••••••••••••••••</code>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Monitor, Payouts, & Products */}
      {vendor && (
        <div className="content-section mt-6 card-layout" style={{ background: 'var(--bg-surface)', padding: '2rem', marginTop: '2.5rem' }}>
          {/* Tab Navigation Headers */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '2rem' }}>
            {vendor?.isApproved && (
              <>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'analytics' ? '2px solid var(--color-primary-light)' : '2px solid transparent',
                    color: activeTab === 'analytics' ? '#fff' : 'var(--color-text-muted)',
                    padding: '8px 4px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <TrendingUp size={16} /> Overview
                </button>
                <button 
                  onClick={() => setActiveTab('sales')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'sales' ? '2px solid var(--color-primary-light)' : '2px solid transparent',
                    color: activeTab === 'sales' ? '#fff' : 'var(--color-text-muted)',
                    padding: '8px 4px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <History size={16} /> Recent Sales Log
                </button>
                <button 
                  onClick={() => setActiveTab('payouts')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'payouts' ? '2px solid var(--color-primary-light)' : '2px solid transparent',
                    color: activeTab === 'payouts' ? '#fff' : 'var(--color-text-muted)',
                    padding: '8px 4px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <CreditCard size={16} /> Payout History
                </button>
              </>
            )}
            <button 
              onClick={() => setActiveTab('products')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'products' ? '2px solid var(--color-primary-light)' : '2px solid transparent',
                color: activeTab === 'products' ? '#fff' : 'var(--color-text-muted)',
                padding: '8px 4px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Package size={16} /> My Products
            </button>
          </div>

          {/* ACTIVE TAB: ANALYTICS OVERVIEW */}
          {activeTab === 'analytics' && (
            <div className="animate-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                <div className="card-layout" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.01)' }}>
                  <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <History size={16} /> Latest Sales Activity
                  </h4>
                  {transactions.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No recent sales transactions recorded.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {transactions.slice(0, 5).map(t => (
                        <div 
                          key={t.id}
                          onClick={() => setSelectedTxn(t)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: 'var(--border-radius-sm)', background: 'rgba(255, 255, 255, 0.02)', cursor: 'pointer' }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-primary-light)', display: 'block' }}>
                              {t.product?.name || 'FlowPay Item'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {new Date(t.createdAt).toLocaleDateString()} • By {t.customer?.name || 'Customer'}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: t.status === 'SUCCESS' ? 'var(--color-success)' : 'inherit' }}>
                              {formatCurrency(t.vendorAmount)}
                            </span>
                            <span style={{ fontSize: '0.75rem' }}>{getStatusBadge(t.status)}</span>
                          </div>
                        </div>
                      ))}
                      {transactions.length > 5 && (
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('sales')} style={{ marginTop: '0.5rem' }}>
                          View All Sales
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="card-layout" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.01)' }}>
                  <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={16} /> Upcoming Settlement Estimates
                  </h4>
                  {payouts.filter(p => p.status === 'SCHEDULED' || p.status === 'PROCESSING').length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No pending or processing settlements scheduled.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {payouts
                        .filter(p => p.status === 'SCHEDULED' || p.status === 'PROCESSING')
                        .slice(0, 5)
                        .map(p => (
                          <div 
                            key={p.id}
                            onClick={() => setSelectedPayout(p)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: 'var(--border-radius-sm)', background: 'rgba(255, 255, 255, 0.02)', cursor: 'pointer' }}
                          >
                            <div>
                              <span className="code-font" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>
                                {p.id.substring(0, 13)}...
                              </span>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                Est. Date: {new Date(p.scheduledFor).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-success)' }}>
                                {formatCurrency(p.amount)}
                              </span>
                              <span style={{ fontSize: '0.75rem' }}>{getPayoutStatusBadge(p.status)}</span>
                            </div>
                          </div>
                        ))}
                      {payouts.filter(p => p.status === 'SCHEDULED' || p.status === 'PROCESSING').length > 5 && (
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('payouts')} style={{ marginTop: '0.5rem' }}>
                          View All Payouts
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE TAB: SALES LOGS */}
          {activeTab === 'sales' && (
            isTxnsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                <Loader message="Fetching sales log..." />
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-state-card" style={{ padding: '3rem 1rem' }}>
                <div className="empty-state-icon" style={{ width: '60px', height: '60px' }}>
                  <AlertCircle size={32} />
                </div>
                <h3>No Sales Yet</h3>
                <p>Your sales records and settlement details will populate here once customers begin checking out.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Product Name</th>
                      <th>Customer Name</th>
                      <th>Total Price</th>
                      <th>Platform Fee</th>
                      <th>Your Net Share</th>
                      <th>Status</th>
                      <th>Date & Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr 
                        key={txn.id}
                        onClick={() => setSelectedTxn(txn)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span className="code-font" style={{ fontSize: '0.8rem' }}>
                            {txn.id.substring(0, 8)}...
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--color-primary-light)' }}>
                            {txn.product?.name || 'FlowPay Item'}
                          </span>
                        </td>
                        <td>
                          <span>{txn.customer?.name || 'Customer'}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{formatCurrency(txn.totalAmount)}</span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>
                            -{formatCurrency(txn.platformFee)}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                            {formatCurrency(txn.vendorAmount)}
                          </span>
                        </td>
                        <td>
                          {getStatusBadge(txn.status)}
                        </td>
                        <td>
                          <span className="text-muted-class" style={{ fontSize: '0.85rem' }}>
                            {new Date(txn.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
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
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ACTIVE TAB: PAYOUT HISTORY */}
          {activeTab === 'payouts' && (
            isPayoutsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                <Loader message="Fetching payout history..." />
              </div>
            ) : (
              <div className="animate-fade-in">
                {/* Filter Controls block */}
                <div className="card-layout" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-light)', minWidth: '100%', marginBottom: '-8px' }}>
                    <Filter size={16} /> <span style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Settlement History</span>
                  </div>

                  <div className="input-group" style={{ flex: '1 1 200px' }}>
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Start Date</label>
                    <input 
                      type="date" 
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="input-field" 
                      style={{ padding: '8px 12px', fontSize: '0.875rem' }} 
                    />
                  </div>

                  <div className="input-group" style={{ flex: '1 1 200px' }}>
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>End Date</label>
                    <input 
                      type="date" 
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="input-field" 
                      style={{ padding: '8px 12px', fontSize: '0.875rem' }} 
                    />
                  </div>

                  <div className="input-group" style={{ flex: '1 1 200px' }}>
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Settlement Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="input-field select-field"
                      style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                    >
                      <option value="ALL">All Payout Statuses</option>
                      <option value="PENDING">Pending (Scheduled)</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="FAILED">Failed</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleClearFilters}
                      style={{ padding: '10px 16px', height: '42px' }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                {filteredPayouts.length === 0 ? (
                  <div className="empty-state-card" style={{ padding: '3.5rem 1rem' }}>
                    <div className="empty-state-icon" style={{ width: '60px', height: '60px' }}>
                      <AlertCircle size={32} />
                    </div>
                    <h3>No Settlements Match</h3>
                    <p>No payout history logs match the selected filter conditions. Try adjusting dates or selection filters.</p>
                    <Button variant="outline" size="sm" onClick={handleClearFilters} style={{ marginTop: '1rem' }}>
                      Clear Active Filters
                    </Button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Payout ID</th>
                          <th>Amount</th>
                          <th>Orders Included</th>
                          <th>Payout Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayouts.map((payout) => {
                          const ordersCount = getTransactionsForPayout(payout).length;
                          return (
                            <tr 
                              key={payout.id}
                              onClick={() => setSelectedPayout(payout)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td>
                                <span className="code-font" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                  {payout.id}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                                  {formatCurrency(payout.amount)}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="user-badge" style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#fff', fontSize: '0.8rem', border: 'none', padding: '3px 8px' }}>
                                  {ordersCount} {ordersCount === 1 ? 'Order' : 'Orders'}
                                </span>
                              </td>
                              <td>
                                <span className="text-muted-class" style={{ fontSize: '0.85rem' }}>
                                  {new Date(payout.scheduledFor).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </td>
                              <td>
                                {getPayoutStatusBadge(payout.status)}
                              </td>
                              <td>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPayout(payout);
                                  }}
                                  icon={<Eye size={12} />}
                                  style={{ padding: '4px 8px' }}
                                >
                                  Details
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          )}

          {/* ACTIVE TAB: PRODUCTS */}
          {activeTab === 'products' && (
            isProductsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                <Loader message="Fetching products list..." />
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="vendor-products-layout" style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5rem', alignItems: 'start' }}>
                  {/* Left Column: Add Product Form */}
                  <div className="card-layout" style={{ flex: '1 1 360px', maxWidth: '450px', padding: '1.75rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                      <Plus size={18} style={{ color: 'var(--color-primary-light)' }} /> Add New Product
                    </h3>
                    <p className="details-desc" style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                      Create a new product listing that will be available for customers to purchase.
                    </p>

                    {addProductError && (
                      <div style={{ color: 'var(--color-error)', background: 'rgba(244, 63, 94, 0.1)', padding: '10px 14px', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                        {addProductError}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <Input
                        label="Product Name"
                        type="text"
                        placeholder="e.g. Mechanical Keyboard"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                      />

                      <Input
                        label="Price (INR)"
                        type="number"
                        placeholder="e.g. 2999"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                      />

                      <Input
                        label="Image URL"
                        type="text"
                        placeholder="e.g. https://images.unsplash.com/... (valid image link)"
                        value={newProductImage}
                        onChange={(e) => setNewProductImage(e.target.value)}
                      />
                      
                      {/* Suggestions tips */}
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--color-info)' }}>Quick Unsplash Image URLs:</span>
                        <ul style={{ listStyleType: 'disc', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <li><button onClick={() => setNewProductImage('https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80')} style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Keyboard</button></li>
                          <li><button onClick={() => setNewProductImage('https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80')} style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Mouse</button></li>
                          <li><button onClick={() => setNewProductImage('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80')} style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Headphones</button></li>
                        </ul>
                      </div>
                    </div>

                    <div style={{ marginTop: '1.75rem' }}>
                      <Button 
                        variant="primary" 
                        onClick={handleAddProduct} 
                        isLoading={isSubmittingProduct}
                        className="w-full"
                      >
                        Create Product Listing
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Products Catalog */}
                  <div style={{ flex: '2 1 500px', minWidth: '320px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: 0, marginBottom: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={18} style={{ color: 'var(--color-primary-light)' }} /> Products Catalog
                    </h3>

                    {products.filter(p => p.vendorId === vendor?.id).length === 0 ? (
                      <div className="empty-state-card" style={{ padding: '3.5rem 1.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)' }}>
                        <div className="empty-state-icon" style={{ width: '60px', height: '60px' }}>
                          <AlertCircle size={32} />
                        </div>
                        <h3>No Products Added Yet</h3>
                        <p>You haven't listed any products on the marketplace yet. Use the creation form on the left to list your first item.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        {products
                          .filter(p => p.vendorId === vendor?.id)
                          .map((product) => (
                            <div key={product.id} className="card-layout hover-lift" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', height: '100%', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
                              <div style={{ position: 'relative', width: '100%', height: '160px', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', background: '#0e1526', marginBottom: '1rem' }}>
                                <img 
                                  src={product.image} 
                                  alt={product.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80';
                                  }}
                                />
                              </div>
                              
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{product.name}</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {product.description}
                                </span>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
                                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-success)' }}>
                                    {formatCurrency(product.price)}
                                  </span>
                                  <span className="code-font" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                    ID: {product.id.substring(0, 8)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Sale Transaction Details overlay panel */}
      {selectedTxn && (
        <div className="checkout-overlay">
          <div className="checkout-backdrop" onClick={() => setSelectedTxn(null)}></div>
          <div className="checkout-panel animate-slide-in" style={{ maxWidth: '460px' }}>
            <div className="checkout-panel-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} /> Sale Settlement Details
              </h3>
              <button className="close-checkout-btn" onClick={() => setSelectedTxn(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="checkout-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
              {/* Status Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="details-label">Settlement Status</span>
                  <div style={{ marginTop: '4px' }}>
                    {getStatusBadge(selectedTxn.status)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="details-label">Sale Date</span>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
                    {new Date(selectedTxn.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Settlement breakdown */}
              <div className="receipt-block">
                <span className="summary-label">Financial Share breakdown</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span className="text-muted-class">Customer Paid Price:</span>
                    <span>{formatCurrency(selectedTxn.totalAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span className="text-muted-class">Platform Fee (10%):</span>
                    <span style={{ color: 'var(--color-error)' }}>-{formatCurrency(selectedTxn.platformFee)}</span>
                  </div>
                </div>

                <div className="receipt-row" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  <span style={{ fontWeight: 700 }}>Your Net Payout Share:</span>
                  <span className="amount-highlight" style={{ color: 'var(--color-success)' }}>{formatCurrency(selectedTxn.vendorAmount)}</span>
                </div>
              </div>

              {/* Reference IDs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Reference Parameters
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div className="details-item" style={{ gridColumn: 'span 2' }}>
                    <span className="details-label">Internal Transaction ID</span>
                    <span className="code-font" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                      {selectedTxn.id}
                    </span>
                  </div>
                  
                  <div className="details-item">
                    <span className="details-label">Razorpay Order ID</span>
                    <span className="code-font" style={{ fontSize: '0.75rem' }}>
                      {selectedTxn.razorpayOrderId}
                    </span>
                  </div>

                  <div className="details-item">
                    <span className="details-label">Razorpay Payment ID</span>
                    <span className="code-font" style={{ fontSize: '0.75rem' }}>
                      {selectedTxn.razorpayPaymentId || 'UNASSIGNED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Purchased Product
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <div className="details-item">
                    <span className="details-label">Product Name</span>
                    <span className="details-value" style={{ color: 'var(--color-primary-light)' }}>
                      {selectedTxn.product?.name || 'FlowPay Item'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Customer Profile
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <div className="details-item">
                    <span className="details-label">Customer Name</span>
                    <span className="details-value">{selectedTxn.customer?.name || 'Customer'}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                <Button variant="primary" className="w-full" onClick={() => setSelectedTxn(null)}>
                  Close Logs
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Details Modal overlay */}
      {selectedPayout && (
        <div className="checkout-overlay">
          <div className="checkout-backdrop" onClick={() => setSelectedPayout(null)}></div>
          <div className="checkout-panel animate-slide-in" style={{ maxWidth: '780px', width: '90%' }}>
            <div className="checkout-panel-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} /> Payout Details
              </h3>
              <button className="close-checkout-btn" onClick={() => setSelectedPayout(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="checkout-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
              
              {/* Payout stats summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                <div>
                  <span className="details-label" style={{ fontSize: '0.7rem' }}>Payout ID</span>
                  <span className="code-font" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px', wordBreak: 'break-all' }}>
                    {selectedPayout.id}
                  </span>
                </div>
                <div>
                  <span className="details-label" style={{ fontSize: '0.7rem' }}>Payout Amount</span>
                  <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px' }}>
                    {formatCurrency(selectedPayout.amount)}
                  </span>
                </div>
                <div>
                  <span className="details-label" style={{ fontSize: '0.7rem' }}>Payout Status</span>
                  <div style={{ marginTop: '4px' }}>
                    {getPayoutStatusBadge(selectedPayout.status)}
                  </div>
                </div>
                <div>
                  <span className="details-label" style={{ fontSize: '0.7rem' }}>Payout Date</span>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
                    {new Date(selectedPayout.scheduledFor).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Transaction details / references */}
              <div className="card-layout" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '8px' }}>
                  Gateway Settlement Reference
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <span className="details-label" style={{ fontSize: '0.75rem' }}>Transaction Reference</span>
                    <span className="code-font" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-primary-light)', marginTop: '2px' }}>
                      {(selectedPayout as any).razorpayPayoutId || 'settle_ref_' + selectedPayout.id.substring(0, 10)}
                    </span>
                  </div>
                  <div>
                    <span className="details-label" style={{ fontSize: '0.75rem' }}>Settlement Account</span>
                    <span className="details-value" style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                      {vendor?.businessName} ({vendor?.ifscCode})
                    </span>
                  </div>
                </div>
              </div>

              {/* Orders included Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Orders Included In This Payout
                </h4>

                {getTransactionsForPayout(selectedPayout).length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>
                    No source transaction records found matching this payout timeline.
                  </p>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: '250px' }}>
                    <table className="data-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Product Name</th>
                          <th>Customer</th>
                          <th>Amount</th>
                          <th>Fee</th>
                          <th>Net Share</th>
                          <th>Order Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getTransactionsForPayout(selectedPayout).map((order) => (
                          <tr key={order.id}>
                            <td>
                              <span className="code-font" style={{ fontSize: '0.75rem' }}>
                                {order.id.substring(0, 8)}...
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--color-primary-light)' }}>
                                {order.product?.name || 'FlowPay Item'}
                              </span>
                            </td>
                            <td>
                              <span>{order.customer?.name || 'Customer'}</span>
                            </td>
                            <td>
                              <span>{formatCurrency(order.totalAmount)}</span>
                            </td>
                            <td>
                              <span style={{ color: 'var(--color-error)' }}>
                                -{formatCurrency(order.platformFee)}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                {formatCurrency(order.vendorAmount)}
                              </span>
                            </td>
                            <td>
                              <span className="text-muted-class">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Close Panel Button */}
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', gap: '12px' }}>
                <Button variant="outline" onClick={() => setSelectedPayout(null)} style={{ flex: 1 }}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Bank Details Modal overlay */}
      {isEditingBank && (
        <div className="checkout-overlay">
          <div className="checkout-backdrop" onClick={() => setIsEditingBank(false)}></div>
          <div className="checkout-panel animate-slide-in" style={{ maxWidth: '460px' }}>
            <div className="checkout-panel-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Landmark size={18} /> Update Settlement Account
              </h3>
              <button className="close-checkout-btn" onClick={() => setIsEditingBank(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="checkout-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <p className="details-desc">
                Update your bank account number and IFSC code for future payouts.
              </p>

              {bankError && (
                <div style={{ color: 'var(--color-error)', background: 'rgba(244, 63, 94, 0.1)', padding: '10px', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' }}>
                  {bankError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <Input
                  label="Settlement Bank Account Number"
                  type="text"
                  placeholder="e.g. 987654321012"
                  value={editAccountNumber}
                  onChange={(e) => setEditAccountNumber(e.target.value)}
                />

                <Input
                  label="Bank IFSC Code"
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={editIfsc}
                  onChange={(e) => setEditIfsc(e.target.value)}
                />
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', gap: '12px' }}>
                <Button variant="outline" onClick={() => setIsEditingBank(false)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleUpdateBankDetails} 
                  isLoading={isUpdatingBank}
                  style={{ flex: 1 }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
