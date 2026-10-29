import { Link } from 'react-router-dom';
import { Button, StatusBanner } from '@/shared/components/ui';
import { ArrowRight, CreditCard, MailCheck, RotateCcw } from '@/shared/icons';
import { PAYMENT_STATUS, ROUTES, buildPath, paths } from '@/shared/constants';
import { formatMoney } from '@/shared/utils/helpers';
import { describeEnrollment } from '../utils/dashboardHelpers';

/**
 * Banner for a PENDING_PAYMENT enrollment. The variant follows the payment state machine
 * (separate from the enrollment status): FAILED -> retry, PENDING -> confirming,
 * unverified email -> verify first, otherwise -> complete payment. Amounts come from the
 * server's price snapshot; nothing is calculated here.
 */
function getBannerConfig({ enrollment, emailVerified, email }) {
  const { designation } = describeEnrollment(enrollment);
  const snapshot = enrollment.priceSnapshot ?? {};
  const amount = formatMoney(snapshot.payableAmount, snapshot.currency || undefined);

  if (enrollment.paymentStatus === PAYMENT_STATUS.FAILED) {
    return {
      variant: 'error',
      title: "Your last payment didn't go through",
      body: `Your ${designation} enrollment is saved. Try the payment again to unlock your schedule, SOPs and tasks.`,
      action: { label: 'Retry payment', to: paths.payment(enrollment._id), icon: RotateCcw },
    };
  }

  if (enrollment.paymentStatus === PAYMENT_STATUS.PENDING) {
    return {
      variant: 'info',
      title: 'Confirming your payment',
      body: "We're waiting for the payment provider to confirm. This usually takes a minute, and your internship unlocks automatically.",
      action: {
        label: 'Check status',
        to: paths.paymentStatus({ enrollmentId: enrollment._id }),
        variant: 'outline',
        rightIcon: ArrowRight,
      },
    };
  }

  if (!emailVerified) {
    return {
      variant: 'warning',
      title: 'Verify your email to pay',
      body: `Open the verification link we sent${email ? ` to ${email}` : ''}. Payment unlocks as soon as your email is verified.`,
      action: {
        label: 'Verify email',
        to: buildPath(ROUTES.CHECK_EMAIL, {}, email ? { email } : undefined),
        icon: MailCheck,
        variant: 'outline',
      },
    };
  }

  return {
    variant: 'info',
    title: 'Complete payment to start',
    body: `Your ${designation} internship is reserved. Pay ${amount} to unlock the full schedule, SOPs and tasks.`,
    action: { label: 'Complete payment', to: paths.payment(enrollment._id), icon: CreditCard },
  };
}

export function PaymentPendingBanner({ enrollment, emailVerified = true, email, className }) {
  if (!enrollment) return null;
  const config = getBannerConfig({ enrollment, emailVerified, email });
  const { action } = config;

  return (
    <StatusBanner
      variant={config.variant}
      title={config.title}
      className={className}
      action={
        <Button
          as={Link}
          to={action.to}
          size="sm"
          variant={action.variant ?? 'primary'}
          leftIcon={action.icon}
          rightIcon={action.rightIcon}
          className="h-10 sm:h-8"
        >
          {action.label}
        </Button>
      }
    >
      {config.body}
    </StatusBanner>
  );
}

export default PaymentPendingBanner;
