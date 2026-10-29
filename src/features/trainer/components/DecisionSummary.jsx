import { Link } from 'react-router-dom';
import { Button, Card, CardHeader, CardBody, StatusBadge } from '@/shared/components/ui';
import { ROUTES, paths } from '@/shared/constants';
import { ArrowLeft, ArrowRight, MessageSquare } from '@/shared/icons';
import { formatDateTime } from '@/shared/utils/helpers';

/** KD10: read-only view of a submission that already has a decision. */
export function DecisionSummary({ submission }) {
  const review = submission.review;
  const status = review?.decision ?? submission.reviewStatus;
  const feedback = String(review?.feedback ?? '').trim();
  const nextId =
    submission.nextPendingId && submission.nextPendingId !== submission._id
      ? submission.nextPendingId
      : null;

  return (
    <Card as="section" padding="none" aria-label="Decision">
      <CardHeader
        title="Decision"
        description="This submission has already been reviewed. Decisions can't be changed."
        action={<StatusBadge status={status} size="md" />}
      />
      <CardBody className="space-y-4">
        {review ? (
          <p className="text-sm text-slate-600">
            {review.trainer?.name ? (
              <span className="font-medium text-slate-900">{review.trainer.name}</span>
            ) : (
              'A trainer'
            )}{' '}
            reviewed it
            {review.reviewedAt ? (
              <>
                {' on '}
                <time dateTime={review.reviewedAt}>{formatDateTime(review.reviewedAt)}</time>
              </>
            ) : null}
            .
          </p>
        ) : null}

        <div className="rounded-lg bg-slate-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Feedback
          </p>
          {feedback ? (
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-slate-700">{feedback}</p>
          ) : (
            <p className="mt-1.5 text-sm text-slate-500">No feedback was left.</p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          {nextId ? (
            <Button as={Link} to={paths.trainerReview(nextId)} rightIcon={ArrowRight} fullWidth>
              Next pending submission
            </Button>
          ) : null}
          <Button as={Link} to={ROUTES.TRAINER} variant="outline" leftIcon={ArrowLeft} fullWidth>
            Back to the queue
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default DecisionSummary;
