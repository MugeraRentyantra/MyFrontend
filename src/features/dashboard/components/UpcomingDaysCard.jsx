import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ErrorState,
  SkeletonText,
  StatusBadge,
} from '@/shared/components/ui';
import { ArrowRight, BookOpen, CalendarCheck, CalendarDays } from '@/shared/icons';
import { ROUTES, paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

/** The next few schedule days (from the first incomplete one) with their SOP and task links. */
export function UpcomingDaysCard({
  days = [],
  completedDays = 0,
  totalDays = 0,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  className,
}) {
  let content;
  if (isLoading) {
    content = <SkeletonText lines={5} />;
  } else if (isError) {
    content = (
      <ErrorState compact error={error} title="We couldn't load your schedule" onRetry={onRetry} />
    );
  } else if (totalDays === 0) {
    content = (
      <p className="text-sm text-slate-600">Your schedule is being prepared. Check back soon.</p>
    );
  } else if (days.length === 0) {
    content = (
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
          aria-hidden="true"
        >
          <CalendarCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Schedule complete</p>
          <p className="mt-1 text-sm text-slate-600">
            You&apos;ve completed every day. SOPs stay available to re-read.
          </p>
        </div>
      </div>
    );
  } else {
    content = (
      <ol className="-my-2 divide-y divide-slate-100">
        {days.map((day, index) => (
          <li key={day.dayNumber} className="flex gap-3 py-3">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg',
                index === 0 ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700',
              )}
              aria-hidden="true"
            >
              <span className="text-[10px] font-semibold uppercase leading-none tracking-wide">
                Day
              </span>
              <span className="text-sm font-semibold leading-tight">{day.dayNumber}</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 truncate text-sm font-medium text-slate-900">
                  <span className="sr-only">Day {day.dayNumber}: </span>
                  {day.title}
                </p>
                {index === 0 ? (
                  <Badge variant="brand" size="sm">
                    Up next
                  </Badge>
                ) : null}
              </div>
              {day.activity ? (
                <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{day.activity}</p>
              ) : null}
              {day.task || day.hasSop ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {day.task ? <StatusBadge status={day.task.status} /> : null}
                  {day.hasSop ? (
                    <Link
                      to={paths.sop(day.dayNumber)}
                      className="link inline-flex min-h-10 items-center gap-1 text-sm sm:min-h-6"
                      aria-label={`Read the SOP for day ${day.dayNumber}`}
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Read SOP
                    </Link>
                  ) : null}
                  {day.task?.progressId ? (
                    <Link
                      to={paths.task(day.task.progressId)}
                      className="link inline-flex min-h-10 items-center gap-1 text-sm sm:min-h-6"
                      aria-label={`Open task: ${day.task.title}`}
                    >
                      Open task
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <Card padding="none" className={cn('flex flex-col', className)}>
      <CardHeader
        title="Coming up"
        icon={CalendarDays}
        description={
          totalDays > 0 && !isLoading && !isError
            ? `${completedDays} of ${totalDays} days complete`
            : undefined
        }
      />
      <CardBody className="flex-1">{content}</CardBody>
      <CardFooter>
        <Button
          as={Link}
          to={ROUTES.SCHEDULE}
          variant="ghost"
          size="sm"
          rightIcon={ArrowRight}
          className="h-10 sm:h-8"
        >
          Full schedule
        </Button>
      </CardFooter>
    </Card>
  );
}

export default UpcomingDaysCard;
