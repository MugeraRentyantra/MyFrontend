import { useMutation } from '@tanstack/react-query';
import { createOrder } from '@/services/paymentService';

/**
 * Creates a gateway order for an enrollment (SD7): mutate(enrollmentId) resolves to
 * { paymentId, orderId, provider, amount, currency, status, checkoutData }.
 * The amount is always the server's (from the enrollment's price snapshot). Every call creates a
 * new order, so "Retry payment" never reuses a failed one.
 */
export function useCreateOrder() {
  return useMutation({
    mutationFn: (enrollmentId) => createOrder(enrollmentId),
  });
}

export default useCreateOrder;
