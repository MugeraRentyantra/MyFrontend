import { MockGatewayCheckout } from './MockGatewayCheckout';
import { RazorpayCheckout } from './RazorpayCheckout';

/**
 * Checkout adapters by `order.provider` (from POST /payments/orders). Each adapter takes
 * { order, enrollment, user, open, onClose, onComplete } and must only report that the checkout
 * finished: confirming the payment is always the server's job (webhook → enrollment status).
 * Add a provider here to support a new gateway.
 */
export const GATEWAY_ADAPTERS = Object.freeze({
  mock: MockGatewayCheckout,
  razorpay: RazorpayCheckout,
});

export const DEFAULT_GATEWAY = 'mock';

export function getGatewayAdapter(provider) {
  const key = String(provider ?? '').trim().toLowerCase();
  return GATEWAY_ADAPTERS[key] ?? GATEWAY_ADAPTERS[DEFAULT_GATEWAY];
}
