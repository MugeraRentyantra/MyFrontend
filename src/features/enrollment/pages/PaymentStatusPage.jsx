import { Link, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, ErrorState, PageHeader } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { LayoutDashboard, Receipt } from '@/shared/icons';
import { getErrorStatus } from '@/shared/utils/errors';
import { ENROLLMENT_STEP, EnrollmentStepper } from '../components/EnrollmentStepper';
import {
  PaymentFailed,
  PaymentSuccess,
  PaymentTimeout,
  PaymentUnavailable,
} from '../components/PaymentOutcome';
import { StatusPoller } from '../components/StatusPoller';
import { PAYMENT_PHASE, usePaymentStatus } from '../hooks/usePaymentStatus';

const PAGE_TITLES = {
  [PAYMENT_PHASE.SUCCESS]: 'Payment confirmed',
  [PAYMENT_PHASE.FAILED]: 'Payment failed',
  [PAYMENT_PHASE.TIMEOUT]: 'Waiting for confirmation',
};

function DashboardButton({ variant = 'primary' }) {
  return (
    <Button as={Link} to={ROUTES.DASHBOARD} variant={variant} leftIcon={LayoutDashboard}>
      Go to dashboard
    </Button>
  );
}

/**
 * Payment status (SN9, SD8): /payment/status?enrollmentId=&orderId=
 * Polls the enrollment until the server confirms the payment (or reports it failed), with a
 * timeout. Arriving here from the checkout is never treated as proof of payment.
 */
export function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const enrollmentId = searchParams.get('enrollmentId') ?? '';
  const orderId = searchParams.get('orderId') ?? '';
  const status = usePaymentStatus(enrollmentId);
  const { phase, enrollment } = status;
  useDocumentTitle(PAGE_TITLES[phase] ?? 'Payment status');

  let panel;
  switch (phase) {
    case PAYMENT_PHASE.MISSING:
      panel = (
        <EmptyState
          icon={Receipt}
          title="There's no payment to check"
          description="Open this page from the payment screen. Your enrollments and their status are on your dashboard."
          action={<DashboardButton />}
        />
      );
      break;
    case PAYMENT_PHASE.ERROR:
      panel =
        getErrorStatus(status.error) === 404 ? (
          <EmptyState
            icon={Receipt}
            title="We couldn't find this enrollment"
            description="The link may be incomplete, or the enrollment belongs to another account."
            action={<DashboardButton />}
          />
        ) : (
          <ErrorState
            error={status.error}
            title="We couldn't check this payment"
            onRetry={status.restart}
          />
        );
      break;
    case PAYMENT_PHASE.SUCCESS:
      panel = <PaymentSuccess enrollment={enrollment} orderId={orderId} />;
      break;
    case PAYMENT_PHASE.FAILED:
      panel = <PaymentFailed enrollmentId={enrollmentId} orderId={orderId} />;
      break;
    case PAYMENT_PHASE.UNAVAILABLE:
      panel = <PaymentUnavailable orderId={orderId} />;
      break;
    case PAYMENT_PHASE.TIMEOUT:
      panel = (
        <PaymentTimeout
          orderId={orderId}
          onCheckAgain={status.restart}
          isChecking={status.isFetching}
        />
      );
      break;
    default:
      panel = (
        <StatusPoller
          isSlow={status.isSlow}
          connectionIssue={status.connectionIssue}
          orderId={orderId}
        />
      );
  }

  return (
    <div className="space-y-6">
      <EnrollmentStepper
        current={phase === PAYMENT_PHASE.SUCCESS ? ENROLLMENT_STEP.LEARN : ENROLLMENT_STEP.PAYMENT}
      />
      <PageHeader
        eyebrow="Checkout"
        title="Payment status"
        description="We confirm every payment with the bank before your internship starts."
      />
      <div className="mx-auto w-full max-w-2xl">{panel}</div>
    </div>
  );
}

export default PaymentStatusPage;
