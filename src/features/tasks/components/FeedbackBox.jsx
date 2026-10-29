import { Avatar } from '@/shared/components/ui';
import { REVIEW_DECISION } from '@/shared/constants';
import { MessageSquare } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDateTime } from '@/shared/utils/helpers';

const TONES = {
  [REVIEW_DECISION.APPROVED]: 'border-emerald-200 bg-emerald-50/50',
  [REVIEW_DECISION.CHANGES_REQUESTED]: 'border-orange-200 bg-orange-50/50',
  [REVIEW_DECISION.REJECTED]: 'border-rose-200 bg-rose-50/50',
};

/** Trainer feedback on one attempt (GP9): who reviewed it, when, and what they wrote. */
export function FeedbackBox({ review, title = 'Trainer feedback', className }) {
  if (!review) return null;
  const trainerName = review.trainer?.name || 'Your trainer';

  return (
    <figure
      className={cn(
        'rounded-lg border p-4',
        TONES[review.decision] ?? 'border-slate-200 bg-slate-50',
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Avatar name={trainerName} size="sm" aria-hidden="true" />
        <div className="min-w-0 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-slate-900">
            <MessageSquare className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            {title}
          </p>
          <p className="text-slate-500">
            {trainerName}
            {review.reviewedAt ? (
              <>
                {' · '}
                <time dateTime={review.reviewedAt}>{formatDateTime(review.reviewedAt)}</time>
              </>
            ) : null}
          </p>
        </div>
      </figcaption>
      <blockquote className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-700">
        {review.feedback?.trim() ? review.feedback : 'No written feedback for this attempt.'}
      </blockquote>
    </figure>
  );
}

export default FeedbackBox;
