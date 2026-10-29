import { useEffect, useRef } from 'react';
import { Badge, Button } from '@/shared/components/ui';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Clock,
  Eye,
  ListChecks,
  Pencil,
  Trash2,
  UserCheck,
} from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { pluralize } from '@/shared/utils/helpers';
import { formatHours } from '../utils/format';

const ICON_BUTTON = 'sm:h-9 sm:w-9';

function Meta({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Tasks of one schedule version in sequence order (KD7). Drafts get up/down reorder buttons plus
 * Edit / Delete; read-only versions get a View button. Keyboard focus follows a moved task.
 * Move buttons stay enabled while a reorder is saving (disabling them would drop keyboard focus);
 * the page ignores moves until the previous one settles.
 */
export function TaskList({
  tasks = [],
  days = [],
  readOnly = false,
  isReordering = false,
  onMove,
  onEdit,
  onView,
  onDelete,
}) {
  const byId = new Map(tasks.map((task) => [task._id, task]));
  const dayNumbers = new Set(days.map((day) => day.dayNumber));
  const controlsRef = useRef(new Map());
  const pendingFocusRef = useRef(null);

  // After a move the clicked button may now be disabled (top / bottom): focus a sensible neighbour.
  useEffect(() => {
    const request = pendingFocusRef.current;
    if (!request) return;
    pendingFocusRef.current = null;
    const pick = (direction) => {
      const node = controlsRef.current.get(`${request.taskId}:${direction}`);
      return node && !node.disabled ? node : null;
    };
    const opposite = request.direction === 'up' ? 'down' : 'up';
    const target = pick(request.direction) || pick(opposite) || pick('edit');
    if (target && document.activeElement !== target) target.focus();
  }, [tasks]);

  const register = (taskId, action) => (node) => {
    const key = `${taskId}:${action}`;
    if (node) controlsRef.current.set(key, node);
    else controlsRef.current.delete(key);
  };

  const move = (task, direction) => {
    pendingFocusRef.current = { taskId: task._id, direction };
    onMove?.(task, direction);
  };

  return (
    <ol className="divide-y divide-slate-100" aria-busy={isReordering || undefined}>
      {tasks.map((task, index) => {
        const isFirst = index === 0;
        const isLast = index === tasks.length - 1;
        const prerequisites = (task.prerequisiteTaskIds ?? [])
          .map((id) => byId.get(id))
          .filter(Boolean);
        const criteriaCount = Array.isArray(task.acceptanceCriteria) ? task.acceptanceCriteria.length : 0;
        const hasDay = task.dayNumber && dayNumbers.has(task.dayNumber);

        return (
          <li key={task._id} className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5">
            <span
              className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/15"
              aria-hidden="true"
            >
              {task.sequence ?? index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold text-slate-900">
                    <span className="sr-only">Task {task.sequence ?? index + 1}: </span>
                    {task.title}
                  </h3>
                  {task.problemStatement ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{task.problemStatement}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  {readOnly ? (
                    <Button
                      ref={register(task._id, 'edit')}
                      variant="outline"
                      size="sm"
                      leftIcon={Eye}
                      onClick={() => onView?.(task)}
                      aria-label={`View task: ${task.title}`}
                    >
                      View
                    </Button>
                  ) : (
                    <>
                      <Button
                        ref={register(task._id, 'up')}
                        variant="ghost"
                        size="icon"
                        className={ICON_BUTTON}
                        aria-label={`Move “${task.title}” up`}
                        disabled={isFirst}
                        onClick={() => move(task, 'up')}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        ref={register(task._id, 'down')}
                        variant="ghost"
                        size="icon"
                        className={ICON_BUTTON}
                        aria-label={`Move “${task.title}” down`}
                        disabled={isLast}
                        onClick={() => move(task, 'down')}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        ref={register(task._id, 'edit')}
                        variant="outline"
                        size="sm"
                        leftIcon={Pencil}
                        className="ml-1 h-10 sm:h-9"
                        onClick={() => onEdit?.(task)}
                        aria-label={`Edit task: ${task.title}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(ICON_BUTTON, 'hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-rose-500')}
                        aria-label={`Delete task: ${task.title}`}
                        onClick={() => onDelete?.(task)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                <Meta icon={CalendarDays}>{hasDay ? `Day ${task.dayNumber}` : 'Any day'}</Meta>
                <Meta icon={Clock}>{formatHours(task.estimatedHours)}</Meta>
                <Meta icon={ListChecks}>{pluralize(criteriaCount, 'criterion', 'criteria')}</Meta>
                {task.requiresTrainerReview ? (
                  <Badge variant="brand" icon={UserCheck}>
                    Trainer review
                  </Badge>
                ) : (
                  <Badge variant="neutral">No trainer review</Badge>
                )}
              </div>

              {prerequisites.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-500">Requires</span>
                  <ul className="flex min-w-0 flex-wrap gap-1.5">
                    {prerequisites.map((item) => (
                      <li
                        key={item._id}
                        className="max-w-[16rem] truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                        title={item.title}
                      >
                        <span className="tabular">#{item.sequence}</span> {item.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default TaskList;
