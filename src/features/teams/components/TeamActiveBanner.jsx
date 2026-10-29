import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { CalendarDays, ListChecks, Rocket } from '@/shared/icons';
import { ROUTES } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

/** Shown once every member is ready and the team has started (SN11). */
export function TeamActiveBanner({ className }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-6',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
            aria-hidden="true"
          >
            <Rocket className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="text-base font-semibold text-slate-900">
              Your team is active
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Everyone has joined, taken the assessment and paid. Your shared schedule and task board
              are open — work submitted by any member counts for the whole team.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <Button as={Link} to={ROUTES.TASKS} leftIcon={ListChecks}>
            Open task board
          </Button>
          <Button as={Link} to={ROUTES.SCHEDULE} variant="outline" leftIcon={CalendarDays}>
            View schedule
          </Button>
        </div>
      </div>
    </section>
  );
}

export default TeamActiveBanner;
