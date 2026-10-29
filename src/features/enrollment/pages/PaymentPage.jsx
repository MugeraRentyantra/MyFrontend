import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEnrollment } from '@/features/applications/hooks/useApplications';
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonCard,
  toast,
} from '@/shared/components/ui';
import {
  ACTIVE_ENROLLMENT_STATUSES,
  ENROLLMENT_STATUS,
  PAYMENT_PROVIDER,
  PAYMENT_STATUS,
  ROUTES,
  USE_MOCKS,
  paths,
} from '@/shared/constants';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import { ArrowRight, LayoutDashboard, Receipt } from '@/shared/icons';
import { getErrorMessage, getErrorStatus, isErrorCode } from '@/shared/utils/errors';
import { EdgeStateBanner, EDGE_STATE } from '../components/EdgeStateBanner';
import { ENROLLMENT_STEP, EnrollmentStepper } from '../components/EnrollmentStepper';
import { GatewayCheckout } from '../components/GatewayCheckout';
import { PaymentSummary } from '../components/PaymentSummary';
import { PayPanel } from '../components/PayPanel';
import { VerifyEmailNotice } from '../components/VerifyEmailNotice';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { useTerms } from '../hooks/useTerms';
import { planDesignationId } from '../utils/plans';

const IS_TEST_MODE = USE_MOCKS || PAYMENT_PROVIDER === 'mock';

function PaymentSkeleton() {
  return (
    <div role="status" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <span className="sr-only">Loading your order…</span>
      <SkeletonCard lines={6} />
      <SkeletonCard lines={4} />
    </div>
  );
}

/**
 * Review and pay (SN9): order summary from the enrollment's locked price snapshot, then
 * "Pay ₹X" creates a server order and opens the checkout for its provider. Nothing is ever marked
 * paid here — the status page waits for the server's confirmation.
 */
export function PaymentPage() {
  useDocumentTitle('Review and pay');
  const { enrollmentId } = useParams();
  const { user, updateUser } = useAuth();
  const enrollmentQuery = useEnrollment(enrollmentId, { staleTime: 0 });
  const latestTermsVersion = useTerms().data?.version ?? null;
  const createOrder = useCreateOrder();
  const [order, setOrder] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const enrollment = enrollmentQuery.data ?? null;

  const header = (
    <PageHeader
      eyebrow="Checkout"
      title="Review and pay"
      description="Check your order, then pay securely. Your internship unlocks as soon as the bank confirms the payment."
    />
  );

  if (enrollmentQuery.isLoading) {
    return (
      <div className="space-y-6">
        <EnrollmentStepper current={ENROLLMENT_STEP.PAYMENT} />
        {header}
        <PaymentSkeleton />
      </div>
    );
  }

  if (enrollmentQuery.isError || !enrollment) {
    const notFound = getErrorStatus(enrollmentQuery.error) === 404;
    return (
      <div className="space-y-6">
        <EnrollmentStepper current={ENROLLMENT_STEP.PAYMENT} />
        {header}
        {notFound ? (
          <EmptyState
            icon={Receipt}
            title="We couldn't find this enrollment"
            description="The link may be incomplete, or the enrollment belongs to another account."
            action={
              <Button as={Link} to={ROUTES.DASHBOARD} leftIcon={LayoutDashboard}>
                Go to dashboard
              </Button>
            }
          />
        ) : (
          <ErrorState
            error={enrollmentQuery.error}
            title="We couldn't load your order"
            onRetry={() => enrollmentQuery.refetch()}
          />
        )}
      </div>
    );
  }

  const isPaid = ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status);
  const isPayable = enrollment.status === ENROLLMENT_STATUS.PENDING_PAYMENT;
  const emailBlocked = user?.emailVerified === false;
  // The latest terms version must be accepted for this enrollment (SD5).
  const termsMissing =
    !enrollment.termsAcceptedVersion ||
    (latestTermsVersion !== null &&
      Number(enrollment.termsAcceptedVersion) < Number(latestTermsVersion)) ||
    isErrorCode(createOrder.error, 'TERMS_NOT_ACCEPTED');
  const lastFailed = enrollment.paymentStatus === PAYMENT_STATUS.FAILED;
  const lastPending = enrollment.paymentStatus === PAYMENT_STATUS.PENDING;
  // Paid but not activated yet (e.g. held for a review): never ask for a second payment.
  const inReview = isPayable && enrollment.paymentStatus === PAYMENT_STATUS.SUCCESS;
  const canPay = isPayable && !emailBlocked && !termsMissing && !lastPending && !inReview;
  const snapshot = enrollment.priceSnapshot ?? {};

  const enrollLink = paths.enroll({
    designationId: planDesignationId(enrollment.plan) ?? undefined,
    planId: enrollment.planId,
    teamId: enrollment.teamId ?? undefined,
  });

  let blockedReason = null;
  if (inReview) blockedReason = "We've received your payment — no need to pay again.";
  else if (lastPending) blockedReason = 'Paying again is paused while we confirm your last payment.';
  else if (emailBlocked) blockedReason = 'Verify your email to unlock payment.';
  else if (termsMissing) blockedReason = 'Accept the latest terms to unlock payment.';

  const handlePay = () => {
    if (!canPay) return;
    if (order) {
      // Reopen the order created a moment ago (e.g. the student closed the checkout).
      setCheckoutOpen(true);
      return;
    }
    createOrder.mutate(enrollment._id, {
      onSuccess: (createdOrder) => {
        setOrder(createdOrder);
        setCheckoutOpen(true);
      },
      onError: (error) => {
        if (isErrorCode(error, 'EMAIL_NOT_VERIFIED')) {
          // The server is the source of truth: show the verification notice.
          updateUser({ emailVerified: false });
          return;
        }
        if (isErrorCode(error, 'TERMS_NOT_ACCEPTED')) {
          enrollmentQuery.refetch();
          return;
        }
        // 409: already paid, or a payment is still being confirmed — show the current state.
        if (getErrorStatus(error) === 409) enrollmentQuery.refetch();
        toast.error("We couldn't start the payment", { description: getErrorMessage(error) });
      },
    });
  };

  const handleCheckoutClose = () => {
    setCheckoutOpen(false);
    toast.info('Payment not completed', {
      description: "You haven't been charged. You can pay whenever you're ready.",
    });
  };

  let sidePanel;
  if (isPaid) {
    sidePanel = (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
        <p className="text-sm font-medium text-emerald-900">Nothing left to pay</p>
        <p className="mt-1 text-sm text-emerald-800">
          Your internship is active. Pick up your schedule and tasks from the dashboard.
        </p>
        <Button
          as={Link}
          to={ROUTES.DASHBOARD}
          fullWidth
          className="mt-4"
          rightIcon={ArrowRight}
        >
          Go to dashboard
        </Button>
      </div>
    );
  } else if (!isPayable) {
    sidePanel = (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-sm text-slate-600">This enrollment can&apos;t be paid any more.</p>
        <Button
          as={Link}
          to={ROUTES.DASHBOARD}
          variant="outline"
          fullWidth
          className="mt-4"
          leftIcon={LayoutDashboard}
        >
          Go to dashboard
        </Button>
      </div>
    );
  } else {
    sidePanel = (
      <PayPanel
        amount={snapshot.payableAmount}
        currency={snapshot.currency}
        isRetry={lastFailed}
        canPay={canPay}
        blockedReason={blockedReason}
        loading={createOrder.isPending}
        onPay={handlePay}
        isTestMode={IS_TEST_MODE}
      />
    );
  }

  return (
    <div className="space-y-6">
      <EnrollmentStepper current={isPaid ? ENROLLMENT_STEP.LEARN : ENROLLMENT_STEP.PAYMENT} />
      <PageHeader
        eyebrow="Checkout"
        title="Review and pay"
        description="Check your order, then pay securely. Your internship unlocks as soon as the bank confirms the payment."
        backTo={isPayable ? { label: 'Back to plan & terms', to: enrollLink } : undefined}
      />

      {isPaid ? (
        <EdgeStateBanner
          state={EDGE_STATE.ALREADY_PAID}
          action={
            <Button as={Link} to={ROUTES.DASHBOARD} size="sm" variant="outline">
              Go to dashboard
            </Button>
          }
        />
      ) : null}

      {!isPaid && !isPayable ? <EdgeStateBanner state={EDGE_STATE.NOT_PAYABLE} /> : null}

      {isPayable && emailBlocked ? (
        <VerifyEmailNotice email={user?.email}>
          Payment is locked until you verify{' '}
          <span className="break-all font-medium">{user?.email}</span>. Open the link in the email
          we sent you, then come back to this page.
        </VerifyEmailNotice>
      ) : null}

      {isPayable && termsMissing ? (
        <EdgeStateBanner
          state={EDGE_STATE.TERMS_NOT_ACCEPTED}
          action={
            <Button as={Link} to={enrollLink} size="sm" variant="outline">
              Review the terms
            </Button>
          }
        />
      ) : null}

      {isPayable && lastFailed ? <EdgeStateBanner state={EDGE_STATE.PAYMENT_FAILED} /> : null}

      {inReview ? <EdgeStateBanner state={EDGE_STATE.PAYMENT_IN_REVIEW} /> : null}

      {isPayable && lastPending ? (
        <EdgeStateBanner
          state={EDGE_STATE.PAYMENT_PENDING}
          action={
            <Button
              as={Link}
              to={paths.paymentStatus({ enrollmentId: enrollment._id })}
              size="sm"
              variant="outline"
            >
              Check payment status
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <PaymentSummary enrollment={enrollment} user={user} className="min-w-0" />
        <aside className="lg:sticky lg:top-6" aria-label="Payment">
          {sidePanel}
        </aside>
      </div>

      <GatewayCheckout
        order={order}
        enrollment={enrollment}
        user={user}
        open={checkoutOpen}
        onClose={handleCheckoutClose}
      />
    </div>
  );
}

export default PaymentPage;
