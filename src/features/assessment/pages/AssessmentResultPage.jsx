import { useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ScoreCard } from '@/features/assessment/components/ScoreCard';
import {
  ENROLLMENT_STEP,
  EnrollmentStepper,
} from '@/features/enrollment/components/EnrollmentStepper';
import { EdgeStateBanner, EDGE_STATE } from '@/features/enrollment/components/EdgeStateBanner';
import { PlanPicker } from '@/features/enrollment/components/PlanPicker';
import { PriceBreakdown } from '@/features/enrollment/components/PriceBreakdown';
import { useAttemptResult } from '@/features/enrollment/hooks/useAttemptResult';
import { useDesignationSummary } from '@/features/enrollment/hooks/useDesignationSummary';
import { usePlanOptions } from '@/features/enrollment/hooks/usePlanOptions';
import { useQuote } from '@/features/enrollment/hooks/useQuote';
import { useTeamContext } from '@/features/enrollment/hooks/useTeamContext';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  PageHeader,
  Skeleton,
  SkeletonCard,
  StatusBanner,
} from '@/shared/components/ui';
import { ASSESSMENT_QUESTION_COUNT, paths } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { ArrowRight, Layers, Users } from '@/shared/icons';
import { isErrorCode } from '@/shared/utils/errors';

function ResultSkeleton() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Loading your result…</span>
      <Skeleton className="h-[88px] w-full" rounded="lg" />
      <div className="space-y-2" aria-hidden="true">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <SkeletonCard lines={3} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-hidden="true">
        <SkeletonCard lines={6} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  );
}

const EMPTY_PLANS = [];

/**
 * Assessment result (SN7): the server-scored attempt (no pass or fail — the score only sets an
 * individual discount), plan selection for the designation and a live server quote, then
 * "Continue to plan & terms".
 */
export function AssessmentResultPage() {
  const { designationId } = useParams();
  const location = useLocation();
  const navigationAttempt = location.state?.attempt;
  const stateAttempt =
    navigationAttempt &&
    (!navigationAttempt.designationId || navigationAttempt.designationId === designationId)
      ? navigationAttempt
      : null;

  const result = useAttemptResult(designationId, stateAttempt);
  const { attempt } = result;
  const designationQuery = useDesignationSummary(designationId);
  const plansQuery = usePlanOptions(designationId);
  const plans = plansQuery.data ?? EMPTY_PLANS;
  const designationName = designationQuery.data?.name ?? plans[0]?.designation?.name ?? null;
  useDocumentTitle(designationName ? `${designationName} · Assessment result` : 'Assessment result');

  const teamContext = useTeamContext({ designationId });
  const { team, teamId, teamPlanId } = teamContext;
  const isTeam = Boolean(team);

  const [chosenPlanId, setChosenPlanId] = useState(null);
  const planId = teamPlanId ?? chosenPlanId;

  const quoteState = useQuote({
    planId,
    teamId,
    enabled: Boolean(attempt) && teamContext.isSettled,
  });
  const assessmentRequired = isErrorCode(quoteState.error, 'ASSESSMENT_REQUIRED');

  if (result.notAttempted) {
    return <Navigate to={paths.assessment(designationId)} replace />;
  }

  if (result.isLoading || (!attempt && !result.isError)) {
    return <ResultSkeleton />;
  }

  if (result.isError) {
    return (
      <div className="space-y-6">
        <EnrollmentStepper current={ENROLLMENT_STEP.ASSESSMENT} />
        <PageHeader title="Your assessment result" />
        <ErrorState
          error={result.error}
          title="We couldn't load your result"
          onRetry={() => result.refetch()}
        />
      </div>
    );
  }

  const quote = quoteState.quote;
  const canContinue = Boolean(planId);
  const continueTo = paths.enroll({
    designationId,
    planId: planId ?? undefined,
    teamId: teamId ?? undefined,
  });

  return (
    <div className="space-y-6">
      <EnrollmentStepper current={ENROLLMENT_STEP.PLAN} />

      <PageHeader
        eyebrow={designationName ?? 'Assessment'}
        title="Your assessment result"
        description="Your score is saved and won't change. It only decides the discount on an individual enrollment — every score can continue to enrollment."
      />

      {isTeam ? (
        <StatusBanner variant="info" icon={Users} title={`You're enrolling with team ${team.name}`}>
          Your team leader chose the plan, so there is nothing to pick here. Every member still
          takes the assessment once.
        </StatusBanner>
      ) : null}

      {assessmentRequired ? (
        <EdgeStateBanner
          state={EDGE_STATE.ASSESSMENT_REQUIRED}
          action={
            <Button as={Link} to={paths.assessment(designationId)} size="sm" variant="outline">
              Go to the assessment
            </Button>
          }
        />
      ) : null}

      <ScoreCard
        score={attempt.score}
        totalQuestions={attempt.totalQuestions ?? ASSESSMENT_QUESTION_COUNT}
        discountPercent={attempt.discountPercent}
        isTeam={isTeam}
        submittedAt={attempt.submittedAt}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <Card padding="none" className="min-w-0">
          <CardHeader
            icon={Layers}
            title={isTeam ? 'Your team plan' : 'Choose your plan'}
            description={
              isTeam
                ? 'Every member of a team enrolls in the same plan.'
                : 'Pick a domain, then a duration. You can still change it on the next step.'
            }
          />
          <CardBody>
            <PlanPicker
              plans={plans}
              value={planId}
              onChange={setChosenPlanId}
              lockedPlan={isTeam && team.plan ? team.plan : null}
              lockedNote="Chosen by your team leader when the team was created."
              isLoading={plansQuery.isLoading}
              error={plansQuery.isError ? plansQuery.error : null}
              onRetry={() => plansQuery.refetch()}
            />
          </CardBody>
        </Card>

        <aside className="lg:sticky lg:top-6" aria-label="Price and next step">
          <PriceBreakdown
            title="Your price"
            quote={quote}
            isLoading={
              Boolean(planId) &&
              !assessmentRequired &&
              (quoteState.isLoading || !teamContext.isSettled)
            }
            isRefreshing={quoteState.isFetching && Boolean(quote)}
            error={assessmentRequired ? null : quoteState.error}
            onRetry={quoteState.refresh}
            isExpired={quoteState.isExpired}
            onRefresh={quoteState.refresh}
            emptyMessage={
              assessmentRequired
                ? 'Take the assessment to see your price.'
                : 'Choose a plan to see your price with your discount applied.'
            }
          >
            <div className="space-y-3">
              <Button
                as={Link}
                to={continueTo}
                state={quote && !quoteState.isExpired ? { quote } : undefined}
                disabled={!canContinue}
                fullWidth
                size="lg"
                rightIcon={ArrowRight}
              >
                Continue to plan &amp; terms
              </Button>
              <p className="text-center text-xs text-slate-500">
                {canContinue
                  ? 'Next: review the terms, then pay securely.'
                  : 'Choose a plan to continue.'}
              </p>
            </div>
          </PriceBreakdown>
        </aside>
      </div>
    </div>
  );
}

export default AssessmentResultPage;
