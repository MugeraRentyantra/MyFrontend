import { Link } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  ProgressBar,
  Skeleton,
  StatusBadge,
} from '@/shared/components/ui';
import { ArrowRight, ListChecks, Target } from '@/shared/icons';
import { ROUTES, TASK_STATUS, getStatusMeta } from '@/shared/constants';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/helpers';

/** Statuses listed under the meter (approved is the meter itself). */
const BREAKDOWN = [
  TASK_STATUS.CHANGES_REQUESTED,
  TASK_STATUS.SUBMITTED,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.AVAILABLE,
  TASK_STATUS.LOCKED,
];

function ProgressSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" rounded="full" />
      </div>
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" rounded="full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Shared progress of an ACTIVE team (SN11): approved / total tasks and each member's
 * contributions (submission count and last submission). Props mirror a query result.
 */
export function TeamProgressCard({ data, isLoading = false, error = null, onRetry, currentUserId, className }) {
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const total = tasks.length;
  const approved = tasks.filter((task) => task?.status === TASK_STATUS.APPROVED).length;
  const breakdown = BREAKDOWN.map((status) => ({
    status,
    count: tasks.filter((task) => task?.status === status).length,
  })).filter((item) => item.count > 0);
  const contributions = [...(Array.isArray(data?.contributions) ? data.contributions : [])].sort(
    (a, b) =>
      (Number(b.submissions) || 0) - (Number(a.submissions) || 0) ||
      String(a.name ?? '').localeCompare(String(b.name ?? '')),
  );

  let body;
  if (isLoading) {
    body = <ProgressSkeleton />;
  } else if (error) {
    body = <ErrorState compact error={error} title="Couldn't load team progress" onRetry={onRetry} />;
  } else if (total === 0) {
    body = (
      <EmptyState
        compact
        icon={ListChecks}
        title="No tasks yet"
        description="Your team's tasks will appear here as soon as the schedule is set up."
      />
    );
  } else {
    body = (
      <div className="space-y-6">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <p className="font-medium text-slate-700">Tasks approved</p>
            <p className="text-slate-500">
              <span className="font-semibold text-slate-900">{approved}</span> of {total}
            </p>
          </div>
          <ProgressBar
            value={approved}
            max={total}
            size="lg"
            aria-label="Tasks approved"
            aria-valuetext={`${approved} of ${total} tasks approved`}
          />
          {breakdown.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Other tasks by status">
              {breakdown.map((item) => (
                <li key={item.status}>
                  <StatusBadge
                    status={item.status}
                    label={`${getStatusMeta(item.status).label}: ${item.count}`}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Contributions</h3>
          <p className="text-xs text-slate-500">Submissions made by each member.</p>
          {contributions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No submissions yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {contributions.map((item) => {
                const count = Number(item.submissions) || 0;
                return (
                  <li
                    key={item.userId ?? item.name}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={item.name} size="sm" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900">
                          <span className="truncate">{item.name || 'Team member'}</span>
                          {currentUserId && item.userId === currentUserId ? <Badge>You</Badge> : null}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.lastSubmittedAt ? (
                            <>
                              Last submitted{' '}
                              <time
                                dateTime={item.lastSubmittedAt}
                                title={formatDateTime(item.lastSubmittedAt)}
                              >
                                {formatRelativeTime(item.lastSubmittedAt)}
                              </time>
                            </>
                          ) : (
                            'No submissions yet'
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{count}</span>{' '}
                      {count === 1 ? 'submission' : 'submissions'}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card padding="none" className={className}>
      <CardHeader
        icon={Target}
        title="Team progress"
        description="Tasks are shared: an approval counts for the whole team."
        action={
          <Button as={Link} to={ROUTES.TASKS} variant="ghost" size="sm" rightIcon={ArrowRight}>
            Task board
          </Button>
        }
      />
      <CardBody>{body}</CardBody>
    </Card>
  );
}

export default TeamProgressCard;
