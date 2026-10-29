import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { ENROLLMENT_TYPE, ROUTES, SUPPORT_EMAIL, paths } from '@/shared/constants';
import {
  ArrowRight,
  Ban,
  CalendarDays,
  Hourglass,
  LayoutDashboard,
  LifeBuoy,
  PartyPopper,
  RefreshCw,
  Users,
  XCircle,
} from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDateTime, formatMoney } from '@/shared/utils/helpers';
import { planLabel } from '../utils/plans';

function supportHref(orderId) {
  const subject = orderId ? `Payment for order ${orderId}` : 'Payment question';
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** Moves focus to the outcome heading when the panel appears, so the change is announced. */
function useFocusOnMount() {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

const TONES = {
  success: { ring: 'border-emerald-200', chip: 'bg-emerald-100 text-emerald-700' },
  danger: { ring: 'border-rose-200', chip: 'bg-rose-50 text-rose-600' },
  warning: { ring: 'border-amber-200', chip: 'bg-amber-50 text-amber-600' },
  neutral: { ring: 'border-slate-200', chip: 'bg-slate-100 text-slate-600' },
};

function OutcomePanel({
  tone = 'neutral',
  icon: Icon,
  eyebrow,
  title,
  children,
  actions,
  decoration,
  className,
}) {
  const headingRef = useFocusOnMount();
  const palette = TONES[tone] ?? TONES.neutral;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-white px-6 py-10 text-center shadow-card animate-fade-in sm:px-10 sm:py-12',
        palette.ring,
        className,
      )}
    >
      {decoration}
      <span
        className={cn(
          'mx-auto flex h-16 w-16 items-center justify-center rounded-full animate-scale-in',
          palette.chip,
        )}
        aria-hidden="true"
      >
        <Icon className="h-8 w-8" />
      </span>
      {eyebrow ? <p className="eyebrow mt-6">{eyebrow}</p> : null}
      <h2
        ref={headingRef}
        tabIndex={-1}
        className={cn(
          'text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none',
          eyebrow ? 'mt-1' : 'mt-6',
        )}
      >
        {title}
      </h2>
      <div className="mx-auto mt-3 max-w-md space-y-3 text-sm text-slate-600">{children}</div>
      {actions ? (
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">{actions}</div>
      ) : null}
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5 text-left">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

/** Decorative confetti for the success panel. */
const CONFETTI = [
  'left-[8%] top-10 h-2 w-2 rotate-12 rounded-sm bg-brand-400',
  'left-[18%] top-24 h-1.5 w-3 -rotate-12 rounded-full bg-emerald-400',
  'left-[30%] top-6 h-2 w-2 rounded-full bg-amber-300',
  'right-[28%] top-8 h-2.5 w-1.5 rotate-45 rounded-sm bg-violet-400',
  'right-[16%] top-20 h-2 w-2 rounded-full bg-sky-400',
  'right-[7%] top-9 h-1.5 w-3 rotate-12 rounded-full bg-rose-300',
];

/** Payment confirmed by the server: the internship is active (SN9). */
export function PaymentSuccess({ enrollment, orderId }) {
  const isTeam = enrollment?.enrollmentType === ENROLLMENT_TYPE.TEAM;
  const snapshot = enrollment?.priceSnapshot;
  const label = planLabel(enrollment?.plan);

  return (
    <OutcomePanel
      tone="success"
      icon={PartyPopper}
      eyebrow="Payment confirmed"
      title="Your internship is active"
      className="bg-gradient-to-b from-emerald-50/80 via-white to-white"
      decoration={
        <div aria-hidden="true">
          {CONFETTI.map((classes) => (
            <span key={classes} className={cn('pointer-events-none absolute opacity-80', classes)} />
          ))}
        </div>
      }
      actions={
        <>
          {isTeam && enrollment?.teamId ? (
            <Button as={Link} to={paths.team(enrollment.teamId)} variant="outline" leftIcon={Users}>
              View your team
            </Button>
          ) : null}
          <Button as={Link} to={ROUTES.SCHEDULE} variant="outline" leftIcon={CalendarDays}>
            View your schedule
          </Button>
          <Button as={Link} to={ROUTES.DASHBOARD} rightIcon={ArrowRight}>
            Go to dashboard
          </Button>
        </>
      }
    >
      <p>
        {label ? <span className="font-medium text-slate-900">{label}. </span> : null}
        {isTeam
          ? 'Your payment is confirmed. Your team starts as soon as every member has joined, been assessed and paid.'
          : 'Your day-wise schedule, SOPs and first tasks are unlocked.'}
      </p>
      <dl className="grid gap-2 pt-2 sm:grid-cols-2">
        {snapshot ? (
          <Detail label="Amount paid">{formatMoney(snapshot.payableAmount, snapshot.currency)}</Detail>
        ) : null}
        <Detail label="Activated">{formatDateTime(enrollment?.activatedAt)}</Detail>
        {orderId ? (
          <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5 text-left sm:col-span-2">
            <dt className="text-xs font-medium text-slate-500">Order ID</dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-slate-700">{orderId}</dd>
          </div>
        ) : null}
      </dl>
    </OutcomePanel>
  );
}

/** The gateway reported the payment as failed (SN9). */
export function PaymentFailed({ enrollmentId, orderId }) {
  return (
    <OutcomePanel
      tone="danger"
      icon={XCircle}
      title="Payment failed"
      actions={
        <>
          <Button as="a" href={supportHref(orderId)} variant="outline" leftIcon={LifeBuoy}>
            Contact support
          </Button>
          <Button as={Link} to={paths.payment(enrollmentId)} leftIcon={RefreshCw}>
            Retry payment
          </Button>
        </>
      }
    >
      <p>
        The payment didn&apos;t go through, so your internship hasn&apos;t started. Your price is
        still locked — you can try again with another card, UPI app or bank.
      </p>
      <p className="text-xs text-slate-500">
        If money left your account, email{' '}
        <a className="link" href={supportHref(orderId)}>
          {SUPPORT_EMAIL}
        </a>
        {orderId ? (
          <>
            {' '}
            with order ID <span className="break-all font-mono text-slate-700">{orderId}</span>
          </>
        ) : null}
        .
      </p>
    </OutcomePanel>
  );
}

/** Polling stopped before the bank confirmed (SN9): the payment may still go through. */
export function PaymentTimeout({ orderId, onCheckAgain, isChecking = false }) {
  return (
    <OutcomePanel
      tone="warning"
      icon={Hourglass}
      title="We're still waiting for confirmation"
      actions={
        <>
          <Button as={Link} to={ROUTES.DASHBOARD} variant="outline" leftIcon={LayoutDashboard}>
            Go to dashboard
          </Button>
          <Button leftIcon={RefreshCw} onClick={onCheckAgain} loading={isChecking}>
            Check again
          </Button>
        </>
      }
    >
      <p>
        Your bank hasn&apos;t confirmed the payment yet. This can take a few minutes — please
        don&apos;t pay again. Your internship activates automatically once it&apos;s confirmed.
      </p>
      <p className="text-xs text-slate-500">
        Still not active after an hour and money left your account? Email{' '}
        <a className="link" href={supportHref(orderId)}>
          {SUPPORT_EMAIL}
        </a>
        {orderId ? (
          <>
            {' '}
            with order ID <span className="break-all font-mono text-slate-700">{orderId}</span>
          </>
        ) : null}
        .
      </p>
    </OutcomePanel>
  );
}

/** The enrollment was cancelled or suspended, so there is nothing to confirm. */
export function PaymentUnavailable({ orderId }) {
  return (
    <OutcomePanel
      tone="neutral"
      icon={Ban}
      title="This enrollment is no longer active"
      actions={
        <>
          <Button as="a" href={supportHref(orderId)} variant="outline" leftIcon={LifeBuoy}>
            Contact support
          </Button>
          <Button as={Link} to={ROUTES.DASHBOARD} rightIcon={ArrowRight}>
            Go to dashboard
          </Button>
        </>
      }
    >
      <p>
        It was cancelled or suspended, so no payment can be confirmed for it. If you were charged,
        our support team will help.
      </p>
    </OutcomePanel>
  );
}
