import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { ArrowRight, CreditCard, Lock, RotateCcw } from '@/shared/icons';
import { PAYMENT_STATUS, paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

function getAction(enrollment) {
  if (!enrollment?._id) return null;
  if (enrollment.paymentStatus === PAYMENT_STATUS.PENDING) {
    return {
      label: 'Check payment status',
      to: paths.paymentStatus({ enrollmentId: enrollment._id }),
      icon: null,
      rightIcon: ArrowRight,
    };
  }
  if (enrollment.paymentStatus === PAYMENT_STATUS.FAILED) {
    return { label: 'Retry payment', to: paths.payment(enrollment._id), icon: RotateCcw };
  }
  return { label: 'Complete payment', to: paths.payment(enrollment._id), icon: CreditCard };
}

/**
 * The paywall banner shown over a locked schedule, SOP or preview: what is locked and the one
 * next step (complete / retry payment, or check a payment that is still being confirmed).
 */
export function LockedOverlay({
  enrollment,
  title = 'Pay to unlock the full schedule, SOPs and tasks',
  description,
  headingAs: Heading = 'h2',
  className,
}) {
  const action = getAction(enrollment);
  const pending = enrollment?.paymentStatus === PAYMENT_STATUS.PENDING;
  const text =
    description ??
    (pending
      ? "We're still confirming your payment. Everything unlocks automatically once it's confirmed."
      : 'You can see the day titles now. Activities, SOPs and tasks open as soon as your payment is confirmed.');

  return (
    <div
      className={cn(
        'rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-5 shadow-card sm:p-6',
        className,
      )}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"
            aria-hidden="true"
          >
            <Lock className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <Heading className="text-base font-semibold text-slate-900">{title}</Heading>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{text}</p>
          </div>
        </div>
        {action ? (
          <Button
            as={Link}
            to={action.to}
            size="lg"
            leftIcon={action.icon}
            rightIcon={action.rightIcon}
            className="w-full shrink-0 md:w-auto"
          >
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default LockedOverlay;
