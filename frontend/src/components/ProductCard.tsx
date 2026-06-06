import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { orderService } from '../services/orderService';
import { loadRazorpayScript, openRazorpayPayment } from '../utils/razorpay';
import type { Product } from '../types';
import Button from './Button';
import { CreditCard, Landmark } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isAuthenticated, user } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Ensure Razorpay script is loaded dynamically
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        showErrorToast('Failed to load Razorpay checkout script.');
        setIsProcessing(false);
        return;
      }

      // 2. Send POST request to backend Create Order API
      const { orderId } = await orderService.createOrder(product.id);

      // 3. Obtain Razorpay key
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_StWsvecjIRosiv';

      // 4. Configure Razorpay options
      const options = {
        key: keyId,
        amount: product.price * 100, // paise
        currency: 'INR',
        name: product.name,
        description: `Purchase of ${product.name}`,
        order_id: orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            await orderService.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            showSuccessToast(`Successfully purchased ${product.name}! Payment ID: ${response.razorpay_payment_id}`);
            navigate('/payment-status', {
              state: {
                status: 'SUCCESS',
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                amount: product.price,
                date: new Date().toISOString(),
                productName: product.name,
              }
            });
          } catch (err: any) {
            console.error('Payment verification failed', err);
            showErrorToast(err.response?.data?.message || 'Payment signature verification failed.');
            navigate('/payment-status', {
              state: {
                status: 'FAILED',
                paymentId: response.razorpay_payment_id || '',
                orderId: response.razorpay_order_id || orderId,
                amount: product.price,
                date: new Date().toISOString(),
                productName: product.name,
                message: err.response?.data?.message || 'Payment signature verification failed.',
              }
            });
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            showErrorToast('Payment cancelled.');
            navigate('/payment-status', {
              state: {
                status: 'FAILED',
                paymentId: '',
                orderId: orderId,
                amount: product.price,
                date: new Date().toISOString(),
                productName: product.name,
                message: 'Payment failed or cancelled',
              }
            });
          },
        },
        theme: {
          color: '#8b5cf6',
        },
      };

      // 5. Open Razorpay payment popup
      openRazorpayPayment(options);
    } catch (err: any) {
      console.error('Payment initialization failed', err);
      showErrorToast(err.response?.data?.message || 'Failed to initialize payment gateway.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="product-card card-layout animate-fade-in">
      {/* Product Image Cover */}
      <div className="product-card-image-wrapper">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="product-card-image"
            onError={(e) => {
              // Fallback image in case the URL fails or unsplash rate limits
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=600&auto=format&fit=crop';
            }}
          />
        ) : (
          <div className="product-card-placeholder">
            <span className="text-muted-class">No Image Available</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="product-card-body">
        {/* Vendor tag / Badge */}
        <div className="product-card-vendor">
          <Landmark size={12} className="vendor-icon" />
          <span>{product.vendorName || 'FlowPay Partner'}</span>
        </div>

        {/* Product Title */}
        <h3 className="product-name" title={product.name}>
          {product.name}
        </h3>

        {/* Short Description */}
        <p className="product-desc">
          {product.description || 'Premium grade merchant hardware or digital licensing.'}
        </p>

        {/* Footer info: price and buy now */}
        <div className="product-footer">
          <div className="price-container">
            <span className="price-currency">₹</span>
            <span className="product-price">{product.price.toLocaleString('en-IN')}</span>
          </div>
          
          <Button
            variant="primary"
            onClick={handleBuyNow}
            disabled={isProcessing}
            isLoading={isProcessing}
            icon={<CreditCard size={16} />}
            size="sm"
          >
            {isProcessing ? 'Processing...' : 'Pay Now'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
