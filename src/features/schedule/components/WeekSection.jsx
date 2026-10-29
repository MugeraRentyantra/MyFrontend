import { useId } from 'react';
import { CheckCircle2, ChevronDown } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDayRange } from '../utils/scheduleHelpers';

/**
 * A week of the schedule: "Week 1 · Days 1–7" with completion, collapsible (controlled through
 * `open` + `onToggle(nextOpen)`). Without `onToggle` it is a plain, always-open section.
 */
export function WeekSection({
  week,
  firstDay,
  lastDay,
  completedCount = 0,
  dayCount = 0,
  open = true,
  onToggle,
  showProgress = true,
  children,
  className,
}) {
  const headingId = useId();
  const panelId = useId();
  const collapsible = typeof onToggle === 'function';
  const isComplete = dayCount > 0 && completedCount === dayCount;
  const range = formatDayRange(firstDay, lastDay);

  const status = showProgress ? (
    <span className="flex shrink-0 items-center gap-1.5 text-sm text-slate-500">
      {isComplete ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <span className="font-medium text-emerald-700">All done</span>
        </>
      ) : (
        <span className="tabular">
          {completedCount}/{dayCount} complete
        </span>
      )}
    </span>
  ) : null;

  const label = (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <span className="text-base font-semibold text-slate-900">Week {week}</span>
      <span className="text-sm font-normal text-slate-500">
        <span aria-hidden="true">· </span>
        {range}
      </span>
    </span>
  );

  return (
    <section aria-labelledby={headingId} className={cn('space-y-3', className)}>
      <h2 id={headingId} className="m-0">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => onToggle(!open)}
            className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left transition-colors duration-150 hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {label}
            <span className="flex shrink-0 items-center gap-3">
              {status}
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform duration-150',
                  open && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </span>
          </button>
        ) : (
          <span className="flex min-h-10 items-center justify-between gap-3 px-1">
            {label}
            {status}
          </span>
        )}
      </h2>
      <div id={panelId} hidden={collapsible ? !open : undefined}>
        {children}
      </div>
    </section>
  );
}

export default WeekSection;
