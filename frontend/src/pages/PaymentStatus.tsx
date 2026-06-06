import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowLeft, Calendar, CreditCard, DollarSign, Hash, ShoppingBag } from 'lucide-react';
import Button from '../components/Button';
import Loader from '../components/Loader';
import { orderService } from '../services/orderService';
import { useToast } from '../context/ToastContext';

const PaymentStatus: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error: showErrorToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    status: 'SUCCESS' | 'FAILED';
    paymentId: string;
    orderId: string;
    amount: number;
    date: string;
    productName?: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    // 1. Check if we have state from React Router redirect
    const state = location.state as any;
    
    if (state && (state.status || state.orderId)) {
      setPaymentDetails({
        status: state.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        paymentId: state.paymentId || '',
        orderId: state.orderId || '',
        amount: state.amount || 0,
        date: state.date || new Date().toISOString(),
        productName: state.productName || 'FlowPay Item',
        message: state.message || '',
      });
      return;
    }

    // 2. Check if we have query params
    const qStatus = searchParams.get('status');
    const qPaymentId = searchParams.get('paymentId') || searchParams.get('payment_id');
    const qOrderId = searchParams.get('orderId') || searchParams.get('order_id');
    const qAmount = searchParams.get('amount');
    const qDate = searchParams.get('date');
    const qProductName = searchParams.get('productName');

    if (qStatus && qOrderId) {
      setPaymentDetails({
        status: qStatus.toUpperCase() === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        paymentId: qPaymentId || '',
        orderId: qOrderId || '',
        amount: qAmount ? parseFloat(qAmount) : 0,
        date: qDate || new Date().toISOString(),
        productName: qProductName || 'FlowPay Item',
        message: qStatus.toUpperCase() === 'SUCCESS' ? 'Payment completed successfully' : 'Payment failed or cancelled',
      });
      return;
    }

    // 3. If we only have orderId or paymentId in query params, fetch from backend API
    const lookupId = qOrderId || qPaymentId || searchParams.get('id');
    if (lookupId) {
      const fetchPayment = async () => {
        setLoading(true);
        try {
          const tx = await orderService.getPaymentById(lookupId);
          setPaymentDetails({
            status: tx.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
            paymentId: tx.razorpayPaymentId || '',
            orderId: tx.razorpayOrderId || '',
            amount: tx.totalAmount,
            date: tx.createdAt,
            productName: tx.product?.name || 'FlowPay Item',
            message: tx.status === 'SUCCESS' ? 'Payment completed successfully' : 'Payment failed or cancelled',
          });
        } catch (err: any) {
          console.error('Error fetching payment status:', err);
          showErrorToast('Failed to fetch payment details.');
        } finally {
          setLoading(false);
        }
      };
      fetchPayment();
    }
  }, [location.state, searchParams, showErrorToast]);

  if (loading) {
    return <Loader fullPage message="Fetching payment details..." />;
  }

  // If no state or query params exist
  if (!paymentDetails) {
    return (
      <div className="payment-status-page flex-center flex-column">
        <div className="payment-status-card card-layout text-center">
          <XCircle className="text-error-class mb-4" size={64} style={{ color: 'var(--color-error)' }} />
          <h2 className="page-heading border-none mb-4" style={{ background: 'none', WebkitTextFillColor: 'unset' }}>No Payment Info Found</h2>
          <p className="text-muted-class mb-6">
            We couldn't retrieve any payment information for this session. Please return to the shop.
          </p>
          <Button variant="primary" icon={<ShoppingBag size={16} />} onClick={() => navigate('/shop')}>
            Back to Shop
          </Button>
        </div>
      </div>
    );
  }

  const isSuccess = paymentDetails.status === 'SUCCESS';

  return (
    <div className="payment-status-page flex-center flex-column animate-fade-in">
      <div className="payment-status-card card-layout">
        <div className="status-header text-center">
          <div className="status-icon-wrapper">
            {isSuccess ? (
              <CheckCircle2 className="status-icon text-success" size={72} style={{ color: 'var(--color-success)', margin: '0 auto 1rem' }} />
            ) : (
              <XCircle className="status-icon text-danger" size={72} style={{ color: 'var(--color-error)', margin: '0 auto 1rem' }} />
            )}
          </div>
          <h2 
            className="status-title" 
            style={{ 
              color: isSuccess ? 'var(--color-success)' : 'var(--color-error)',
              fontSize: '2rem',
              fontWeight: 800,
              marginBottom: '0.5rem'
            }}
          >
            {isSuccess ? 'Payment Successful' : 'Payment Failed'}
          </h2>
          <p className="status-message" style={{ color: 'var(--color-text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
            {isSuccess ? 'Payment completed successfully' : 'Payment failed or cancelled'}
          </p>
        </div>

        <hr className="divider" style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

        <div className="status-details" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {paymentDetails.productName && (
            <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="detail-label" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={16} /> Product
              </span>
              <span className="detail-value font-bold" style={{ color: 'var(--color-text-main)' }}>{paymentDetails.productName}</span>
            </div>
          )}

          <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="detail-label" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={16} /> Amount Paid
            </span>
            <span className="detail-value font-bold" style={{ color: isSuccess ? 'var(--color-success)' : 'var(--color-error)', fontSize: '1.2rem' }}>
              ₹{paymentDetails.amount.toLocaleString('en-IN')}
            </span>
          </div>

          {paymentDetails.paymentId && (
            <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="detail-label" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={16} /> Payment ID
              </span>
              <span className="detail-value code-value" style={{ fontFamily: 'monospace', color: 'var(--color-text-main)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>{paymentDetails.paymentId}</span>
            </div>
          )}

          {paymentDetails.orderId && (
            <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="detail-label" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hash size={16} /> Order ID
              </span>
              <span className="detail-value code-value" style={{ fontFamily: 'monospace', color: 'var(--color-text-main)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>{paymentDetails.orderId}</span>
            </div>
          )}

          <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="detail-label" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} /> Date & Time
            </span>
            <span className="detail-value" style={{ color: 'var(--color-text-main)' }}>
              {new Date(paymentDetails.date).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>

          {paymentDetails.message && !isSuccess && (
            <div className="error-reason-box" style={{ marginTop: '0.5rem', padding: '12px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '8px', fontSize: '0.9rem' }}>
              <span className="error-reason-label" style={{ color: 'var(--color-error)', fontWeight: 600, marginRight: '8px' }}>Reason:</span>
              <span className="error-reason-text" style={{ color: 'var(--color-text-main)' }}>{paymentDetails.message}</span>
            </div>
          )}
        </div>

        <div className="status-actions">
          <Button
            variant="primary"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/shop')}
            className="w-full"
          >
            Back to Shop
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;
