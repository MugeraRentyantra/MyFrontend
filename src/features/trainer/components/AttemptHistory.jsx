import { Card, CardBody, CardHeader, StatusBadge } from '@/shared/components/ui';
import { History, MessageSquare } from '@/shared/icons';
import { formatDateTime, pluralize } from '@/shared/utils/helpers';
import { GithubLink } from './SubmissionNotes';

function byAttemptDesc(a, b) {
  const diff = (Number(b.attemptNumber) || 0) - (Number(a.attemptNumber) || 0);
  if (diff !== 0) return diff;
  return new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime();
}

function AttemptItem({ attempt }) {
  const review = attempt.review;
  const status = review?.decision ?? attempt.reviewStatus;
  const shots = Array.isArray(attempt.screenshots) ? attempt.screenshots.length : 0;
  const feedback = String(review?.feedback ?? '').trim();

  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          Attempt <span className="tabular">#{attempt.attemptNumber ?? '—'}</span>
        </p>
        <StatusBadge status={status} />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Submitted{' '}
        <time dateTime={attempt.submittedAt}>{formatDateTime(attempt.submittedAt)}</time>
        {attempt.submittedBy?.name ? ` by ${attempt.submittedBy.name}` : ''}
        {shots ? ` · ${pluralize(shots, 'screenshot')}` : ''}
      </p>

      {review ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {review.trainer?.name ? `${review.trainer.name}` : 'Reviewer'}
            {review.reviewedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={review.reviewedAt} className="font-normal text-slate-500">
                  {formatDateTime(review.reviewedAt)}
                </time>
              </>
            ) : null}
          </p>
          {feedback ? (
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-slate-700">{feedback}</p>
          ) : (
            <p className="mt-1.5 text-sm text-slate-500">No feedback was left.</p>
          )}
        </div>
      ) : null}

      {attempt.description || attempt.githubUrl ? (
        <details className="group mt-3">
          <summary className="cursor-pointer rounded text-sm font-medium text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            Show what was submitted
          </summary>
          <div className="mt-3 space-y-3">
            {attempt.description ? (
              <p className="whitespace-pre-wrap break-words text-sm text-slate-600">
                {attempt.description}
              </p>
            ) : null}
            {attempt.githubUrl ? <GithubLink url={attempt.githubUrl} /> : null}
          </div>
        </details>
      ) : null}
    </li>
  );
}

/** KD10: earlier attempts at the same task, newest first, with the decision and feedback given. */
export function AttemptHistory({ attempts }) {
  const list = Array.isArray(attempts) ? [...attempts].filter(Boolean).sort(byAttemptDesc) : [];

  return (
    <Card as="section" padding="none" aria-label="Earlier attempts">
      <CardHeader
        title="Earlier attempts"
        description={
          list.length
            ? `${pluralize(list.length, 'earlier attempt')} at this task`
            : 'This is the first attempt at this task.'
        }
      />
      {list.length ? (
        <CardBody>
          <ol className="space-y-3">
            {list.map((attempt) => (
              <AttemptItem key={attempt._id ?? attempt.attemptNumber} attempt={attempt} />
            ))}
          </ol>
        </CardBody>
      ) : (
        <CardBody className="pt-3">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <History className="h-4 w-4" aria-hidden="true" />
            No earlier feedback to compare against.
          </p>
        </CardBody>
      )}
    </Card>
  );
}

export default AttemptHistory;
