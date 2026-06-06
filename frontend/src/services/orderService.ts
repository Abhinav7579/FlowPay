import apiClient from '../api/client';
import type { Transaction } from '../types';

export interface CreateOrderResponse {
  orderId: string;
}

export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
}

export const orderService = {
  createOrder: async (productId: string): Promise<CreateOrderResponse> => {
    const response = await apiClient.post<CreateOrderResponse>('/orders/create', { productId });
    return response.data;
  },

  verifyPayment: async (data: VerifyPaymentPayload): Promise<VerifyPaymentResponse> => {
    const response = await apiClient.post<VerifyPaymentResponse>('/orders/verify', data);
    return response.data;
  },

  getMyOrders: async (): Promise<Transaction[]> => {
    const response = await apiClient.get<Transaction[]>('/orders/my-orders');
    return response.data;
  },

  getPaymentById: async (id: string): Promise<Transaction> => {
    const response = await apiClient.get<Transaction>(`/payments/${id}`);
    return response.data;
  },
};
