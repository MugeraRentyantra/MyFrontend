import {
  ACTIVE_ENROLLMENT_STATUSES,
  CERTIFICATE_STATUS,
  ENROLLMENT_STATUS,
  ENROLLMENT_TYPE,
  TASK_STATUS,
} from '@/shared/constants';
import { formatDuration } from '@/shared/utils/helpers';

/**
 * Pure helpers for the student dashboard (GP2) and the learning screens that share it.
 * No JSX, no React.
 */

/** Accepts a list response ({ items }) or a plain array and always returns an array. */
export function toList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
}

/** "Good morning" / "Good afternoon" / "Good evening" from the viewer's local time. */
export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getFirstName(name) {
  const first = String(name ?? '')
    .trim()
    .split(/\s+/)[0];
  return first || 'there';
}

/** Display parts of an enrollment's plan: { designation, domain, duration, subtitle, label }. */
export function describeEnrollment(enrollment) {
  const plan = enrollment?.plan ?? {};
  const designation = plan.designation?.name ?? 'Internship';
  const domain = plan.domain?.name ?? null;
  const duration = plan.durationMonths ? formatDuration(plan.durationMonths) : null;
  const subtitle = [domain, duration].filter(Boolean).join(' · ');
  const label = [designation, domain, duration].filter(Boolean).join(' · ');
  return { designation, domain, duration, subtitle, label };
}

/** Paid content (schedule, SOPs, tasks) is unlocked for these enrollment statuses. */
export function isEnrollmentActive(enrollment) {
  return Boolean(enrollment) && ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status);
}

export function isPendingPayment(enrollment) {
  return enrollment?.status === ENROLLMENT_STATUS.PENDING_PAYMENT;
}

export function isTeamEnrollment(enrollment) {
  return enrollment?.enrollmentType === ENROLLMENT_TYPE.TEAM;
}

export function getEnrollmentTeamId(enrollment) {
  return enrollment?.teamId ?? enrollment?.team?._id ?? null;
}

export function getEnrollmentPlanId(enrollment) {
  return enrollment?.planId ?? enrollment?.plan?._id ?? null;
}

/** Tasks ordered by their sequence in the schedule. */
export function sortTasks(tasks = []) {
  return [...toList(tasks)].sort(
    (a, b) => Number(a?.task?.sequence ?? 0) - Number(b?.task?.sequence ?? 0),
  );
}

const NEXT_TASK_PRIORITY = [
  TASK_STATUS.CHANGES_REQUESTED,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.AVAILABLE,
];

/** The task to work on next: first CHANGES_REQUESTED, else IN_PROGRESS, else AVAILABLE. */
export function pickNextTask(tasks = []) {
  const sorted = sortTasks(tasks);
  for (const status of NEXT_TASK_PRIORITY) {
    const match = sorted.find((progress) => progress.status === status);
    if (match) return match;
  }
  return null;
}

/** Submitted tasks waiting for a trainer, oldest submission first. */
export function getAwaitingReview(tasks = []) {
  return toList(tasks)
    .filter((progress) => progress.status === TASK_STATUS.SUBMITTED)
    .sort((a, b) => new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime());
}

/** { approved, total } from the task list when loaded, else from the enrollment summary. */
export function getTaskProgress(tasks, enrollment) {
  if (Array.isArray(tasks)) {
    return {
      approved: tasks.filter((progress) => progress.status === TASK_STATUS.APPROVED).length,
      total: tasks.length,
    };
  }
  return {
    approved: Number(enrollment?.progress?.approved ?? 0),
    total: Number(enrollment?.progress?.total ?? 0),
  };
}

/** The certificate for an enrollment, preferring an issued one over a revoked one. */
export function findCertificateFor(certificates = [], enrollmentId) {
  const own = toList(certificates).filter((certificate) => certificate.enrollmentId === enrollmentId);
  return (
    own.find((certificate) => certificate.status === CERTIFICATE_STATUS.ISSUED) ?? own[0] ?? null
  );
}

/** The most recent assessment attempt, or null. */
export function getLatestAttempt(attempts = []) {
  return (
    [...toList(attempts)].sort(
      (a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime(),
    )[0] ?? null
  );
}

/** "owner/repo" from a GitHub URL, for compact display. */
export function formatRepoName(url) {
  if (!url) return '';
  return String(url)
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
}
