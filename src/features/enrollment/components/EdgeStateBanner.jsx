import { StatusBanner } from '@/shared/components/ui';
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock,
  Hourglass,
  Info,
  ScrollText,
  ShieldCheck,
  XCircle,
} from '@/shared/icons';

/** Names of the enrollment and payment edge states (SN13). */
export const EDGE_STATE = Object.freeze({
  QUOTE_EXPIRED: 'quoteExpired',
  ASSESSMENT_REQUIRED: 'assessmentRequired',
  TERMS_NOT_ACCEPTED: 'termsNotAccepted',
  ALREADY_STARTED: 'alreadyStarted',
  ALREADY_ENROLLED: 'alreadyEnrolled',
  ALREADY_PAID: 'alreadyPaid',
  NOT_PAYABLE: 'notPayable',
  PAYMENT_FAILED: 'paymentFailed',
  PAYMENT_PENDING: 'paymentPending',
  PAYMENT_IN_REVIEW: 'paymentInReview',
  PLAN_UNAVAILABLE: 'planUnavailable',
});

const EDGE_STATE_CONFIG = {
  [EDGE_STATE.QUOTE_EXPIRED]: {
    variant: 'warning',
    icon: Clock,
    title: 'Your price quote expired',
    description:
      'Prices are held for a limited time. Refresh the quote to get the current price — your discount still applies.',
  },
  [EDGE_STATE.ASSESSMENT_REQUIRED]: {
    variant: 'warning',
    icon: ClipboardList,
    title: 'Take the assessment first',
    description:
      'Everyone takes the 15-question assessment once before enrolling. It only decides your individual discount — every score can enroll.',
  },
  [EDGE_STATE.TERMS_NOT_ACCEPTED]: {
    variant: 'warning',
    icon: ScrollText,
    title: 'Accept the latest terms to continue',
    description: 'You need to accept the current Terms & Conditions before you can pay.',
  },
  [EDGE_STATE.ALREADY_STARTED]: {
    variant: 'info',
    icon: Info,
    title: 'You already started this enrollment',
    description: 'Your price is locked. Continue where you left off — no new enrollment is created.',
  },
  [EDGE_STATE.ALREADY_ENROLLED]: {
    variant: 'success',
    icon: CheckCircle2,
    title: "You're already enrolled in this plan",
    description: 'Your internship is set up. Head to your dashboard to keep going.',
  },
  [EDGE_STATE.ALREADY_PAID]: {
    variant: 'success',
    icon: CheckCircle2,
    title: 'This enrollment is already paid',
    description: 'There is nothing more to pay. Your schedule and tasks are on your dashboard.',
  },
  [EDGE_STATE.NOT_PAYABLE]: {
    variant: 'warning',
    icon: Ban,
    title: "This enrollment can't be paid",
    description: 'It was cancelled or suspended. Contact support if you think this is a mistake.',
  },
  [EDGE_STATE.PAYMENT_FAILED]: {
    variant: 'error',
    icon: XCircle,
    title: "Your last payment didn't go through",
    description:
      'Nothing was activated. You can try again — each attempt creates a new, secure payment order.',
  },
  [EDGE_STATE.PAYMENT_PENDING]: {
    variant: 'info',
    icon: Hourglass,
    title: "We're still confirming your last payment",
    description:
      "Banks can take a few minutes to confirm. Paying again is paused until then, so you aren't charged twice.",
  },
  [EDGE_STATE.PAYMENT_IN_REVIEW]: {
    variant: 'info',
    icon: ShieldCheck,
    title: 'We received your payment',
    description:
      "It's being checked before your internship starts. You don't need to pay again — we'll email you when it's done.",
  },
  [EDGE_STATE.PLAN_UNAVAILABLE]: {
    variant: 'warning',
    icon: Info,
    title: "The plan in your link isn't available",
    description: 'It may have been changed or withdrawn. Choose one of the plans below instead.',
  },
};

/**
 * A page-level notice for one enrollment / payment edge state (SN13). `state` is one of
 * EDGE_STATE; `title`, `description` (or children) and `variant` override the defaults and
 * `action` renders the next step (e.g. a "Refresh quote" button).
 */
export function EdgeStateBanner({
  state,
  title,
  description,
  variant,
  action,
  onDismiss,
  className,
  children,
}) {
  const config = EDGE_STATE_CONFIG[state] ?? {};
  return (
    <StatusBanner
      variant={variant ?? config.variant ?? 'info'}
      icon={config.icon}
      title={title ?? config.title}
      action={action}
      onDismiss={onDismiss}
      className={className}
    >
      {children ?? description ?? config.description}
    </StatusBanner>
  );
}

export default EdgeStateBanner;
