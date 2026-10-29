import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  SkeletonCard,
  StatusBanner,
} from '@/shared/components/ui';
import { REVIEW_STATUS, ROUTES, paths } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { ArrowDown, ArrowRight, RefreshCw, Search, ShieldAlert } from '@/shared/icons';
import { getErrorStatus } from '@/shared/utils/errors';
import { AttemptHistory } from '../components/AttemptHistory';
import { AutomatedChecks } from '../components/AutomatedChecks';
import { CriteriaChecklist } from '../components/CriteriaChecklist';
import { DecisionForm } from '../components/DecisionForm';
import { DecisionSummary } from '../components/DecisionSummary';
import { ScreenshotGallery } from '../components/ScreenshotGallery';
import { SubmissionHeader } from '../components/SubmissionHeader';
import { SubmissionNotes } from '../components/SubmissionNotes';
import { useTrainerSubmission } from '../hooks/useSubmissionReview';
import { ownerName, taskLabel } from '../utils/reviewHelpers';

const BACK_TO_QUEUE = { label: 'Back to the queue', to: ROUTES.TRAINER };

function ReviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading submission
      </span>
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <SkeletonCard lines={3} />
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card" aria-hidden="true">
            <Skeleton className="h-4 w-28" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="aspect-video w-full" rounded="lg" />
              ))}
            </div>
          </div>
          <SkeletonCard lines={4} />
        </div>
        <SkeletonCard lines={6} />
      </div>
    </div>
  );
}

function ReviewUnavailable({ error, onRetry }) {
  const status = getErrorStatus(error);
  let content;
  if (status === 403) {
    content = (
      <EmptyState
        variant="locked"
        icon={ShieldAlert}
        title="This submission isn't assigned to you."
        description="Only the trainer assigned to this student or team can review it. Ask an admin if you think this is a mistake."
        action={
          <Button as={Link} to={ROUTES.TRAINER}>
            Go to your queue
          </Button>
        }
      />
    );
  } else if (status === 404) {
    content = (
      <EmptyState
        variant="muted"
        icon={Search}
        title="Submission not found"
        description="The link may be wrong, or the submission no longer exists."
        action={
          <Button as={Link} to={ROUTES.TRAINER}>
            Go to your queue
          </Button>
        }
      />
    );
  } else {
    content = <ErrorState error={error} onRetry={onRetry} title="We couldn't load this submission" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Review submission" backTo={BACK_TO_QUEUE} />
      {content}
    </div>
  );
}

/** /trainer/review/:submissionId (KD10): evidence on the left, the decision on the right. */
export function ReviewPage() {
  const { submissionId } = useParams();
  const decisionRef = useRef(null);
  const [decisionInView, setDecisionInView] = useState(false);
  const { data: submission, isLoading, isError, error, refetch, isFetching } =
    useTrainerSubmission(submissionId);
  const loadedId = submission?._id ?? null;
  const isPending = submission?.reviewStatus === REVIEW_STATUS.PENDING;

  useDocumentTitle(submission?.task ? `Review · ${taskLabel(submission.task)}` : 'Review submission');

  // Hide the mobile "Make a decision" bar while the decision panel itself is on screen.
  useEffect(() => {
    const node = decisionRef.current;
    if (!node || !isPending || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setDecisionInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadedId, isPending]);

  if (isLoading) return <ReviewSkeleton />;
  if (!submission) return <ReviewUnavailable error={error} onRetry={refetch} />;

  const nextId =
    submission.nextPendingId && submission.nextPendingId !== submission._id
      ? submission.nextPendingId
      : null;

  const goToDecision = () => {
    const node = decisionRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    node.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review submission"
        description={`${taskLabel(submission.task)} · ${ownerName(submission)}`}
        backTo={BACK_TO_QUEUE}
        actions={
          isPending && nextId ? (
            <Button
              as={Link}
              to={paths.trainerReview(nextId)}
              variant="outline"
              rightIcon={ArrowRight}
            >
              Skip to next
            </Button>
          ) : null
        }
      />

      {isError ? (
        <StatusBanner
          variant="warning"
          title="We couldn't refresh this submission"
          action={
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              loading={isFetching}
              onClick={() => refetch()}
            >
              Try again
            </Button>
          }
        >
          You're seeing the last loaded version.
        </StatusBanner>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <SubmissionHeader submission={submission} />
          <ScreenshotGallery screenshots={submission.screenshots} />
          <SubmissionNotes description={submission.description} githubUrl={submission.githubUrl} />
          <CriteriaChecklist key={submission._id} criteria={submission.task?.acceptanceCriteria} />
          <AutomatedChecks checks={submission.automatedChecks} />
          <AttemptHistory attempts={submission.previousAttempts} />
        </div>

        <aside
          ref={decisionRef}
          tabIndex={-1}
          aria-label="Review decision"
          className="scrollbar-thin min-w-0 scroll-mt-24 focus:outline-none lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
        >
          {isPending ? (
            <DecisionForm key={submission._id} submission={submission} />
          ) : (
            <DecisionSummary submission={submission} />
          )}
        </aside>
      </div>

      {isPending && !decisionInView ? (
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
          <Button fullWidth leftIcon={ArrowDown} onClick={goToDecision}>
            Make a decision
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default ReviewPage;
