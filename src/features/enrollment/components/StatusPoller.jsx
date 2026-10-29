import { Loader2, WifiOff } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

/**
 * The "waiting for the bank" state of /payment/status (SN9) while usePaymentStatus polls the
 * enrollment. Status text is announced politely to screen readers; after 15 seconds it adds
 * "This is taking longer than usual."
 */
export function StatusPoller({ isSlow = false, connectionIssue = false, orderId, className }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-card sm:px-10 sm:py-12',
        className,
      )}
    >
      <span className="relative mx-auto flex h-16 w-16 items-center justify-center" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-brand-100 motion-safe:animate-ping [animation-duration:2.4s]" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-100">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </span>
      </span>

      <h2 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">
        Confirming your payment…
      </h2>

      <div role="status" aria-live="polite" className="mx-auto mt-3 max-w-md space-y-3 text-sm text-slate-600">
        <p>
          Please keep this page open. A redirect from the payment page is not proof of payment — we
          wait for the bank&apos;s confirmation.
        </p>
        {isSlow ? (
          <p className="font-medium text-amber-800">This is taking longer than usual.</p>
        ) : null}
        {connectionIssue ? (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            Trouble reaching the server — still trying.
          </p>
        ) : null}
      </div>

      {orderId ? (
        <p className="mt-6 text-xs text-slate-500">
          Order ID <span className="break-all font-mono text-slate-700">{orderId}</span>
        </p>
      ) : null}
    </div>
  );
}

export default StatusPoller;
