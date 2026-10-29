import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ErrorState,
  SkeletonText,
} from '@/shared/components/ui';
import { ArrowRight, CheckCheck, Hourglass } from '@/shared/icons';
import { ROUTES, TASK_STATUS, buildPath, paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { formatRelativeTime } from '@/shared/utils/helpers';

const PREVIEW_LIMIT = 3;

/** Submitted tasks waiting for a trainer review (oldest first), with a count. */
export function PendingReviewsCard({
  awaitingReview = [],
  isLoading = false,
  isError = false,
  error,
  onRetry,
  className,
}) {
  const count = awaitingReview.length;
  const preview = awaitingReview.slice(0, PREVIEW_LIMIT);

  let content;
  if (isLoading) {
    content = <SkeletonText lines={3} />;
  } else if (isError) {
    content = (
      <ErrorState compact error={error} title="We couldn't load your reviews" onRetry={onRetry} />
    );
  } else {
    content = (
      <>
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight text-slate-900">{count}</span>
          <span className="text-sm text-slate-500">
            {count === 1 ? 'submission waiting' : 'submissions waiting'}
          </span>
        </p>
        {count === 0 ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
            <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            Nothing is waiting for review right now.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {preview.map((progress) => (
              <li key={progress._id}>
                <Link
                  to={paths.task(progress._id)}
                  className="group flex min-h-10 items-center justify-between gap-3 rounded-md py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-brand-700">
                      {progress.task?.title ?? 'Task'}
                    </span>
                    {progress.submittedAt ? (
                      <span className="block text-xs text-slate-500">
                        Submitted {formatRelativeTime(progress.submittedAt)}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-600"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {count > PREVIEW_LIMIT ? (
          <p className="mt-2 text-xs text-slate-500">and {count - PREVIEW_LIMIT} more</p>
        ) : null}
      </>
    );
  }

  return (
    <Card padding="none" className={cn('flex flex-col', className)}>
      <CardHeader
        title="Awaiting review"
        description="Work your trainer hasn't reviewed yet."
        icon={Hourglass}
      />
      <CardBody className="flex-1">{content}</CardBody>
      <CardFooter>
        <Button
          as={Link}
          to={buildPath(ROUTES.TASKS, {}, { status: TASK_STATUS.SUBMITTED })}
          variant="ghost"
          size="sm"
          rightIcon={ArrowRight}
          className="h-10 sm:h-8"
        >
          View submitted tasks
        </Button>
      </CardFooter>
    </Card>
  );
}

export default PendingReviewsCard;
