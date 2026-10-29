/**
 * Enrollment, terms and payment (SN7–SN9, SN13). Pages are lazy-loaded from src/routes/lazyPages.js:
 * pages/EnrollPage, pages/PaymentPage, pages/PaymentStatusPage, pages/TermsPage
 * (and features/assessment/pages/AssessmentResultPage, which composes these components).
 */

// Components
export {
  EnrollmentStepper,
  ENROLLMENT_STEPS,
  ENROLLMENT_STEP,
} from './components/EnrollmentStepper';
export { PlanPicker } from './components/PlanPicker';
export { PriceBreakdown, PriceLines } from './components/PriceBreakdown';
export { TermsBox } from './components/TermsBox';
export { TermsContent } from './components/TermsContent';
export { TermsToc } from './components/TermsToc';
export { PaymentSummary } from './components/PaymentSummary';
export { PayPanel } from './components/PayPanel';
export { GatewayCheckout } from './components/GatewayCheckout';
export { GATEWAY_ADAPTERS, DEFAULT_GATEWAY, getGatewayAdapter } from './components/gateways/registry';
export { StatusPoller } from './components/StatusPoller';
export {
  PaymentSuccess,
  PaymentFailed,
  PaymentTimeout,
  PaymentUnavailable,
} from './components/PaymentOutcome';
export { EdgeStateBanner, EDGE_STATE } from './components/EdgeStateBanner';
export { VerifyEmailNotice } from './components/VerifyEmailNotice';

// Hooks
export { useQuote, quoteMatches, isUsableQuote } from './hooks/useQuote';
export { useIsExpired } from './hooks/useIsExpired';
export { useTerms } from './hooks/useTerms';
export { usePlanOptions } from './hooks/usePlanOptions';
export { useDesignationSummary } from './hooks/useDesignationSummary';
export { useAttemptResult } from './hooks/useAttemptResult';
export { useTeamContext } from './hooks/useTeamContext';
export { useEnrollFlow } from './hooks/useEnrollFlow';
export { useCreateOrder } from './hooks/useCreateOrder';
export { useResendVerification } from './hooks/useResendVerification';
export {
  usePaymentStatus,
  PAYMENT_PHASE,
  PAYMENT_SLOW_AFTER_MS,
  settledPhaseOf,
} from './hooks/usePaymentStatus';

// Utils
export {
  groupPlansByDomain,
  planDesignationId,
  planDomainId,
  planLabel,
  planShortLabel,
} from './utils/plans';
export { extractTermsHeadings, TERMS_PAGE_ID_PREFIX } from './utils/terms';
