import { api } from './api';

/**
 * Payments (SD7, SD8). The amount is always taken from the enrollment's price snapshot on
 * the server; the browser only asks for an order and opens the gateway checkout.
 */
export const createOrder = (enrollmentId) => api.post('/payments/orders', { enrollmentId });

/**
 * Mock gateway only: simulates the provider's signed webhook.
 * outcome: 'success' | 'failure' | 'pending'
 */
export const completeMockPayment = ({ orderId, outcome }) =>
  api.post('/payments/mock/complete', { orderId, outcome });
