import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/shared/constants';
import { getGatewayAdapter } from './gateways/registry';

/**
 * Opens the checkout for a server-created payment order (SN9, SD7) with the adapter registered for
 * `order.provider` (mock | razorpay; mock by default). When the checkout reports it is done, the
 * student goes to /payment/status — like a gateway redirect, which is never proof of payment: that
 * page waits for the server to confirm.
 */
export function GatewayCheckout({ order, enrollment, user, open, onClose }) {
  const navigate = useNavigate();
  const enrollmentId = enrollment?._id;
  const orderId = order?.orderId;

  const handleComplete = useCallback(() => {
    if (!enrollmentId) return;
    navigate(paths.paymentStatus({ enrollmentId, orderId }));
  }, [navigate, enrollmentId, orderId]);

  if (!order) return null;
  const Adapter = getGatewayAdapter(order.provider);

  return (
    <Adapter
      order={order}
      enrollment={enrollment}
      user={user}
      open={open}
      onClose={onClose}
      onComplete={handleComplete}
    />
  );
}

export default GatewayCheckout;
