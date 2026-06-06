export type UserRole = 'ADMIN' | 'VENDOR' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  bankAccount: string;
  ifscCode: string;
  isApproved: boolean;
  totalEarnings: number;
  pendingPayout: number;
  createdAt: string;
  user?: User;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  vendorId: string;
  createdAt: string;
  description: string;
  vendorName: string;
}

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'FLAGGED';

export interface Transaction {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  customerId: string;
  vendorId: string;
  productId: string;
  totalAmount: number;
  platformFee: number;
  vendorAmount: number;
  status: TransactionStatus;
  isFlagged: boolean;
  flagReason?: string;
  createdAt: string;
  customer?: User;
  vendor?: Vendor;
  product?: Product;
}

export type PayoutStatus = 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Payout {
  id: string;
  vendorId: string;
  amount: number;
  status: PayoutStatus;
  scheduledFor: string;
  processedAt?: string;
  createdAt: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}
