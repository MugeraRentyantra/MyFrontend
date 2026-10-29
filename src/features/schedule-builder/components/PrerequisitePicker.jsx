import { useId, useMemo, useState } from 'react';
import { Checkbox, SearchBar } from '@/shared/components/ui';
import { AlertTriangle, X } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { buildPrerequisiteMap, wouldCreateCycle } from '../utils/graph';

const SEARCH_THRESHOLD = 8;

/**
 * Prerequisites for one task (KD7). Only tasks that come EARLIER in the order (lower sequence) can
 * be picked; a choice that would create a loop is disabled with the reason. Selected tasks are shown
 * as removable chips. Controlled: `value` (task ids) + `onChange(ids)`.
 *
 * `taskId` is null for a new task; `sequence` is the task's position (a new task goes last).
 */
export function PrerequisitePicker({
  tasks = [],
  taskId = null,
  sequence,
  value = [],
  onChange,
  onBlur,
  error,
  disabled = false,
}) {
  const baseId = useId();
  const legendId = `${baseId}-legend`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(value), [value]);
  const byId = useMemo(() => new Map(tasks.map((task) => [task._id, task])), [tasks]);

  const position = sequence ?? Number.POSITIVE_INFINITY;

  const options = useMemo(() => {
    const graph = buildPrerequisiteMap(tasks);
    return tasks
      .filter((task) => task._id !== taskId && (Number(task.sequence) || 0) < position)
      .map((task) => ({
        task,
        reason: wouldCreateCycle(tasks, taskId, task._id, graph)
          ? 'This task already depends on the one you are editing, so it would create a loop.'
          : null,
      }));
  }, [tasks, taskId, position]);

  const laterCount = tasks.filter(
    (task) => task._id !== taskId && (Number(task.sequence) || 0) >= position,
  ).length;

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? options.filter(({ task }) =>
        `${task.sequence} ${task.title ?? ''}`.toLowerCase().includes(needle),
      )
    : options;

  const toggle = (id) => {
    if (disabled) return;
    const next = selected.has(id) ? value.filter((item) => item !== id) : [...value, id];
    // Keep the chips in task order.
    next.sort((a, b) => (Number(byId.get(a)?.sequence) || 0) - (Number(byId.get(b)?.sequence) || 0));
    onChange?.(next);
  };

  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <fieldset
      className="min-w-0 space-y-3"
      aria-describedby={[hintId, errorMessage ? errorId : null].filter(Boolean).join(' ')}
      onBlur={onBlur}
    >
      <legend id={legendId} className="text-sm font-medium text-slate-700">
        Prerequisites
      </legend>
      <p id={hintId} className="!mt-1 text-xs text-slate-500">
        Students need these approved before this task unlocks. Only earlier tasks can be selected.
      </p>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Selected prerequisites">
          {value.map((id) => {
            const task = byId.get(id);
            const title = task?.title ?? 'Unknown task';
            return (
              <li
                key={id}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/20"
              >
                <span className="truncate">
                  {task ? <span className="tabular">#{task.sequence} </span> : null}
                  {title}
                </span>
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    aria-label={`Remove prerequisite: ${title}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="w-2" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">None selected. This task is available from the start.</p>
      )}

      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          There are no earlier tasks to depend on yet.
        </p>
      ) : (
        <div className="space-y-2">
          {options.length > SEARCH_THRESHOLD ? (
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Filter earlier tasks…"
              aria-label="Filter earlier tasks"
              onKeyDown={(event) => {
                // Filtering only: Enter must not submit the surrounding task form.
                if (event.key === 'Enter') event.preventDefault();
              }}
            />
          ) : null}
          <ul
            className="scrollbar-thin max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white"
            aria-labelledby={legendId}
          >
            {visible.length === 0 ? (
              <li className="px-3 py-3 text-sm text-slate-500">No earlier task matches “{query.trim()}”.</li>
            ) : (
              visible.map(({ task, reason }) => {
                const isSelected = selected.has(task._id);
                const isBlocked = Boolean(reason) && !isSelected;
                return (
                  <li key={task._id} className={cn('px-3 py-2.5', isBlocked && 'bg-slate-50/70')}>
                    <Checkbox
                      id={`${baseId}-${task._id}`}
                      checked={isSelected}
                      onChange={() => toggle(task._id)}
                      disabled={disabled || isBlocked}
                      label={
                        <>
                          <span className="tabular text-slate-500">#{task.sequence}</span>{' '}
                          <span className="text-slate-800">{task.title}</span>
                        </>
                      }
                      description={
                        reason ? (
                          <span className="mt-0.5 flex items-start gap-1 text-xs text-amber-700">
                            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {reason}
                          </span>
                        ) : null
                      }
                    />
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {laterCount > 0 ? (
        <p className="text-xs text-slate-500">
          {laterCount === 1
            ? '1 later task is not shown: tasks can only depend on tasks that come before them.'
            : `${laterCount} later tasks are not shown: tasks can only depend on tasks that come before them.`}
        </p>
      ) : null}

      {errorMessage ? (
        <p id={errorId} role="alert" className="text-xs text-rose-600">
          {errorMessage}
        </p>
      ) : null}
    </fieldset>
  );
}

export default PrerequisitePicker;
