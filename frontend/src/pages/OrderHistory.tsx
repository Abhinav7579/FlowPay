import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { orderService } from '../services/orderService';
import type { Transaction } from '../types';
import Button from '../components/Button';
import Loader from '../components/Loader';
import { useToast } from '../context/ToastContext';

const OrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { error: showErrorToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderService.getMyOrders();
        // Sort orders by purchase date descending
        const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(sorted);
      } catch (err: any) {
        console.error('Failed to fetch orders', err);
        showErrorToast('Failed to load your order history.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [showErrorToast]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'order-badge success';
      case 'FAILED':
        return 'order-badge failed';
      case 'PENDING':
        return 'order-badge pending';
      case 'REFUNDED':
        return 'order-badge refunded';
      default:
        return 'order-badge';
    }
  };

  if (loading) {
    return <Loader fullPage message="Loading orders..." />;
  }

  return (
    <div className="order-history-page animate-fade-in">
      <div className="dashboard-header-block">
        <div>
          <h1 className="page-heading">Order History</h1>
          <p className="page-subheading">Manage and track your payments and purchases</p>
        </div>
        <Button variant="outline" icon={<ShoppingBag size={16} />} onClick={() => navigate('/shop')}>
          Back to Shop
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="order-history-empty animate-fade-in">
          <ShoppingCart size={64} className="text-muted-class mb-4" style={{ color: 'var(--color-text-muted)' }} />
          <h2 className="mb-2" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>No orders found</h2>
          <p className="text-muted-class mb-6">
            You haven't made any purchases yet. Head over to our shop to get started!
          </p>
          <Button variant="primary" icon={<ShoppingBag size={16} />} onClick={() => navigate('/shop')}>
            Browse Products
          </Button>
        </div>
      ) : (
        <div className="order-history-container">
          {/* Desktop Table View */}
          <div className="order-table-wrapper">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Order Details</th>
                  <th>Purchase Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="order-product-cell">
                        <img
                          src={order.product?.image || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=100&auto=format&fit=crop'}
                          alt={order.product?.name || 'Product'}
                          className="order-product-image"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=100&auto=format&fit=crop';
                          }}
                        />
                        <div className="order-product-info">
                          <span className="order-product-name">{order.product?.name || 'FlowPay Item'}</span>
                          <span className="order-product-vendor">FlowPay Partner</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-bold" style={{ color: order.status === 'SUCCESS' ? 'var(--color-success)' : 'var(--color-text-main)' }}>
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(order.status)}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <div className="order-id-block">
                        <div className="order-id-row">
                          <span className="order-id-label">Order ID</span>
                          <span style={{ fontFamily: 'monospace' }}>{order.razorpayOrderId}</span>
                        </div>
                        {order.razorpayPaymentId && (
                          <div className="order-id-row">
                            <span className="order-id-label">Payment ID</span>
                            <span style={{ fontFamily: 'monospace' }}>{order.razorpayPaymentId}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          dateStyle: 'medium',
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="order-history-grid">
            {orders.map((order) => (
              <div key={order.id} className="order-card-view">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={order.product?.image || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=100&auto=format&fit=crop'}
                    alt={order.product?.name || 'Product'}
                    className="order-product-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=100&auto=format&fit=crop';
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span className="order-product-name" style={{ fontSize: '1rem' }}>{order.product?.name || 'FlowPay Item'}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </div>
                  <span className={getStatusBadgeClass(order.status)}>
                    {order.status}
                  </span>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Amount</span>
                    <span className="font-bold">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Order ID</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '3px', color: 'var(--color-text-main)' }}>{order.razorpayOrderId}</span>
                    </div>
                    {order.razorpayPaymentId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Payment ID</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '3px', color: 'var(--color-text-main)' }}>{order.razorpayPaymentId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
