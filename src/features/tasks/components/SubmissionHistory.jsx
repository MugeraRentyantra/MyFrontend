import {
  Button,
  EmptyState,
  ErrorState,
  SkeletonCard,
  StatusBanner,
} from '@/shared/components/ui';
import { REVIEW_STATUS } from '@/shared/constants';
import { History, RotateCcw } from '@/shared/icons';
import { pluralize } from '@/shared/utils/helpers';
import { AttemptCard } from './AttemptCard';

const RESUBMIT_STATUSES = [REVIEW_STATUS.CHANGES_REQUESTED, REVIEW_STATUS.REJECTED];

/**
 * Submission history of a task (GP9), newest first. When the latest attempt came back with
 * changes requested (or rejected) and the task accepts a new attempt, "Resubmit" opens the
 * form with the previous description filled in.
 */
export function SubmissionHistory({
  submissions = [],
  isLoading = false,
  isError = false,
  error,
  onRetry,
  canResubmit = false,
  onResubmit,
  showSubmitter = false,
}) {
  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only" role="status">
          Loading submission history…
        </span>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        error={error}
        title="Couldn't load your submissions"
        onRetry={onRetry}
        compact
      />
    );
  }

  if (!submissions.length) {
    return (
      <EmptyState
        titleAs="h2"
        icon={History}
        title="No submissions yet"
        description="Each attempt you submit appears here with your trainer's decision and feedback."
        variant="muted"
      />
    );
  }

  const latest = submissions[0];
  const showResubmit = canResubmit && RESUBMIT_STATUSES.includes(latest.reviewStatus);

  return (
    <section aria-labelledby="submission-history-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="submission-history-heading" className="text-base font-semibold text-slate-900">
          Submission history
        </h2>
        <p className="text-sm text-slate-500">
          {pluralize(submissions.length, 'attempt')} · newest first
        </p>
      </div>

      {showResubmit ? (
        <StatusBanner
          variant="warning"
          title={
            latest.reviewStatus === REVIEW_STATUS.REJECTED
              ? 'Your last attempt was not accepted'
              : 'Your trainer asked for changes'
          }
          action={
            <Button size="sm" leftIcon={RotateCcw} onClick={onResubmit}>
              Resubmit
            </Button>
          }
        >
          Read the feedback below, then resubmit. Your previous description will be filled in for you.
        </StatusBanner>
      ) : null}

      <ol className="space-y-4">
        {submissions.map((submission, index) => (
          <li key={submission._id ?? index}>
            <AttemptCard
              submission={submission}
              isLatest={index === 0}
              showSubmitter={showSubmitter}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

export default SubmissionHistory;
