import { ROLES } from '@/shared/constants';
import {
  completeMockPayment,
  createPaymentOrder,
  findEnrollment,
  findPaymentByOrderId,
  orderResponseDto,
} from '../services';
import {
  created,
  forbidden,
  json,
  mock,
  notFound,
  readJson,
  requireAuth,
  validationError,
} from '../utils';

/**
 * Payments (SD7, SD8) — docs/API_CONTRACT.md. services.createPaymentOrder takes the amount from the
 * enrollment's price snapshot and enforces 403 EMAIL_NOT_VERIFIED, 422 TERMS_NOT_ACCEPTED and
 * 409 INVALID_TRANSITION. /payments/mock/complete stands in for the provider's signed webhook:
 * only it (never the browser redirect) changes the payment and enrollment state.
 */

const MOCK_OUTCOMES = ['success', 'failure', 'pending'];

function readId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export const paymentHandlers = [
  mock.post('/payments/orders', async ({ request }) => {
    const auth = requireAuth(request, [ROLES.STUDENT]);
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await readJson(request);
    const enrollmentId = readId(body.enrollmentId);
    if (!enrollmentId) {
      return validationError([{ field: 'enrollmentId', message: 'Enrollment is required.' }]);
    }

    const enrollment = findEnrollment(enrollmentId);
    if (!enrollment) return notFound('Enrollment');
    if (enrollment.userId !== user._id) {
      return forbidden('You can only pay for your own enrollments.');
    }

    const payment = createPaymentOrder({ user, enrollment });
    return created(orderResponseDto(payment, user, enrollment));
  }),

  mock.post('/payments/mock/complete', async ({ request }) => {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const body = await readJson(request);
    const orderId = readId(body.orderId);
    const outcome = String(body.outcome ?? '')
      .trim()
      .toLowerCase();
    const details = [];
    if (!orderId) details.push({ field: 'orderId', message: 'Order id is required.' });
    if (!MOCK_OUTCOMES.includes(outcome)) {
      details.push({ field: 'outcome', message: 'Outcome must be success, failure or pending.' });
    }
    if (details.length) return validationError(details);

    const payment = findPaymentByOrderId(orderId);
    if (!payment) return notFound('Payment order');
    if (payment.userId !== auth.user._id) {
      return forbidden('You can only complete your own payments.');
    }

    // Idempotent: a replayed outcome is acknowledged without changing anything.
    const result = completeMockPayment({ orderId, outcome });
    return json({ status: result?.status ?? payment.status });
  }),

  // Server-to-server in production (signed by the provider); acknowledged here.
  mock.post('/payments/webhooks/:provider', () => json({ received: true })),
];

export default paymentHandlers;
