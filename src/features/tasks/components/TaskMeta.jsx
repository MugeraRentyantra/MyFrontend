import { BadgeCheck, CalendarDays, Clock, UserCheck } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatEffort } from '../utils/taskActions';

/** Day number, estimated effort and whether a trainer reviews the task (GP6). */
export function TaskMeta({ task, className }) {
  if (!task) return null;
  const effort = formatEffort(task.estimatedHours);
  const hasDay = task.dayNumber !== null && task.dayNumber !== undefined;

  return (
    <ul
      aria-label="Task details"
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500', className)}
    >
      {hasDay ? (
        <li className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          Day {task.dayNumber}
        </li>
      ) : null}
      {effort ? (
        <li className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span>
            <span className="sr-only">Estimated effort: </span>~{effort}
          </span>
        </li>
      ) : null}
      <li className="inline-flex items-center gap-1.5">
        {task.requiresTrainerReview ? (
          <>
            <UserCheck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            Trainer review required
          </>
        ) : (
          <>
            <BadgeCheck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            No trainer review needed
          </>
        )}
      </li>
    </ul>
  );
}

export default TaskMeta;
