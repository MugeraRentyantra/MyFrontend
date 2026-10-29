import { CHECK_STATUS, ENROLLMENT_TYPE, REVIEW_DECISION } from '@/shared/constants';
import { formatDuration, hoursSince, percent } from '@/shared/utils/helpers';

/** Queue ageing thresholds (KD9): neutral under a day, amber up to three days, rose after. */
export const AGE_WARNING_HOURS = 24;
export const AGE_OVERDUE_HOURS = 72;

/** A student/team with no activity for this long is flagged in reports (KD13). */
export const INACTIVE_AFTER_DAYS = 7;

/** Feedback rules (MM14): required unless the decision is APPROVED. */
export const FEEDBACK_MIN_LENGTH = 10;
export const FEEDBACK_MAX_LENGTH = 5000;

/** 'fresh' (< 24 h) | 'aging' (24–72 h) | 'overdue' (> 72 h) */
export function getAgeLevel(submittedAt, now = Date.now()) {
  const hours = hoursSince(submittedAt, now);
  if (hours > AGE_OVERDUE_HOURS) return 'overdue';
  if (hours >= AGE_WARNING_HOURS) return 'aging';
  return 'fresh';
}

/** List responses are `{ items, … }`; tolerate a bare array too. */
export function toItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/** "Java Developer · Banking" */
export function planName(plan) {
  if (!plan) return '';
  return [plan.designation?.name, plan.domain?.name].filter(Boolean).join(' · ');
}

/** "Java Developer · Banking · 3 months" */
export function planNameWithDuration(plan) {
  if (!plan) return '';
  const name = planName(plan);
  const duration = plan.durationMonths ? formatDuration(plan.durationMonths) : '';
  return [name, duration].filter(Boolean).join(' · ');
}

/** "Task 3 · Build the REST API" */
export function taskLabel(task) {
  if (!task) return 'Task';
  const hasSequence = task.sequence !== undefined && task.sequence !== null && task.sequence !== '';
  const title = task.title || 'Untitled task';
  return hasSequence ? `Task ${task.sequence} · ${title}` : title;
}

/** True when the item is a team (queue item, assignment or submission detail). */
export function isTeamItem(item) {
  if (!item) return false;
  if (item.type) return item.type === ENROLLMENT_TYPE.TEAM;
  return Boolean(item.team);
}

/** Display name of whoever the work belongs to: the team name or the student's name. */
export function ownerName(item) {
  if (!item) return 'Unknown';
  if (isTeamItem(item)) return item.team?.name || 'Unnamed team';
  return item.student?.name || item.submittedBy?.name || 'Unknown student';
}

/** Approved / total as a whole percentage (0 when there are no tasks yet). */
export function completionPercent(approved, total) {
  return percent(Number(approved) || 0, Number(total) || 0);
}

/** Days since the given ISO date (Infinity when there was never any activity). */
export function daysSince(value, now = Date.now()) {
  if (!value) return Infinity;
  return hoursSince(value, now) / 24;
}

export function isInactive(lastActivityAt, now = Date.now()) {
  return daysSince(lastActivityAt, now) > INACTIVE_AFTER_DAYS;
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Flattens a trainer assignment into sortable/searchable report fields (KD13). `inactive` and
 * `hasPending` are 'yes'/'no' so DataTable filters can match them; `lastActivityTime` is 0 when
 * there was never any activity, so those rows sort first.
 */
export function toReportRow(assignment) {
  const approved = Number(assignment.approvedTasks) || 0;
  const total = Number(assignment.totalTasks) || 0;
  const pending = Number(assignment.pendingSubmissions) || 0;
  return {
    ...assignment,
    name: ownerName(assignment),
    email: isTeamItem(assignment) ? '' : (assignment.student?.email ?? ''),
    planLabel: planNameWithDuration(assignment.plan),
    approved,
    total,
    pending,
    completion: completionPercent(approved, total),
    inactive: isInactive(assignment.lastActivityAt) ? 'yes' : 'no',
    hasPending: pending > 0 ? 'yes' : 'no',
    lastActivityTime: toTime(assignment.lastActivityAt),
  };
}

/** True when a required automated check failed: approving is then blocked (MM14 CHECKS_FAILED). */
export function hasFailedRequiredCheck(checks) {
  return Array.isArray(checks)
    ? checks.some((check) => check?.required && check?.status === CHECK_STATUS.FAILED)
    : false;
}

/** Copy for each review decision, used by the form, the confirmation and the toasts. */
export const DECISION_META = Object.freeze({
  [REVIEW_DECISION.APPROVED]: {
    label: 'Approve',
    description: 'The work meets the acceptance criteria. The task is marked as approved.',
    confirmTitle: 'Approve this submission?',
    confirmLabel: 'Approve',
    successTitle: 'Submission approved',
    variant: 'primary',
  },
  [REVIEW_DECISION.CHANGES_REQUESTED]: {
    label: 'Request changes',
    description: 'Send it back with feedback. The student fixes the issues and submits again.',
    confirmTitle: 'Request changes?',
    confirmLabel: 'Send feedback',
    successTitle: 'Changes requested',
    variant: 'primary',
  },
  [REVIEW_DECISION.REJECTED]: {
    label: 'Reject',
    description: "The submission doesn't address the task. Explain clearly what is missing.",
    confirmTitle: 'Reject this submission?',
    confirmLabel: 'Reject submission',
    successTitle: 'Submission rejected',
    variant: 'danger',
  },
});

export const DECISION_ORDER = [
  REVIEW_DECISION.APPROVED,
  REVIEW_DECISION.CHANGES_REQUESTED,
  REVIEW_DECISION.REJECTED,
];
