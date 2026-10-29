import { useId } from 'react';
import { Badge, Button, Card } from '@/shared/components/ui';
import { BadgeCheck, Lock, ShieldCheck, Zap } from '@/shared/icons';
import { formatMoney } from '@/shared/utils/helpers';

/**
 * The pay call-to-action on /payment/:enrollmentId (SN9). Shows the server's payable amount and a
 * "Pay ₹X" (or "Retry payment") button; `blockedReason` explains why paying is disabled.
 */
export function PayPanel({
  amount,
  currency = 'INR',
  isRetry = false,
  canPay = true,
  blockedReason,
  loading = false,
  onPay,
  isTestMode = false,
  className,
}) {
  const hintId = useId();
  const amountText = formatMoney(amount, currency);

  return (
    <Card padding="lg" className={className}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">Total payable</p>
        {isTestMode ? (
          <Badge variant="warning" icon={Zap}>
            Test mode
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{amountText}</p>
      <p className="mt-1 text-xs text-slate-500">Locked price, charged in {currency}.</p>

      <Button
        className="mt-5"
        fullWidth
        size="lg"
        leftIcon={Lock}
        loading={loading}
        disabled={!canPay}
        onClick={onPay}
        aria-describedby={blockedReason ? hintId : undefined}
      >
        {isRetry ? 'Retry payment' : `Pay ${amountText}`}
      </Button>
      {blockedReason ? (
        <p id={hintId} className="mt-2 text-center text-xs text-slate-500">
          {blockedReason}
        </p>
      ) : null}

      <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
        <li className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          Payments are handled by our payment partner. We never see or store your card or UPI
          details.
        </li>
        <li className="flex gap-2">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          Your internship starts only after the bank confirms the payment — usually within seconds.
        </li>
      </ul>
    </Card>
  );
}

export default PayPanel;
