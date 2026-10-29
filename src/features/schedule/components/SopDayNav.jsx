import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from '@/shared/icons';
import { paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

const LINK_CLASSES =
  'group flex min-h-16 min-w-0 flex-1 flex-col justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card transition duration-150 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';

function DayLink({ day, direction }) {
  const isPrevious = direction === 'previous';
  const Icon = isPrevious ? ArrowLeft : ArrowRight;
  return (
    <Link
      to={paths.sop(day.dayNumber)}
      rel={isPrevious ? 'prev' : 'next'}
      className={cn(LINK_CLASSES, isPrevious ? 'items-start text-left' : 'items-end text-right')}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        {isPrevious ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        {isPrevious ? 'Previous' : 'Next'} · Day {day.dayNumber}
        {isPrevious ? null : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      </span>
      {day.title ? (
        <span className="mt-1 line-clamp-1 max-w-full text-sm font-medium text-slate-900 group-hover:text-brand-700">
          {day.title}
        </span>
      ) : null}
    </Link>
  );
}

/** Previous / next day SOP links at the end of the reader. */
export function SopDayNav({ previous, next, className }) {
  if (!previous && !next) return null;
  return (
    <nav aria-label="SOP days" className={cn('no-print flex flex-col gap-3 sm:flex-row', className)}>
      {previous ? <DayLink day={previous} direction="previous" /> : <span className="hidden flex-1 sm:block" />}
      {next ? <DayLink day={next} direction="next" /> : <span className="hidden flex-1 sm:block" />}
    </nav>
  );
}

export default SopDayNav;
