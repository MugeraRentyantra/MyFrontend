import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useActiveEnrollment } from '@/features/applications/hooks/useApplications';
import {
  isEnrollmentActive,
  isPendingPayment,
} from '@/features/dashboard/utils/dashboardHelpers';
import { Button, EmptyState, ErrorState, PageHeader } from '@/shared/components/ui';
import { ArrowLeft, BookOpen, Briefcase, FileWarning, Lock, Mail } from '@/shared/icons';
import { ROUTES, SUPPORT_EMAIL } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { getErrorStatus } from '@/shared/utils/errors';
import { LockedOverlay } from '../components/LockedOverlay';
import { SopDayNav } from '../components/SopDayNav';
import { SopReader } from '../components/SopReader';
import { SopSkeleton } from '../components/SopSkeleton';
import { useEnrollmentSchedule } from '../hooks/useSchedule';
import { useSop } from '../hooks/useSop';
import { getAdjacentSopDays, parseDayParam } from '../utils/scheduleHelpers';

function BackToScheduleButton() {
  return (
    <Button as={Link} to={ROUTES.SCHEDULE} variant="outline" leftIcon={ArrowLeft}>
      Back to schedule
    </Button>
  );
}

function DayNotFound({ dayNumber }) {
  return (
    <EmptyState
      titleAs="h2"
      icon={FileWarning}
      title="We couldn't find that day"
      description={
        dayNumber
          ? `Day ${dayNumber} isn't part of your schedule. Pick a day from your schedule instead.`
          : "That link doesn't point to a day in your schedule."
      }
      action={<BackToScheduleButton />}
    />
  );
}

/** /schedule/:day/sop — protected, view-only SOP for one day of the active enrollment (GP4). */
export function SopReaderPage() {
  const { day } = useParams();
  const dayNumber = parseDayParam(day);
  useDocumentTitle(dayNumber ? `Day ${dayNumber} SOP` : 'SOP');

  const { enrollment, isLoading, isError, error, refetch } = useActiveEnrollment();
  const isActive = isEnrollmentActive(enrollment);
  const sopQuery = useSop(enrollment?._id, dayNumber, { enabled: isActive });
  const scheduleQuery = useEnrollmentSchedule(enrollment?._id, {
    enabled: isActive && dayNumber !== null,
  });

  const scheduleDays = scheduleQuery.data?.days;
  const scheduleDay = useMemo(
    () => (scheduleDays ?? []).find((item) => item.dayNumber === dayNumber) ?? null,
    [scheduleDays, dayNumber],
  );
  const { previous, next } = useMemo(
    () => getAdjacentSopDays(scheduleDays, dayNumber ?? 0),
    [scheduleDays, dayNumber],
  );

  const sop = sopQuery.data;
  const dayTitle = sop?.title ?? scheduleDay?.title ?? null;
  const heading = dayNumber
    ? `Day ${dayNumber}${dayTitle ? ` · ${dayTitle}` : ''}`
    : 'Standard operating procedure';

  const sopErrorStatus = getErrorStatus(sopQuery.error);

  let body;
  if (dayNumber === null) {
    body = <DayNotFound dayNumber={null} />;
  } else if (isLoading) {
    body = <SopSkeleton />;
  } else if (isError) {
    body = (
      <ErrorState error={error} title="We couldn't load your enrollment" onRetry={() => refetch()} />
    );
  } else if (!enrollment) {
    body = (
      <EmptyState
        titleAs="h2"
        icon={BookOpen}
        title="No SOPs yet"
        description="Enroll in an internship to unlock its daily SOPs, schedule and tasks."
        action={
          <Button as={Link} to={ROUTES.CATALOG} leftIcon={Briefcase}>
            Browse internships
          </Button>
        }
      />
    );
  } else if (isPendingPayment(enrollment) || (isActive && sopQuery.isError && sopErrorStatus === 403)) {
    body = (
      <LockedOverlay
        enrollment={enrollment}
        title="This SOP is locked"
        description="SOPs open as soon as your payment is confirmed. Until then you can preview the day titles in your schedule."
      />
    );
  } else if (!isActive) {
    body = (
      <EmptyState
        titleAs="h2"
        variant="locked"
        icon={Lock}
        title="SOP unavailable"
        description="This enrollment no longer gives access to SOPs. Contact support if you need help."
        action={
          <Button as="a" href={`mailto:${SUPPORT_EMAIL}`} variant="outline" leftIcon={Mail}>
            Email support
          </Button>
        }
      />
    );
  } else if (sopQuery.isLoading) {
    body = <SopSkeleton />;
  } else if (sopQuery.isError && sopErrorStatus === 404) {
    body = <DayNotFound dayNumber={dayNumber} />;
  } else if (sopQuery.isError) {
    body = (
      <ErrorState
        error={sopQuery.error}
        title="We couldn't load this SOP"
        onRetry={() => sopQuery.refetch()}
      />
    );
  } else if (sop) {
    body = (
      <div className="space-y-6">
        <SopReader sop={sop} />
        <SopDayNav previous={previous} next={next} />
      </div>
    );
  } else {
    body = <SopSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={heading}
        breadcrumbs={[
          { label: 'Schedule', to: ROUTES.SCHEDULE },
          { label: dayNumber ? `Day ${dayNumber} SOP` : 'SOP' },
        ]}
      />
      {body}
    </div>
  );
}

export default SopReaderPage;
