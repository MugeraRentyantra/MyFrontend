import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useEnrollments } from '@/features/applications/hooks/useApplications';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusBanner,
  toast,
} from '@/shared/components/ui';
import {
  ACTIVE_ENROLLMENT_STATUSES,
  ENROLLMENT_STATUS,
  ROUTES,
  paths,
} from '@/shared/constants';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Layers,
  LayoutDashboard,
  RefreshCw,
  Search,
  Users,
} from '@/shared/icons';
import { getErrorMessage, isErrorCode } from '@/shared/utils/errors';
import { EdgeStateBanner, EDGE_STATE } from '../components/EdgeStateBanner';
import { ENROLLMENT_STEP, EnrollmentStepper } from '../components/EnrollmentStepper';
import { PlanPicker } from '../components/PlanPicker';
import { PriceBreakdown } from '../components/PriceBreakdown';
import { TermsBox } from '../components/TermsBox';
import { VerifyEmailNotice } from '../components/VerifyEmailNotice';
import { useEnrollFlow } from '../hooks/useEnrollFlow';
import { usePlanOptions } from '../hooks/usePlanOptions';
import { useQuote } from '../hooks/useQuote';
import { useTeamContext } from '../hooks/useTeamContext';
import { useTerms } from '../hooks/useTerms';
import { planDesignationId } from '../utils/plans';

const NO_ITEMS = [];

function sameTeam(a, b) {
  return (a ?? null) === (b ?? null);
}

/** Page frame shared by the full page and its "nothing to show" states. */
function EnrollFrame({ header, children }) {
  return (
    <div className="space-y-6">
      <EnrollmentStepper current={ENROLLMENT_STEP.PLAN} />
      {header}
      {children}
    </div>
  );
}

/**
 * Plan & terms (SN8, SN13): /enroll?designationId=&planId=&teamId=
 * Pick (or confirm) the plan, get a server quote, accept the latest terms, then
 * "Continue to payment" creates the enrollment, records the accepted terms version and opens the
 * payment page. An enrollment already started for the plan is reused instead of duplicated.
 */
export function EnrollPage() {
  useDocumentTitle('Plan and terms');
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const continueHintId = useId();

  const designationParam = searchParams.get('designationId') ?? '';
  const planParam = searchParams.get('planId') ?? '';
  const teamParam = searchParams.get('teamId') ?? '';
  const hasContext = Boolean(designationParam || planParam);

  // Plans: the designation's, or every published plan when the link only has a plan id.
  const plansQuery = usePlanOptions(designationParam, { enabled: hasContext });
  const allPlans = plansQuery.data ?? NO_ITEMS;
  const planFromParam = planParam ? (allPlans.find((plan) => plan._id === planParam) ?? null) : null;
  const designationId = designationParam || planDesignationId(planFromParam) || '';
  const plans = useMemo(
    () =>
      designationId
        ? allPlans.filter((plan) => planDesignationId(plan) === designationId)
        : allPlans,
    [allPlans, designationId],
  );
  const designationName =
    plans[0]?.designation?.name ?? planFromParam?.designation?.name ?? null;

  // Team members enroll in the team's plan and pay the full price.
  const teamContext = useTeamContext({ designationId, teamId: teamParam || undefined });
  const { team, teamId, teamPlanId } = teamContext;
  const isTeam = Boolean(teamId);

  const selectedPlan = planParam ? (plans.find((plan) => plan._id === planParam) ?? null) : null;
  const planId = teamPlanId ?? selectedPlan?._id ?? null;
  const planUnavailable =
    Boolean(planParam) && !teamPlanId && plansQuery.isSuccess && !selectedPlan && plans.length > 0;

  // Existing enrollments for this plan: never create a duplicate.
  const enrollmentsQuery = useEnrollments();
  const enrollments = enrollmentsQuery.data ?? NO_ITEMS;
  const flow = useEnrollFlow();
  const navigating = flow.isPending || flow.isSuccess;

  const live = useMemo(() => {
    if (!planId) return { active: null, pending: null };
    const active =
      enrollments.find(
        (item) => item.planId === planId && ACTIVE_ENROLLMENT_STATUSES.includes(item.status),
      ) ?? null;
    const pending = active
      ? null
      : (enrollments.find(
          (item) =>
            item.planId === planId &&
            item.status === ENROLLMENT_STATUS.PENDING_PAYMENT &&
            sameTeam(item.teamId, teamId),
        ) ?? null);
    return { active, pending };
  }, [enrollments, planId, teamId]);

  // While we hand over to the payment page, keep showing what the student confirmed
  // (the enrollment list refreshes in the background and would otherwise flip the page).
  const frozen = useRef(live);
  if (!navigating) frozen.current = live;
  const { active: activeEnrollment, pending: pendingEnrollment } = navigating
    ? frozen.current
    : live;
  const existing = activeEnrollment ?? pendingEnrollment;

  // Terms
  const termsQuery = useTerms();
  const terms = termsQuery.data ?? null;
  const [acceptedVersion, setAcceptedVersion] = useState(null);
  const termsAccepted = Boolean(terms) && acceptedVersion === terms.version;
  const handleAcceptedChange = (checked) =>
    setAcceptedVersion(checked && terms ? terms.version : null);

  // Quote (only when a new enrollment would be created)
  const contextReady = teamContext.isSettled && !enrollmentsQuery.isLoading;
  const quoteState = useQuote({
    planId,
    teamId,
    enabled: contextReady && !existing && !navigating,
    initialQuote: location.state?.quote ?? null,
  });
  const quote = existing ? null : quoteState.quote;

  const assessmentRequired =
    !existing &&
    (isErrorCode(quoteState.error, 'ASSESSMENT_REQUIRED') ||
      isErrorCode(flow.error, 'ASSESSMENT_REQUIRED'));
  const quoteExpired =
    Boolean(quote) && (quoteState.isExpired || isErrorCode(flow.error, 'QUOTE_EXPIRED'));

  const pendingNeedsTerms = pendingEnrollment
    ? !pendingEnrollment.termsAcceptedVersion ||
      Boolean(terms && Number(pendingEnrollment.termsAcceptedVersion) < Number(terms.version))
    : false;
  const showTerms = !activeEnrollment && (!pendingEnrollment || pendingNeedsTerms);
  const emailUnverified = user?.emailVerified === false;

  const { reset: resetFlow, mutate: runFlow } = flow;

  const handlePlanChange = useCallback(
    (nextPlanId) => {
      resetFlow();
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (nextPlanId) next.set('planId', nextPlanId);
          else next.delete('planId');
          if (!next.get('designationId') && designationId) next.set('designationId', designationId);
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [resetFlow, setSearchParams, designationId],
  );

  const handleRefreshQuote = () => {
    resetFlow();
    quoteState.refresh();
  };

  const handleContinue = () => {
    if (!terms) return;
    const variables = pendingEnrollment
      ? { enrollmentId: pendingEnrollment._id, termsVersion: terms.version }
      : { quoteId: quote?.quoteId, termsVersion: terms.version };
    if (!variables.enrollmentId && !variables.quoteId) return;
    runFlow(variables, {
      onError: (error) => {
        // Expired quotes and a missing assessment are explained by banners on the page.
        if (isErrorCode(error, 'QUOTE_EXPIRED') || isErrorCode(error, 'ASSESSMENT_REQUIRED')) return;
        if (isErrorCode(error, 'TERMS_OUTDATED')) {
          // A newer version was published meanwhile: show it and ask again.
          setAcceptedVersion(null);
          termsQuery.refetch();
          toast.warning('The terms were updated', {
            description: 'Please read the new version and accept it to continue.',
          });
          return;
        }
        if (isErrorCode(error, 'QUOTE_ALREADY_USED')) {
          resetFlow();
          quoteState.refresh();
          toast.info('We refreshed your price', {
            description: 'Your previous quote was already used. Check the price and continue.',
          });
          return;
        }
        // e.g. 409 ALREADY_ENROLLED: the refreshed enrollment list shows the right state.
        toast.error("We couldn't continue to payment", { description: getErrorMessage(error) });
      },
    });
  };

  const header = (
    <PageHeader
      eyebrow={designationName ?? 'Enrollment'}
      title="Choose your plan and accept the terms"
      description="Your price comes from our server and is held for a limited time. You'll pay on the next step."
      backTo={
        designationId
          ? { label: 'Back to your result', to: paths.assessmentResult(designationId) }
          : undefined
      }
    />
  );

  // --- Nothing to enroll in ------------------------------------------------------------------
  if (!hasContext) {
    return (
      <EnrollFrame header={header}>
        <EmptyState
          icon={GraduationCap}
          title="Choose an internship first"
          description="Open an internship from the catalog, take its assessment, then come back here to pick your plan."
          action={
            <Button as={Link} to={ROUTES.CATALOG} leftIcon={Search}>
              Browse internships
            </Button>
          }
          secondaryAction={
            <Button as={Link} to={ROUTES.DASHBOARD} variant="ghost">
              Go to dashboard
            </Button>
          }
        />
      </EnrollFrame>
    );
  }

  if (!designationId && plansQuery.isError) {
    return (
      <EnrollFrame header={header}>
        <ErrorState
          error={plansQuery.error}
          title="We couldn't load this plan"
          onRetry={() => plansQuery.refetch()}
        />
      </EnrollFrame>
    );
  }

  if (!designationId && plansQuery.isSuccess) {
    return (
      <EnrollFrame header={header}>
        <EmptyState
          icon={Layers}
          title="We couldn't find that plan"
          description="It may have been changed or withdrawn. Browse the catalog to choose an internship."
          action={
            <Button as={Link} to={ROUTES.CATALOG} leftIcon={Search}>
              Browse internships
            </Button>
          }
        />
      </EnrollFrame>
    );
  }

  // --- Continue panel -------------------------------------------------------------------------
  let blockedReason = null;
  if (!activeEnrollment && !(pendingEnrollment && !pendingNeedsTerms)) {
    if (!planId) blockedReason = 'Choose a plan to continue.';
    else if (!pendingEnrollment && assessmentRequired) blockedReason = 'Take the assessment to continue.';
    else if (!pendingEnrollment && !quote && (quoteState.isLoading || quoteState.isFetching)) {
      blockedReason = 'Getting your price…';
    } else if (!pendingEnrollment && !quote) blockedReason = 'We need a price before you can continue.';
    else if (!pendingEnrollment && quoteExpired) blockedReason = 'Refresh your price quote to continue.';
    else if (termsQuery.isLoading) blockedReason = 'Loading the terms…';
    else if (!terms) blockedReason = 'The terms need to load before you can continue.';
    else if (!termsAccepted) blockedReason = 'Accept the terms to continue.';
  }

  let continuePanel;
  if (activeEnrollment) {
    continuePanel = (
      <Button as={Link} to={ROUTES.DASHBOARD} fullWidth size="lg" leftIcon={LayoutDashboard}>
        Go to dashboard
      </Button>
    );
  } else if (pendingEnrollment && !pendingNeedsTerms) {
    continuePanel = (
      <div className="space-y-3">
        <Button
          as={Link}
          to={paths.payment(pendingEnrollment._id)}
          fullWidth
          size="lg"
          rightIcon={ArrowRight}
        >
          Continue to payment
        </Button>
        <p className="text-center text-xs text-slate-500">
          You accepted version {pendingEnrollment.termsAcceptedVersion} of the terms.
        </p>
      </div>
    );
  } else {
    continuePanel = (
      <div className="space-y-3">
        <Button
          fullWidth
          size="lg"
          rightIcon={ArrowRight}
          loading={navigating}
          disabled={Boolean(blockedReason) || navigating}
          onClick={handleContinue}
          aria-describedby={continueHintId}
        >
          {pendingEnrollment ? 'Accept terms and continue' : 'Continue to payment'}
        </Button>
        <p id={continueHintId} className="text-center text-xs text-slate-500">
          {blockedReason ??
            (emailUnverified
              ? "You can continue now. You'll need a verified email to pay."
              : 'Your price is locked when you continue. You pay on the next step.')}
        </p>
      </div>
    );
  }

  const lockedTeamPlan = teamPlanId && team?.plan ? team.plan : null;

  return (
    <EnrollFrame header={header}>
      {emailUnverified && !activeEnrollment ? <VerifyEmailNotice email={user?.email} /> : null}

      {planUnavailable ? <EdgeStateBanner state={EDGE_STATE.PLAN_UNAVAILABLE} /> : null}

      {activeEnrollment ? (
        <EdgeStateBanner
          state={EDGE_STATE.ALREADY_ENROLLED}
          action={
            <Button as={Link} to={ROUTES.DASHBOARD} size="sm" variant="outline">
              Go to dashboard
            </Button>
          }
        />
      ) : null}

      {pendingEnrollment ? (
        <EdgeStateBanner
          state={EDGE_STATE.ALREADY_STARTED}
          description={
            pendingNeedsTerms
              ? 'Your price is locked. Accept the latest terms below to continue to payment — no new enrollment is created.'
              : undefined
          }
          action={
            pendingNeedsTerms ? null : (
              <Button as={Link} to={paths.payment(pendingEnrollment._id)} size="sm">
                Continue to payment
              </Button>
            )
          }
        />
      ) : null}

      {assessmentRequired ? (
        <EdgeStateBanner
          state={EDGE_STATE.ASSESSMENT_REQUIRED}
          action={
            <Button
              as={Link}
              to={paths.assessment(designationId)}
              size="sm"
              variant="outline"
            >
              Take the assessment
            </Button>
          }
        />
      ) : null}

      {quoteExpired ? (
        <EdgeStateBanner
          state={EDGE_STATE.QUOTE_EXPIRED}
          action={
            <Button
              size="sm"
              variant="outline"
              leftIcon={RefreshCw}
              loading={quoteState.isFetching}
              onClick={handleRefreshQuote}
            >
              Refresh quote
            </Button>
          }
        />
      ) : null}

      {isTeam && !activeEnrollment ? (
        <StatusBanner
          variant="info"
          icon={Users}
          title={team ? `You're enrolling with team ${team.name}` : "You're enrolling as part of a team"}
        >
          Every member enrolls in the plan your team leader chose and pays the full plan price.
        </StatusBanner>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Card padding="none">
            <CardHeader
              icon={Layers}
              title={lockedTeamPlan ? 'Your team plan' : 'Your plan'}
              description={
                lockedTeamPlan
                  ? 'Every member of a team enrolls in the same plan.'
                  : 'Pick a domain, then a duration. Prices update from our server as you choose.'
              }
            />
            <CardBody>
              <PlanPicker
                plans={plans}
                value={planId}
                onChange={handlePlanChange}
                lockedPlan={lockedTeamPlan}
                lockedNote="Chosen by your team leader when the team was created."
                isLoading={plansQuery.isLoading}
                error={plansQuery.isError ? plansQuery.error : null}
                onRetry={() => plansQuery.refetch()}
                disabled={navigating}
              />
            </CardBody>
          </Card>

          {showTerms ? (
            <TermsBox
              terms={terms}
              isLoading={termsQuery.isLoading}
              error={termsQuery.isError ? termsQuery.error : null}
              onRetry={() => termsQuery.refetch()}
              accepted={termsAccepted}
              onAcceptedChange={handleAcceptedChange}
              disabled={navigating}
            />
          ) : null}

          {pendingEnrollment && !pendingNeedsTerms ? (
            <Card className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-900">Terms accepted</p>
                <p className="mt-0.5 text-slate-600">
                  You accepted version {pendingEnrollment.termsAcceptedVersion} of the{' '}
                  <a className="link" href={ROUTES.TERMS} target="_blank" rel="noopener noreferrer">
                    Terms &amp; Conditions
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>{' '}
                  for this enrollment.
                </p>
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-6" aria-label="Price and next step">
          <PriceBreakdown
            title={existing ? 'Your locked price' : 'Your price'}
            quote={quote}
            snapshot={existing ? existing.priceSnapshot : null}
            enrollmentType={existing?.enrollmentType}
            lockedAt={existing?.createdAt}
            isLoading={
              !existing &&
              Boolean(planId) &&
              !assessmentRequired &&
              (quoteState.isLoading || !contextReady)
            }
            isRefreshing={!existing && quoteState.isFetching && Boolean(quote)}
            error={!existing && !assessmentRequired ? quoteState.error : null}
            onRetry={quoteState.refresh}
            isExpired={quoteExpired}
            onRefresh={handleRefreshQuote}
            emptyMessage={
              assessmentRequired
                ? 'Take the assessment to see your price.'
                : 'Choose a plan to see your price.'
            }
          >
            {continuePanel}
          </PriceBreakdown>
        </aside>
      </div>
    </EnrollFrame>
  );
}

export default EnrollPage;
