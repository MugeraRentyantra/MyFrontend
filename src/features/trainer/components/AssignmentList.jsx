import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  ProgressBar,
  Skeleton,
} from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { AlertTriangle, ArrowRight, Users } from '@/shared/icons';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/helpers';
import { useTrainerAssignments } from '../hooks/useTrainerAssignments';
import {
  completionPercent,
  isInactive,
  isTeamItem,
  ownerName,
  planNameWithDuration,
} from '../utils/reviewHelpers';
import { OwnerCell } from './OwnerCell';

const DEFAULT_LIMIT = 6;

function sortForDashboard(items) {
  // Most pending work first, then the least recently active.
  return [...items].sort((a, b) => {
    const pendingDiff = (Number(b.pendingSubmissions) || 0) - (Number(a.pendingSubmissions) || 0);
    if (pendingDiff !== 0) return pendingDiff;
    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return aTime - bTime;
  });
}

function AssignmentRow({ assignment }) {
  const approved = Number(assignment.approvedTasks) || 0;
  const total = Number(assignment.totalTasks) || 0;
  const pending = Number(assignment.pendingSubmissions) || 0;
  const inactive = isInactive(assignment.lastActivityAt);
  const name = ownerName(assignment);
  const subtitle = planNameWithDuration(assignment.plan) || (isTeamItem(assignment) ? 'Team' : '');

  return (
    <li className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)] sm:items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_10rem]">
      <OwnerCell item={assignment} secondary={subtitle} />

      <ProgressBar
        value={approved}
        max={total || 1}
        size="sm"
        label={
          <span className="text-xs font-normal text-slate-500">
            <span className="tabular">
              {approved}/{total}
            </span>{' '}
            tasks approved
          </span>
        }
        aria-label={`${name}: ${approved} of ${total} tasks approved`}
        aria-valuetext={`${completionPercent(approved, total)}%`}
        showValue
      />

      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-end lg:gap-1">
        {pending > 0 ? (
          <Badge variant="brand">{pending} to review</Badge>
        ) : (
          <span className="text-xs text-slate-500">Nothing to review</span>
        )}
        {inactive ? (
          <Badge variant="warning" icon={AlertTriangle}>
            {assignment.lastActivityAt ? 'Inactive' : 'No activity yet'}
          </Badge>
        ) : (
          <span className="text-xs text-slate-500">
            Active{' '}
            <time dateTime={assignment.lastActivityAt} title={formatDateTime(assignment.lastActivityAt)}>
              {formatRelativeTime(assignment.lastActivityAt)}
            </time>
          </span>
        )}
      </div>
    </li>
  );
}

function AssignmentListSkeleton() {
  return (
    <ul className="divide-y divide-slate-100" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-8 w-8" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="hidden h-2 w-40 sm:block" rounded="full" />
        </li>
      ))}
    </ul>
  );
}

/**
 * KD9: the students and teams assigned to this trainer, with progress (approved / total),
 * pending reviews and last activity. Shows the busiest few; the full list lives in Reports.
 */
export function AssignmentList({ limit = DEFAULT_LIMIT }) {
  const { data, isLoading, isError, error, refetch } = useTrainerAssignments();
  const items = useMemo(() => sortForDashboard(data ?? []), [data]);
  const visible = items.slice(0, limit);
  const hiddenCount = Math.max(0, items.length - visible.length);

  let body;
  if (isLoading) {
    body = (
      <>
        <AssignmentListSkeleton />
        <span className="sr-only" role="status">
          Loading your students and teams
        </span>
      </>
    );
  } else if (isError) {
    body = <ErrorState compact error={error} onRetry={refetch} />;
  } else if (items.length === 0) {
    body = (
      <EmptyState
        compact
        icon={Users}
        title="No students assigned yet"
        description="An admin assigns students and teams to you. They'll appear here with their progress."
      />
    );
  } else {
    body = (
      <ul className="divide-y divide-slate-100">
        {visible.map((assignment) => (
          <AssignmentRow key={assignment._id} assignment={assignment} />
        ))}
      </ul>
    );
  }

  return (
    <Card as="section" padding="none" aria-label="Your students and teams">
      <CardHeader
        title="Your students and teams"
        description={
          items.length > 0
            ? `${items.length} assigned · busiest first`
            : 'Progress of everyone you review'
        }
        action={
          items.length > 0 ? (
            <Button as={Link} to={ROUTES.TRAINER_REPORTS} variant="ghost" size="sm" rightIcon={ArrowRight}>
              {hiddenCount > 0 ? `View all ${items.length}` : 'Open reports'}
            </Button>
          ) : null
        }
        className="pb-4"
      />
      <div className="border-t border-slate-100">{body}</div>
    </Card>
  );
}

export default AssignmentList;
