declare global {
  interface Window {
    Razorpay?: any;
  }
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

export interface RazorpayPaymentOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: RazorpayPrefill;
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
}

/**
 * Dynamically loads the Razorpay checkout script if it is not already loaded.
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Opens the Razorpay payment modal with the given options.
 */
export const openRazorpayPayment = (options: RazorpayPaymentOptions): void => {
  if (!window.Razorpay) {
    throw new Error('Razorpay SDK is not loaded. Please ensure loadRazorpayScript resolves successfully before invoking payment.');
  }
  const rzp = new window.Razorpay(options);
  
  // Attach ondismiss listener if provided in modal property
  if (options.modal?.ondismiss) {
    rzp.on('payment.failed', () => {
      // This can catch modal closure or failure
    });
  }
  
  rzp.open();
};
