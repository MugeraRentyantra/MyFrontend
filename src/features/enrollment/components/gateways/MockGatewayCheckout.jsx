import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Modal, toast } from '@/shared/components/ui';
import { completeMockPayment } from '@/services/paymentService';
import { APP_NAME } from '@/shared/constants';
import { AlertTriangle, GraduationCap, Hourglass, Lock, XCircle } from '@/shared/icons';
import { getErrorMessage } from '@/shared/utils/errors';
import { formatMoney } from '@/shared/utils/helpers';
import { planLabel } from '../../utils/plans';

export const MOCK_OUTCOME = Object.freeze({
  SUCCESS: 'success',
  FAILURE: 'failure',
  PENDING: 'pending',
});

const BUSY_MESSAGES = {
  [MOCK_OUTCOME.SUCCESS]: 'Sending a successful payment…',
  [MOCK_OUTCOME.FAILURE]: 'Sending a failed payment…',
  [MOCK_OUTCOME.PENDING]: 'Sending a slow confirmation…',
};

/**
 * Stand-in for the payment provider's checkout (development and demos). It is clearly marked as
 * test mode. Choosing an outcome asks the mock server to simulate the provider's signed webhook
 * (POST /payments/mock/complete); the page then goes to the status screen, which waits for the
 * server-side confirmation exactly as it would with a real gateway.
 *
 * Adapter props (shared with every gateway): { order, enrollment, user, open, onClose, onComplete }.
 */
export function MockGatewayCheckout({ order, enrollment, user, open, onClose, onComplete }) {
  const payButtonRef = useRef(null);
  const [outcome, setOutcome] = useState(null);
  const [done, setDone] = useState(false);
  const complete = useMutation({ mutationFn: completeMockPayment });
  // Stay locked after an outcome was sent, while the page moves on to the status screen.
  const busy = complete.isPending || done;

  if (!order) return null;

  const data = order.checkoutData ?? {};
  const amountText = formatMoney(order.amount, order.currency);
  const merchant = data.name ?? data.merchantName ?? APP_NAME;
  const description = data.description ?? (planLabel(enrollment?.plan) || 'Internship enrollment');
  const payerName = data.prefill?.name ?? user?.name ?? '—';
  const payerEmail = data.prefill?.email ?? user?.email ?? '';

  const handleOutcome = (nextOutcome) => {
    setOutcome(nextOutcome);
    complete.mutate(
      { orderId: order.orderId, outcome: nextOutcome },
      {
        onSuccess: () => {
          setDone(true);
          onComplete?.(nextOutcome);
        },
        onError: (error) => {
          setOutcome(null);
          toast.error("The test payment couldn't be sent", { description: getErrorMessage(error) });
        },
      },
    );
  };

  const handleClose = () => {
    if (!busy) onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Test mode — mock payment gateway"
      description="This stands in for the real payment provider. No real money is charged."
      size="md"
      closeOnOverlayClick={!busy}
      hideCloseButton={busy}
      initialFocusRef={payButtonRef}
      footer={
        <Button variant="ghost" onClick={handleClose} disabled={busy}>
          Cancel
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Test mode.</span> Pick the bank&apos;s response to
            simulate. Your enrollment is only activated after the server confirms it.
          </span>
        </p>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white"
              aria-hidden="true"
            >
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{merchant}</p>
              <p className="truncate text-xs text-slate-500">{description}</p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Amount</dt>
              <dd className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">
                {amountText}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-slate-500">Order ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-700">{order.orderId}</dd>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">Paying as</dt>
              <dd className="mt-0.5 text-slate-900">
                {payerName}
                {payerEmail ? <span className="block break-all text-slate-500">{payerEmail}</span> : null}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-2">
          <Button
            ref={payButtonRef}
            fullWidth
            size="lg"
            leftIcon={Lock}
            loading={busy && outcome === MOCK_OUTCOME.SUCCESS}
            disabled={busy}
            onClick={() => handleOutcome(MOCK_OUTCOME.SUCCESS)}
          >
            Pay {amountText}
          </Button>
          <Button
            fullWidth
            variant="outline"
            leftIcon={XCircle}
            loading={busy && outcome === MOCK_OUTCOME.FAILURE}
            disabled={busy}
            onClick={() => handleOutcome(MOCK_OUTCOME.FAILURE)}
          >
            Simulate failure
          </Button>
          <Button
            fullWidth
            variant="outline"
            leftIcon={Hourglass}
            loading={busy && outcome === MOCK_OUTCOME.PENDING}
            disabled={busy}
            onClick={() => handleOutcome(MOCK_OUTCOME.PENDING)}
          >
            Simulate slow confirmation
          </Button>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {busy && outcome ? BUSY_MESSAGES[outcome] : ''}
        </p>
      </div>
    </Modal>
  );
}

export default MockGatewayCheckout;
