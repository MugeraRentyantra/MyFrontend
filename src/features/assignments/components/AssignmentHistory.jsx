import { Badge, Button, Skeleton } from '@/shared/components/ui';
import { History, RefreshCw } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/errors';
import { formatDate, formatDateTime } from '@/shared/utils/helpers';
import { isAssignmentActive } from '../utils/assignmentHelpers';

/**
 * KD11: every trainer a student/team has had, newest first. Reassigning ends the previous
 * assignment but keeps it here. `items` are assignment rows from GET /admin/trainer-assignments.
 */
export function AssignmentHistory({ items, loading = false, error = null, onRetry, className }) {
  if (loading) {
    return (
      <div className={cn('space-y-2', className)} aria-hidden="true">
        <Skeleton className="h-12 w-full" rounded="lg" />
        <Skeleton className="h-12 w-full" rounded="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700',
          className,
        )}
      >
        <span>{getErrorMessage(error, "We couldn't load the assignment history.")}</span>
        {onRetry ? (
          <Button variant="outline" size="sm" leftIcon={RefreshCw} onClick={() => onRetry()}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return (
      <p className={cn('flex items-center gap-2 text-sm text-slate-500', className)}>
        <History className="h-4 w-4 shrink-0" aria-hidden="true" />
        No trainer has been assigned yet.
      </p>
    );
  }

  return (
    <ol className={cn('divide-y divide-slate-100 rounded-lg border border-slate-200', className)}>
      {list.map((row) => {
        const active = isAssignmentActive(row);
        return (
          <li key={row._id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {row.trainer?.name ?? 'Unknown trainer'}
              </p>
              <p className="text-xs text-slate-500">
                <time dateTime={row.assignedAt} title={formatDateTime(row.assignedAt)}>
                  {formatDate(row.assignedAt)}
                </time>
                {' – '}
                {active ? (
                  'now'
                ) : (
                  <time dateTime={row.unassignedAt} title={formatDateTime(row.unassignedAt)}>
                    {row.unassignedAt ? formatDate(row.unassignedAt) : 'ended'}
                  </time>
                )}
                {row.assignedBy?.name ? ` · assigned by ${row.assignedBy.name}` : ''}
              </p>
            </div>
            <Badge variant={active ? 'success' : 'neutral'} dot>
              {active ? 'Active' : 'Ended'}
            </Badge>
          </li>
        );
      })}
    </ol>
  );
}

export default AssignmentHistory;
