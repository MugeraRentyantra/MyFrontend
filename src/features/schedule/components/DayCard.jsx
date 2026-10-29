import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, StatusBadge } from '@/shared/components/ui';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Lock,
} from '@/shared/icons';
import { paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { dayElementId } from '../utils/scheduleHelpers';

function DayMarker({ dayNumber, completed, isNext }) {
  return (
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        completed && 'bg-emerald-600 text-white',
        !completed && isNext && 'bg-brand-600 text-white ring-4 ring-brand-100',
        !completed && !isNext && 'bg-slate-100 text-slate-600',
      )}
      aria-hidden="true"
    >
      {completed ? <Check className="h-5 w-5" strokeWidth={3} /> : dayNumber}
    </span>
  );
}

/** Locked preview row: day number and title only (no activity, SOP or task before payment). */
function LockedDayCard({ day, className }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card',
        className,
      )}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500"
        aria-hidden="true"
      >
        {day.dayNumber}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Day {day.dayNumber}
        </p>
        <p className="truncate text-sm font-medium text-slate-700">{day.title}</p>
      </div>
      <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span className="sr-only">Locked</span>
    </div>
  );
}

/**
 * One day of the schedule (GP3). `locked` renders the pre-payment preview (number + title + lock).
 * Otherwise: activity, required evidence, the day's task with its status and links to the task and
 * the SOP. Completed days show a check; the next incomplete day is highlighted ("Up next").
 */
export function DayCard({ day, isNext = false, locked = false, className }) {
  const titleId = useId();
  if (!day) return null;
  if (locked) return <LockedDayCard day={day} className={className} />;

  const { dayNumber, title, activity, requiredEvidence, hasSop, task, completed } = day;

  return (
    <article
      id={dayElementId(dayNumber)}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-current={isNext ? 'step' : undefined}
      className={cn(
        'scroll-mt-24 rounded-xl border bg-white p-4 shadow-card transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:p-5',
        isNext ? 'border-brand-300 ring-2 ring-brand-500' : 'border-slate-200',
        className,
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <DayMarker dayNumber={dayNumber} completed={completed} isNext={isNext} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Day {dayNumber}
            </p>
            {isNext ? (
              <Badge variant="brand" size="sm">
                Up next
              </Badge>
            ) : null}
            {completed ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Completed
              </span>
            ) : null}
          </div>
          <h3 id={titleId} className="mt-1 break-words text-base font-semibold text-slate-900">
            {title}
          </h3>
          {activity ? <p className="mt-1.5 text-sm text-slate-600">{activity}</p> : null}
          {requiredEvidence ? (
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span>
                <span className="font-medium text-slate-700">Evidence: </span>
                {requiredEvidence}
              </span>
            </p>
          ) : null}

          {task || hasSop ? (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              {task ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  <ClipboardList className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="min-w-0 truncate font-medium text-slate-700">
                    <span className="sr-only">Task: </span>
                    {task.title}
                  </span>
                  <StatusBadge status={task.status} />
                </div>
              ) : (
                <span className="hidden sm:block" aria-hidden="true" />
              )}
              <div className="flex flex-wrap gap-2">
                {hasSop ? (
                  <Button
                    as={Link}
                    to={paths.sop(dayNumber)}
                    variant="outline"
                    size="sm"
                    leftIcon={BookOpen}
                    aria-label={`Read SOP for day ${dayNumber}`}
                    className="h-10 sm:h-8"
                  >
                    Read SOP
                  </Button>
                ) : null}
                {task?.progressId ? (
                  <Button
                    as={Link}
                    to={paths.task(task.progressId)}
                    variant={isNext ? 'primary' : 'secondary'}
                    size="sm"
                    rightIcon={ArrowRight}
                    aria-label={`Open task: ${task.title}`}
                    className="h-10 sm:h-8"
                  >
                    Open task
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default DayCard;
