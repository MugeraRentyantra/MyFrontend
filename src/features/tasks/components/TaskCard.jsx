import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, StatusBadge } from '@/shared/components/ui';
import { TASK_STATUS, paths } from '@/shared/constants';
import { CheckCircle2, Clock, Hourglass, Lock, MessageSquare, UserCheck } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDate, pluralize } from '@/shared/utils/helpers';
import { formatEffort, getMissingPrerequisites, taskLabel } from '../utils/taskActions';
import { TaskActions } from './TaskActions';

const TITLE_LINK_CLASSES =
  'rounded-sm text-slate-900 transition-colors duration-150 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';

/** "Complete 'X' first" — the first missing prerequisite links to that task. */
function LockedReason({ progress }) {
  const missing = getMissingPrerequisites(progress);
  if (!missing.length) {
    return <span>Unlocks when the earlier tasks are approved</span>;
  }
  const [first, ...rest] = missing;
  const title = first.title || 'the previous task';
  return (
    <span>
      Complete{' '}
      {first.progressId ? (
        <Link to={paths.task(first.progressId)} className="link">
          “{title}”
        </Link>
      ) : (
        <span className="font-medium text-slate-700">“{title}”</span>
      )}
      {rest.length ? ` and ${pluralize(rest.length, 'other task')}` : ''} first
    </span>
  );
}

function StatusNote({ progress }) {
  const iconClass = 'h-4 w-4 shrink-0';
  switch (progress.status) {
    case TASK_STATUS.LOCKED:
      return (
        <p className="flex items-start gap-1.5 text-slate-600">
          <Lock className={cn(iconClass, 'mt-0.5 text-slate-400')} aria-hidden="true" />
          <LockedReason progress={progress} />
        </p>
      );
    case TASK_STATUS.SUBMITTED:
      return (
        <p className="flex items-center gap-1.5">
          <Hourglass className={cn(iconClass, 'text-violet-500')} aria-hidden="true" />
          Waiting for review
        </p>
      );
    case TASK_STATUS.CHANGES_REQUESTED:
      return (
        <p className="flex items-center gap-1.5 text-orange-700">
          <MessageSquare className={iconClass} aria-hidden="true" />
          Your trainer asked for changes
        </p>
      );
    case TASK_STATUS.APPROVED:
      return (
        <p className="flex items-center gap-1.5">
          <CheckCircle2 className={cn(iconClass, 'text-emerald-600')} aria-hidden="true" />
          {progress.approvedAt ? `Approved ${formatDate(progress.approvedAt)}` : 'Approved'}
        </p>
      );
    default:
      return null;
  }
}

/**
 * One task on the board or in the list (GP5): "Task 3", title, status, estimated hours,
 * review-required hint and the allowed actions. `variant="compact"` stacks everything for the
 * narrow board columns.
 */
export function TaskCard({ progress, variant = 'list', className }) {
  const titleId = useId();
  if (!progress) return null;

  const task = progress.task ?? {};
  const isLocked = progress.status === TASK_STATUS.LOCKED;
  const isCompact = variant === 'compact';
  const effort = formatEffort(task.estimatedHours);
  const title = task.title || 'Untitled task';

  const heading = (
    <h3
      id={titleId}
      className={cn(
        'mt-1.5 break-words font-semibold leading-snug',
        isCompact ? 'text-sm' : 'text-base',
        isLocked ? 'text-slate-600' : 'text-slate-900',
      )}
    >
      {isLocked ? title : (
        <Link to={paths.task(progress._id)} className={TITLE_LINK_CLASSES}>
          {title}
        </Link>
      )}
    </h3>
  );

  const details = (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
      {effort ? (
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span>
            <span className="sr-only">Estimated effort: </span>~{effort}
          </span>
        </span>
      ) : null}
      <StatusNote progress={progress} />
    </div>
  );

  return (
    <Card
      as="article"
      padding="none"
      aria-labelledby={titleId}
      className={cn(
        'p-4 transition-colors duration-150',
        !isCompact && 'sm:p-5',
        isLocked ? 'bg-slate-50/80 shadow-none' : 'hover:border-slate-300',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-4',
          !isCompact && 'sm:flex-row sm:items-center sm:justify-between',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {taskLabel(task.sequence)}
            </span>
            <StatusBadge status={progress.status} />
            {task.requiresTrainerReview ? (
              <Badge variant="neutral" icon={UserCheck}>
                Trainer review
              </Badge>
            ) : null}
          </div>
          {heading}
          {details}
        </div>
        <TaskActions
          progress={progress}
          size="sm"
          showIcons={!isCompact}
          stretch={isCompact}
          className={cn('shrink-0', isCompact && 'w-full')}
        />
      </div>
    </Card>
  );
}

export default TaskCard;
