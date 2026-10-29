import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EnrollmentSwitcher } from '@/features/dashboard/components/EnrollmentSwitcher';
import { describeEnrollment } from '@/features/dashboard/utils/dashboardHelpers';
import { Button, EmptyState, ErrorState, PageHeader } from '@/shared/components/ui';
import { Briefcase, CalendarDays, Lock, Mail } from '@/shared/icons';
import { ENROLLMENT_STATUS, ROUTES, SUPPORT_EMAIL } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { pluralize } from '@/shared/utils/helpers';
import { DayCard } from '../components/DayCard';
import { LockedOverlay } from '../components/LockedOverlay';
import { ScheduleSkeleton } from '../components/ScheduleSkeleton';
import { ScheduleSummary } from '../components/ScheduleSummary';
import { WeekSection } from '../components/WeekSection';
import { useSchedule } from '../hooks/useSchedule';
import {
  countCompletedDays,
  findNextDay,
  groupDaysByWeek,
  scrollToDay,
  sortDays,
  weekOfDay,
} from '../utils/scheduleHelpers';

/** Full schedule of an active enrollment, grouped by week, with the next day highlighted. */
function ActiveSchedule({ scheduleQuery }) {
  const { data, isLoading, isError, error, refetch } = scheduleQuery;
  const days = data?.days;
  const sortedDays = useMemo(() => sortDays(days ?? []), [days]);
  const weeks = useMemo(() => groupDaysByWeek(sortedDays), [sortedDays]);
  const nextDay = useMemo(() => findNextDay(sortedDays), [sortedDays]);
  const completedDays = countCompletedDays(sortedDays);
  const totalDays = Number(data?.totalDays ?? sortedDays.length);

  // week -> open, only for weeks the student toggled; finished weeks start collapsed.
  const [openOverrides, setOpenOverrides] = useState({});
  const isWeekOpen = (group) => openOverrides[group.week] ?? !group.isComplete;
  const setWeekOpen = useCallback((week, open) => {
    setOpenOverrides((previous) => ({ ...previous, [week]: open }));
  }, []);

  // Bring the next incomplete day into view once per (enrollment, next day).
  const scrolledFor = useRef(null);
  const nextDayNumber = nextDay?.dayNumber ?? null;
  const firstDayNumber = sortedDays[0]?.dayNumber ?? null;
  const enrollmentId = data?.enrollmentId ?? null;
  useEffect(() => {
    if (nextDayNumber === null) return undefined;
    const key = `${enrollmentId}:${nextDayNumber}`;
    if (scrolledFor.current === key) return undefined;
    const frame = window.requestAnimationFrame(() => {
      scrolledFor.current = key;
      if (nextDayNumber !== firstDayNumber) scrollToDay(nextDayNumber);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [enrollmentId, nextDayNumber, firstDayNumber]);

  const jumpToDay = useCallback(
    (dayNumber) => {
      setWeekOpen(weekOfDay(dayNumber), true);
      window.requestAnimationFrame(() => scrollToDay(dayNumber, { focus: true }));
    },
    [setWeekOpen],
  );

  if (isLoading) return <ScheduleSkeleton />;
  if (isError) {
    return (
      <ErrorState error={error} title="We couldn't load your schedule" onRetry={() => refetch()} />
    );
  }
  if (sortedDays.length === 0) {
    return (
      <EmptyState
        titleAs="h2"
        icon={CalendarDays}
        title="Your schedule is being prepared"
        description="Your day-by-day plan will appear here soon. Check back shortly."
      />
    );
  }

  return (
    <>
      <ScheduleSummary
        completedDays={completedDays}
        totalDays={totalDays}
        nextDay={nextDay}
        version={data?.version}
        onJumpToNext={jumpToDay}
      />
      <div className="space-y-8">
        {weeks.map((group) => (
          <WeekSection
            key={group.week}
            week={group.week}
            firstDay={group.firstDay}
            lastDay={group.lastDay}
            completedCount={group.completedCount}
            dayCount={group.days.length}
            open={isWeekOpen(group)}
            onToggle={(open) => setWeekOpen(group.week, open)}
          >
            <ol className="space-y-3">
              {group.days.map((day) => (
                <li key={day.dayNumber}>
                  <DayCard day={day} isNext={nextDayNumber === day.dayNumber} />
                </li>
              ))}
            </ol>
          </WeekSection>
        ))}
      </div>
    </>
  );
}

/** Pre-payment preview: day titles from the plan's public preview, all locked. */
function LockedSchedule({ enrollment, previewQuery }) {
  const { data, isLoading, isError, error, refetch } = previewQuery;
  const days = data?.days;
  const weeks = useMemo(() => groupDaysByWeek(days ?? []), [days]);
  const totalDays = Number(data?.totalDays ?? days?.length ?? 0);

  let preview;
  if (isLoading) {
    preview = <ScheduleSkeleton days={3} label="Loading the schedule preview…" />;
  } else if (isError) {
    preview = (
      <ErrorState
        error={error}
        title="We couldn't load the schedule preview"
        onRetry={() => refetch()}
      />
    );
  } else if (weeks.length === 0) {
    preview = (
      <EmptyState
        compact
        icon={CalendarDays}
        title="Schedule coming soon"
        description="The day-by-day plan for this internship is being prepared."
      />
    );
  } else {
    preview = (
      <div className="space-y-8">
        <p className="text-sm text-slate-500">
          {pluralize(totalDays, 'day')} in this plan. Titles only until your payment is confirmed.
        </p>
        {weeks.map((group) => (
          <WeekSection
            key={group.week}
            week={group.week}
            firstDay={group.firstDay}
            lastDay={group.lastDay}
            dayCount={group.days.length}
            showProgress={false}
          >
            <ol className="grid gap-3 sm:grid-cols-2">
              {group.days.map((day) => (
                <li key={day.dayNumber} className="min-w-0">
                  <DayCard day={day} locked />
                </li>
              ))}
            </ol>
          </WeekSection>
        ))}
      </div>
    );
  }

  return (
    <>
      <LockedOverlay enrollment={enrollment} />
      {preview}
    </>
  );
}

function UnavailableSchedule({ enrollment }) {
  const suspended = enrollment.status === ENROLLMENT_STATUS.SUSPENDED;
  return (
    <EmptyState
      titleAs="h2"
      variant="locked"
      icon={Lock}
      title="Schedule unavailable"
      description={
        suspended
          ? 'This internship is suspended, so its schedule is locked. Contact support for help.'
          : 'This enrollment was cancelled, so its schedule is no longer available.'
      }
      action={
        <Button as="a" href={`mailto:${SUPPORT_EMAIL}`} variant="outline" leftIcon={Mail}>
          Email support
        </Button>
      }
    />
  );
}

/** /schedule — the day-wise schedule of the active enrollment (GP3). */
export function SchedulePage() {
  useDocumentTitle('Schedule');
  const {
    enrollment,
    enrollments,
    isLoading,
    isError,
    error,
    refetch,
    setActiveEnrollmentId,
    isActive,
    isLocked,
    scheduleQuery,
    previewQuery,
  } = useSchedule();

  let body;
  if (isLoading) {
    body = <ScheduleSkeleton />;
  } else if (isError) {
    body = (
      <ErrorState error={error} title="We couldn't load your enrollment" onRetry={() => refetch()} />
    );
  } else if (!enrollment) {
    body = (
      <EmptyState
        titleAs="h2"
        icon={CalendarDays}
        title="No schedule yet"
        description="Enroll in an internship to get your day-by-day schedule, SOPs and tasks."
        action={
          <Button as={Link} to={ROUTES.CATALOG} leftIcon={Briefcase}>
            Browse internships
          </Button>
        }
      />
    );
  } else if (isLocked) {
    body = <LockedSchedule enrollment={enrollment} previewQuery={previewQuery} />;
  } else if (isActive) {
    body = <ActiveSchedule key={enrollment._id} scheduleQuery={scheduleQuery} />;
  } else {
    body = <UnavailableSchedule enrollment={enrollment} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description={
          enrollment ? describeEnrollment(enrollment).label : 'Your day-by-day internship plan.'
        }
        actions={
          enrollments.length > 1 ? (
            <EnrollmentSwitcher
              enrollments={enrollments}
              value={enrollment?._id}
              onChange={setActiveEnrollmentId}
            />
          ) : null
        }
      />
      {body}
    </div>
  );
}

export default SchedulePage;
