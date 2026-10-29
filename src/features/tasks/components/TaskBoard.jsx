import { useId } from 'react';
import { Lock } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { BOARD_COLUMNS, LOCKED_GROUP, sortBySequence, sortForStatuses } from '../utils/taskActions';
import { TaskCard } from './TaskCard';

function CountPill({ value }) {
  return (
    <span className="tabular rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      {value}
    </span>
  );
}

function BoardColumn({ column, tasks }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col rounded-xl bg-slate-100/80 p-3"
    >
      <div className="flex items-center justify-between gap-2 px-1 pb-3">
        <h2 id={headingId} className="text-sm font-semibold text-slate-700">
          {column.title}
        </h2>
        <CountPill value={tasks.length} />
      </div>
      {tasks.length ? (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task._id}>
              <TaskCard progress={task} variant="compact" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500">
          No tasks here
        </p>
      )}
    </section>
  );
}

/**
 * Board layout (lg and up, GP5): To do (available + changes requested), In progress, In review
 * (submitted) and Done (approved) as columns, with locked tasks in their own row underneath.
 */
export function TaskBoard({ tasks = [], className }) {
  const lockedHeadingId = useId();
  const locked = sortBySequence(tasks.filter((task) => LOCKED_GROUP.statuses.includes(task.status)));

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {BOARD_COLUMNS.map((column) => (
          <BoardColumn
            key={column.key}
            column={column}
            tasks={sortForStatuses(
              tasks.filter((task) => column.statuses.includes(task.status)),
              column.statuses,
            )}
          />
        ))}
      </div>

      {locked.length ? (
        <section aria-labelledby={lockedHeadingId}>
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              id={lockedHeadingId}
              className="flex items-center gap-2 text-sm font-semibold text-slate-700"
            >
              <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              {LOCKED_GROUP.title}
            </h2>
            <CountPill value={locked.length} />
            <p className="text-sm text-slate-500">
              These unlock when their prerequisite tasks are approved.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {locked.map((task) => (
              <li key={task._id}>
                <TaskCard progress={task} variant="compact" className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** List layout (mobile, or by choice on desktop): every task in sequence order. */
export function TaskList({ tasks = [], className }) {
  return (
    <section aria-label="Tasks" className={className}>
      <h2 className="sr-only">Task list</h2>
      <ul className="space-y-3">
        {sortBySequence(tasks).map((task) => (
          <li key={task._id}>
            <TaskCard progress={task} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default TaskBoard;
