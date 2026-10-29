import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActiveEnrollment } from '@/features/applications/hooks/useApplications';
import { useEnrollmentSchedule } from '@/features/schedule/hooks/useSchedule';
import {
  countCompletedDays,
  getUpcomingDays,
} from '@/features/schedule/utils/scheduleHelpers';
import { useMyTeams } from '@/features/teams/hooks/useMyTeams';
import { getEnrollmentTasks } from '@/services/applicationService';
import { getMyAttempts } from '@/services/assessmentService';
import { getMyCertificates } from '@/services/certificateService';
import { getGithubConnection } from '@/services/githubService';
import { queryKeys } from '@/services/queryKeys';
import {
  findCertificateFor,
  getAwaitingReview,
  getEnrollmentTeamId,
  getLatestAttempt,
  getTaskProgress,
  isEnrollmentActive,
  isTeamEnrollment,
  pickNextTask,
  toList,
} from '../utils/dashboardHelpers';

const UPCOMING_DAYS = 3;

/**
 * Data for the student dashboard (GP2). Every query is keyed with `queryKeys.*`, so it shares
 * its cache with the schedule, tasks, profile and certificate screens.
 *
 * Returns the active-enrollment state (enrollment, enrollments, isLoading, isError, error,
 * refetch, setActiveEnrollmentId) plus the per-card queries and derived values.
 */
export function useStudentDashboard() {
  const active = useActiveEnrollment();
  const { enrollment, enrollments, isLoading, isError } = active;
  const enrollmentId = enrollment?._id;
  const isActive = isEnrollmentActive(enrollment);
  const isTeam = isTeamEnrollment(enrollment);
  const teamId = getEnrollmentTeamId(enrollment);
  const listReady = !isLoading && !isError;

  const tasksQuery = useQuery({
    queryKey: queryKeys.enrollments.tasks(enrollmentId),
    queryFn: () => getEnrollmentTasks(enrollmentId),
    enabled: Boolean(enrollmentId) && isActive,
    select: toList,
  });

  const scheduleQuery = useEnrollmentSchedule(enrollmentId, { enabled: isActive });

  const githubQuery = useQuery({
    queryKey: queryKeys.github.connection,
    queryFn: getGithubConnection,
    enabled: isActive && !isTeam,
  });

  const certificatesQuery = useQuery({
    queryKey: queryKeys.certificates.mine,
    queryFn: getMyCertificates,
    enabled: isActive,
    select: toList,
  });

  // Only needed to pick the right first step for a student without an enrollment.
  const attemptsQuery = useQuery({
    queryKey: queryKeys.assessment.myAttempts,
    queryFn: getMyAttempts,
    enabled: listReady && enrollments.length === 0,
    select: toList,
  });

  const teamsQuery = useMyTeams();

  const tasks = tasksQuery.data;
  const scheduleDays = scheduleQuery.data?.days;
  const certificates = certificatesQuery.data;
  const attempts = attemptsQuery.data;
  const teams = teamsQuery.data;

  const derived = useMemo(() => {
    const days = Array.isArray(scheduleDays) ? scheduleDays : [];
    return {
      nextTask: pickNextTask(tasks ?? []),
      awaitingReview: getAwaitingReview(tasks ?? []),
      taskProgress: getTaskProgress(tasks, enrollment),
      certificate: enrollmentId ? findCertificateFor(certificates ?? [], enrollmentId) : null,
      team: teamId ? (toList(teams).find((item) => item._id === teamId) ?? null) : null,
      upcomingDays: getUpcomingDays(days, UPCOMING_DAYS),
      completedDays: countCompletedDays(days),
      totalDays: Number(scheduleQuery.data?.totalDays ?? days.length),
      latestAttempt: getLatestAttempt(attempts ?? []),
    };
  }, [
    tasks,
    scheduleDays,
    certificates,
    attempts,
    teams,
    enrollment,
    enrollmentId,
    teamId,
    scheduleQuery.data?.totalDays,
  ]);

  return {
    ...active,
    isActive,
    isTeam,
    teamId,
    tasksQuery,
    scheduleQuery,
    githubQuery,
    certificatesQuery,
    attemptsQuery,
    teamsQuery,
    ...derived,
  };
}

export default useStudentDashboard;
