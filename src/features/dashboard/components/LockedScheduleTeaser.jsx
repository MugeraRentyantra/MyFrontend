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
} from '@/shared/components/ui';
import { ArrowRight, CalendarDays, Lock } from '@/shared/icons';
import { ROUTES } from '@/shared/constants';
import { useSchedulePreview } from '@/features/schedule/hooks/useSchedule';
import { sortDays } from '@/features/schedule/utils/scheduleHelpers';
import { cn } from '@/shared/utils/cn';
import { pluralize } from '@/shared/utils/helpers';
import { getEnrollmentPlanId } from '../utils/dashboardHelpers';

const PREVIEW_DAYS = 5;

/**
 * A peek at the plan's schedule for a student who still has to pay: day titles only (public
 * preview, never SOP content), each marked as locked.
 */
export function LockedScheduleTeaser({ enrollment, className }) {
  const planId = getEnrollmentPlanId(enrollment);
  const { data, isLoading, isError, error, refetch } = useSchedulePreview(planId);
  const days = sortDays(data?.days ?? []);
  const totalDays = Number(data?.totalDays ?? days.length);
  const visible = days.slice(0, PREVIEW_DAYS);
  const hiddenCount = Math.max(totalDays - visible.length, 0);

  let content;
  if (isLoading) {
    content = <SkeletonText lines={5} />;
  } else if (isError) {
    content = (
      <ErrorState
        compact
        error={error}
        title="We couldn't load the schedule preview"
        onRetry={refetch}
      />
    );
  } else if (visible.length === 0) {
    content = (
      <p className="text-sm text-slate-600">
        The day-by-day schedule for this plan is being prepared.
      </p>
    );
  } else {
    content = (
      <>
        <ol className="-my-1 divide-y divide-slate-100">
          {visible.map((day) => (
            <li key={day.dayNumber} className="flex items-center gap-3 py-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                aria-hidden="true"
              >
                {day.dayNumber}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                <span className="sr-only">Day {day.dayNumber}: </span>
                {day.title}
              </span>
              <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="sr-only">(locked)</span>
            </li>
          ))}
        </ol>
        {hiddenCount > 0 ? (
          <p className="mt-3 text-sm text-slate-500">+ {pluralize(hiddenCount, 'more day')}</p>
        ) : null}
      </>
    );
  }

  return (
    <Card padding="none" className={cn('flex flex-col', className)}>
      <CardHeader
        title="Your schedule"
        icon={CalendarDays}
        description={
          totalDays > 0
            ? `${pluralize(totalDays, 'day')} of guided work, unlocked after payment.`
            : 'Unlocked after payment.'
        }
        action={
          <Badge icon={Lock} variant="neutral">
            Locked
          </Badge>
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
          Preview full schedule
        </Button>
      </CardFooter>
    </Card>
  );
}

export default LockedScheduleTeaser;
