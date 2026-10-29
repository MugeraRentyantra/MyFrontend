import { Button, Card, ProgressBar } from '@/shared/components/ui';
import { Target } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

/** Progress through the schedule plus a shortcut to the next incomplete day. */
export function ScheduleSummary({
  completedDays = 0,
  totalDays = 0,
  nextDay,
  version,
  onJumpToNext,
  className,
}) {
  const allDone = totalDays > 0 && completedDays >= totalDays;

  return (
    <Card className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0 flex-1">
        <ProgressBar
          value={completedDays}
          max={Math.max(totalDays, 1)}
          label="Days complete"
          showValue
          variant={allDone ? 'success' : 'brand'}
          aria-valuetext={`${completedDays} of ${totalDays} days complete`}
        />
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium text-slate-900">
            {completedDays} of {totalDays}
          </span>{' '}
          days complete
          {nextDay ? (
            <>
              <span aria-hidden="true"> · </span>
              <span className="sr-only">. </span>
              Up next: Day {nextDay.dayNumber}, {nextDay.title}
            </>
          ) : null}
        </p>
        {version ? (
          <p className="mt-1 text-xs text-slate-500">
            Your schedule follows version {version} of this plan.
          </p>
        ) : null}
      </div>
      {nextDay && onJumpToNext ? (
        <Button
          variant="outline"
          leftIcon={Target}
          onClick={() => onJumpToNext(nextDay.dayNumber)}
          className="w-full shrink-0 sm:w-auto"
        >
          Go to day {nextDay.dayNumber}
        </Button>
      ) : null}
    </Card>
  );
}

export default ScheduleSummary;
