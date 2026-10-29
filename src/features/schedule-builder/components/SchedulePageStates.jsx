import { Link } from 'react-router-dom';
import { Button, ErrorState, PageHeader, Skeleton, SkeletonCard } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { ArrowLeft } from '@/shared/icons';
import { getErrorStatus } from '@/shared/utils/errors';

/** First-load placeholder for the schedule editor and task pages. */
export function SchedulePageSkeleton({ withSidePanel = true }) {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading schedule…
      </span>
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-20" rounded="full" />
          <Skeleton className="h-5 w-24" rounded="full" />
          <Skeleton className="h-5 w-32" rounded="full" />
        </div>
        <Skeleton className="mt-4 h-9 w-48" />
      </div>
      <div className={withSidePanel ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]' : undefined}>
        <div className="space-y-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
        {withSidePanel ? <SkeletonCard lines={5} className="hidden lg:block" /> : null}
      </div>
    </div>
  );
}

/** The schedule couldn't be loaded (404 gets its own wording). Keeps a way back to the list. */
export function ScheduleLoadError({ error, onRetry, title = 'Schedule' }) {
  const isMissing = getErrorStatus(error) === 404;
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        breadcrumbs={[{ label: 'Schedules', to: ROUTES.ADMIN_SCHEDULES }, { label: title }]}
      />
      <ErrorState
        error={error}
        title={isMissing ? 'Schedule not found' : "Couldn't load this schedule"}
        message={
          isMissing ? 'It may have been removed, or the link is incomplete.' : undefined
        }
        onRetry={isMissing ? undefined : onRetry}
      />
      <div className="flex justify-center">
        <Button as={Link} to={ROUTES.ADMIN_SCHEDULES} variant="outline" leftIcon={ArrowLeft}>
          Back to schedules
        </Button>
      </div>
    </div>
  );
}
