import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, ErrorState, Skeleton, StatusBadge } from '@/shared/components/ui';
import { SCHEDULE_STATUS, paths } from '@/shared/constants';
import { Copy, History } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDate, formatDateTime, formatRelativeTime, pluralize } from '@/shared/utils/helpers';
import { useScheduleVersions } from '../hooks/useSchedules';

function VersionDate({ version }) {
  if (version.status !== SCHEDULE_STATUS.DRAFT && version.publishedAt) {
    return (
      <time dateTime={version.publishedAt} title={formatDateTime(version.publishedAt)}>
        Published {formatDate(version.publishedAt)}
      </time>
    );
  }
  if (!version.updatedAt) return null;
  return (
    <time dateTime={version.updatedAt} title={formatDateTime(version.updatedAt)}>
      Updated {formatRelativeTime(version.updatedAt)}
    </time>
  );
}

function VersionSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <li key={item} className="rounded-lg border border-slate-100 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16" rounded="full" />
          </div>
          <Skeleton className="mt-2 h-3 w-32" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Every version of the same designation / domain / duration (KD6), newest first. Each opens in the
 * editor; the current one can be copied into a new draft. Shown as a side panel on lg and inside a
 * Drawer on smaller screens (pass `showHeading={false}` there: the drawer has its own title).
 */
export function VersionList({
  scheduleId,
  currentVersion,
  versionHref = paths.adminSchedule,
  onCreateDraft,
  isCreating = false,
  onNavigate,
  showHeading = true,
  className,
}) {
  const headingId = useId();
  const { data: versions = [], isLoading, isError, error, refetch } = useScheduleVersions(scheduleId);
  const sourceVersion =
    currentVersion ?? versions.find((version) => version._id === scheduleId)?.version;

  let body;
  if (isLoading) {
    body = (
      <>
        <VersionSkeleton />
        <span className="sr-only" role="status">
          Loading versions…
        </span>
      </>
    );
  } else if (isError) {
    body = <ErrorState error={error} title="Couldn't load versions" onRetry={() => refetch()} compact />;
  } else if (versions.length === 0) {
    body = (
      <EmptyState
        compact
        variant="muted"
        icon={History}
        title="No other versions"
        description="New drafts you create from this one will appear here."
      />
    );
  } else {
    body = (
      <ol className="space-y-1.5">
        {versions.map((version) => {
          const isCurrent = version._id === scheduleId;
          return (
            <li key={version._id}>
              <Link
                to={versionHref(version._id)}
                onClick={onNavigate}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'block rounded-lg border px-3 py-2.5 transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                  isCurrent
                    ? 'border-brand-200 bg-brand-50/70'
                    : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    Version {version.version}
                    {isCurrent ? <span className="sr-only"> (open now)</span> : null}
                  </span>
                  <StatusBadge status={version.status} />
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  <VersionDate version={version} />
                </span>
                {typeof version.daysCount === 'number' || typeof version.tasksCount === 'number' ? (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {typeof version.daysCount === 'number' ? pluralize(version.daysCount, 'day') : null}
                    {typeof version.daysCount === 'number' && typeof version.tasksCount === 'number'
                      ? ' · '
                      : null}
                    {typeof version.tasksCount === 'number' ? pluralize(version.tasksCount, 'task') : null}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <section
      aria-labelledby={showHeading ? headingId : undefined}
      aria-label={showHeading ? undefined : 'Versions'}
      className={cn('space-y-4', className)}
    >
      {showHeading ? (
        <div>
          <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Versions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Same designation, domain and duration. New enrollments get the published version.
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Same designation, domain and duration. New enrollments get the published version.
        </p>
      )}

      {body}

      {onCreateDraft ? (
        <div className="border-t border-slate-100 pt-4">
          <Button
            variant="outline"
            fullWidth
            leftIcon={Copy}
            loading={isCreating}
            onClick={onCreateDraft}
            className="h-auto min-h-10 whitespace-normal py-2"
          >
            Create new draft from this version
          </Button>
          <p className="mt-2 text-xs text-slate-500">
            Copies the days and tasks of{' '}
            {sourceVersion ? `version ${sourceVersion}` : 'this version'} into a new draft.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default VersionList;
