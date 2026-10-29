import { Link } from 'react-router-dom';
import { Button, ErrorState, StatusBanner } from '@/shared/components/ui';
import { Award } from '@/shared/icons';
import { ENROLLMENT_STATUS, ROUTES, SUPPORT_EMAIL } from '@/shared/constants';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import { ApplicationsSection } from '../components/ApplicationsSection';
import { CertificateStatusCard } from '../components/CertificateStatusCard';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { EnrollmentSwitcher } from '../components/EnrollmentSwitcher';
import { GithubStatusChip } from '../components/GithubStatusChip';
import { LockedScheduleTeaser } from '../components/LockedScheduleTeaser';
import { NextTaskCard } from '../components/NextTaskCard';
import { NoEnrollmentState } from '../components/NoEnrollmentState';
import { PaymentPendingBanner } from '../components/PaymentPendingBanner';
import { PaymentUnlocksCard } from '../components/PaymentUnlocksCard';
import { PendingReviewsCard } from '../components/PendingReviewsCard';
import { ProgressCard } from '../components/ProgressCard';
import { UpcomingDaysCard } from '../components/UpcomingDaysCard';
import { WelcomeHeader } from '../components/WelcomeHeader';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import { describeEnrollment, isPendingPayment } from '../utils/dashboardHelpers';

function ActiveDashboard({ dashboard }) {
  const {
    enrollment,
    isTeam,
    teamId,
    team,
    tasksQuery,
    scheduleQuery,
    githubQuery,
    certificatesQuery,
    nextTask,
    awaitingReview,
    taskProgress,
    certificate,
    upcomingDays,
    completedDays,
    totalDays,
  } = dashboard;
  const { designation } = describeEnrollment(enrollment);
  const tasks = tasksQuery.data ?? [];

  return (
    <>
      {enrollment.status === ENROLLMENT_STATUS.COMPLETED ? (
        <StatusBanner
          variant="success"
          title="Internship complete"
          action={
            <Button
              as={Link}
              to={ROUTES.CERTIFICATE}
              size="sm"
              variant="outline"
              leftIcon={Award}
              className="h-10 sm:h-8"
            >
              View certificate
            </Button>
          }
        >
          Congratulations on finishing your {designation} internship.
        </StatusBanner>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <ProgressCard
          className="lg:col-span-2"
          enrollment={enrollment}
          approved={taskProgress.approved}
          total={taskProgress.total}
          team={team}
        >
          <GithubStatusChip
            isTeam={isTeam}
            team={team}
            teamId={teamId}
            connection={githubQuery.data}
            isLoading={githubQuery.isLoading}
            isError={githubQuery.isError}
            onRetry={githubQuery.refetch}
          />
        </ProgressCard>
        <NextTaskCard
          nextTask={nextTask}
          tasks={tasks}
          isTeam={isTeam}
          isLoading={tasksQuery.isLoading}
          isError={tasksQuery.isError}
          error={tasksQuery.error}
          onRetry={tasksQuery.refetch}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <UpcomingDaysCard
          days={upcomingDays}
          completedDays={completedDays}
          totalDays={totalDays}
          isLoading={scheduleQuery.isLoading}
          isError={scheduleQuery.isError}
          error={scheduleQuery.error}
          onRetry={scheduleQuery.refetch}
        />
        <PendingReviewsCard
          awaitingReview={awaitingReview}
          isLoading={tasksQuery.isLoading}
          isError={tasksQuery.isError}
          error={tasksQuery.error}
          onRetry={tasksQuery.refetch}
        />
        <CertificateStatusCard
          className="md:col-span-2 lg:col-span-1"
          enrollment={enrollment}
          certificate={certificate}
          approved={taskProgress.approved}
          total={taskProgress.total}
          isLoading={certificatesQuery.isLoading}
          isError={certificatesQuery.isError}
          error={certificatesQuery.error}
          onRetry={certificatesQuery.refetch}
        />
      </div>
    </>
  );
}

function PendingPaymentDashboard({ enrollment, user }) {
  return (
    <>
      <PaymentPendingBanner
        enrollment={enrollment}
        emailVerified={user?.emailVerified !== false}
        email={user?.email}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <LockedScheduleTeaser enrollment={enrollment} className="lg:col-span-2" />
        <PaymentUnlocksCard />
      </div>
    </>
  );
}

function InactiveEnrollmentNotice({ enrollment }) {
  const { designation } = describeEnrollment(enrollment);
  const suspended = enrollment.status === ENROLLMENT_STATUS.SUSPENDED;
  return (
    <StatusBanner
      variant="warning"
      title={suspended ? 'This internship is suspended' : 'This enrollment was cancelled'}
    >
      {suspended
        ? `Your access to the ${designation} schedule and tasks is paused.`
        : `Your ${designation} enrollment no longer gives access to the schedule or tasks.`}{' '}
      Questions? Email{' '}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="link">
        {SUPPORT_EMAIL}
      </a>
      .
    </StatusBanner>
  );
}

function getDescription(dashboard) {
  const { enrollment, isLoading, isError, isActive } = dashboard;
  if (isLoading || isError) return undefined;
  if (!enrollment) return "Let's get your internship started.";
  const { designation } = describeEnrollment(enrollment);
  if (isPendingPayment(enrollment)) {
    return `One step left: complete payment to start your ${designation} internship.`;
  }
  if (enrollment.status === ENROLLMENT_STATUS.COMPLETED) {
    return `You've completed your ${designation} internship.`;
  }
  if (isActive) return `Here's where your ${designation} internship stands today.`;
  return undefined;
}

/** /dashboard — the student's home (GP2). */
export function StudentDashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const dashboard = useStudentDashboard();
  const {
    enrollment,
    enrollments,
    isLoading,
    isError,
    error,
    refetch,
    setActiveEnrollmentId,
    isActive,
    attemptsQuery,
    latestAttempt,
  } = dashboard;

  let body;
  if (isLoading) {
    body = <DashboardSkeleton />;
  } else if (isError) {
    body = (
      <ErrorState error={error} title="We couldn't load your dashboard" onRetry={() => refetch()} />
    );
  } else if (!enrollment) {
    body = <NoEnrollmentState latestAttempt={latestAttempt} isLoading={attemptsQuery.isLoading} />;
  } else if (isPendingPayment(enrollment)) {
    body = <PendingPaymentDashboard enrollment={enrollment} user={user} />;
  } else if (isActive) {
    body = <ActiveDashboard dashboard={dashboard} />;
  } else {
    body = <InactiveEnrollmentNotice enrollment={enrollment} />;
  }

  return (
    <div className="space-y-6">
      <WelcomeHeader
        name={user?.name}
        description={getDescription(dashboard)}
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
      {!isLoading && !isError && enrollments.length > 0 ? (
        <ApplicationsSection enrollments={enrollments} currentId={enrollment?._id} />
      ) : null}
    </div>
  );
}

export default StudentDashboardPage;
