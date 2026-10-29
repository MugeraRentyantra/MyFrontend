import { ArrowRight, Eye, Play, RotateCcw, Upload } from '@/shared/icons';
import { ENROLLMENT_TYPE, TASK_STATUS, paths } from '@/shared/constants';
import { formatDuration, pluralize } from '@/shared/utils/helpers';

/**
 * Task rules shared by the task board (GP5), the task page (GP6) and the submission screens
 * (GP8, GP9). Plain JavaScript (no JSX): icons are passed around as components.
 */

/** Tabs of the task page, synced to `?tab=`. */
export const TASK_TABS = Object.freeze({
  INSTRUCTIONS: 'instructions',
  SUBMIT: 'submit',
  HISTORY: 'history',
});

export const STATUS_FILTER_ALL = 'all';

/** Status filter of the task board, synced to `?status=`. */
export const STATUS_FILTERS = Object.freeze([
  { value: STATUS_FILTER_ALL, label: 'All' },
  { value: TASK_STATUS.AVAILABLE, label: 'Available' },
  { value: TASK_STATUS.IN_PROGRESS, label: 'In progress' },
  { value: TASK_STATUS.SUBMITTED, label: 'Submitted' },
  { value: TASK_STATUS.CHANGES_REQUESTED, label: 'Changes requested' },
  { value: TASK_STATUS.APPROVED, label: 'Approved' },
  { value: TASK_STATUS.LOCKED, label: 'Locked' },
]);

export function isStatusFilter(value) {
  return STATUS_FILTERS.some((filter) => filter.value === value);
}

export function getStatusFilterLabel(value) {
  return STATUS_FILTERS.find((filter) => filter.value === value)?.label ?? 'All';
}

/**
 * Board columns (GP5). Within a column, statuses are listed in this order (changes requested
 * before available), then by task sequence. Locked tasks get their own row below the board.
 */
export const BOARD_COLUMNS = Object.freeze([
  {
    key: 'todo',
    title: 'To do',
    statuses: [TASK_STATUS.CHANGES_REQUESTED, TASK_STATUS.AVAILABLE],
  },
  { key: 'in-progress', title: 'In progress', statuses: [TASK_STATUS.IN_PROGRESS] },
  { key: 'in-review', title: 'In review', statuses: [TASK_STATUS.SUBMITTED] },
  { key: 'done', title: 'Done', statuses: [TASK_STATUS.APPROVED] },
]);

export const LOCKED_GROUP = Object.freeze({
  key: 'locked',
  title: 'Locked',
  statuses: [TASK_STATUS.LOCKED],
});

/** Statuses in which the student can (re)submit work. */
export function canSubmitStatus(status) {
  return status === TASK_STATUS.IN_PROGRESS || status === TASK_STATUS.CHANGES_REQUESTED;
}

export function getSequence(progress) {
  return progress?.task?.sequence ?? null;
}

/** "Task 3" */
export function taskLabel(sequence) {
  return sequence === null || sequence === undefined ? 'Task' : `Task ${sequence}`;
}

/** "Task 3: Build the transfer API" (used in accessible names of repeated buttons). */
export function taskFullLabel(progress) {
  const label = taskLabel(getSequence(progress));
  const title = progress?.task?.title;
  return title ? `${label}: ${title}` : label;
}

/** "4 hours", "1 hour", "1.5 hours"; null when unknown. */
export function formatEffort(hours) {
  const value = Number(hours);
  if (hours === null || hours === undefined || !Number.isFinite(value) || value <= 0) return null;
  return pluralize(value, 'hour');
}

export function sortBySequence(tasks = []) {
  return [...tasks].sort(
    (a, b) => (Number(getSequence(a)) || 0) - (Number(getSequence(b)) || 0),
  );
}

/** Sorts by the order of `statuses`, then by sequence. */
export function sortForStatuses(tasks = [], statuses = []) {
  return sortBySequence(tasks).sort(
    (a, b) => statuses.indexOf(a.status) - statuses.indexOf(b.status),
  );
}

/** { LOCKED: 2, AVAILABLE: 1, ... } with every status present. */
export function countByStatus(tasks = []) {
  const counts = Object.fromEntries(Object.values(TASK_STATUS).map((status) => [status, 0]));
  tasks.forEach((task) => {
    if (task && Object.prototype.hasOwnProperty.call(counts, task.status)) {
      counts[task.status] += 1;
    }
  });
  return counts;
}

/** The task to work on next: first CHANGES_REQUESTED, else IN_PROGRESS, else AVAILABLE. */
export function pickNextTask(tasks = []) {
  const ordered = sortBySequence(tasks);
  const priorities = [TASK_STATUS.CHANGES_REQUESTED, TASK_STATUS.IN_PROGRESS, TASK_STATUS.AVAILABLE];
  for (const status of priorities) {
    const match = ordered.find((task) => task.status === status);
    if (match) return match;
  }
  return null;
}

/** Prerequisites that are not approved yet (what keeps a task locked). */
export function getMissingPrerequisites(progress) {
  const prerequisites = Array.isArray(progress?.prerequisites) ? progress.prerequisites : [];
  return prerequisites.filter((item) => item && item.status !== TASK_STATUS.APPROVED);
}

/**
 * Allowed actions per task status, exactly as in GP5:
 *   LOCKED → none · AVAILABLE → Start · IN_PROGRESS → Continue / Submit ·
 *   SUBMITTED → View (waiting for review) · CHANGES_REQUESTED → Resubmit · APPROVED → View.
 * `type: 'start'` runs POST /tasks/:id/start then opens the task; `type: 'link'` navigates to `to`.
 */
export function getTaskActions(progress) {
  const id = progress?._id;
  if (!id) return [];
  switch (progress.status) {
    case TASK_STATUS.AVAILABLE:
      return [{ key: 'start', type: 'start', label: 'Start', icon: Play, variant: 'primary' }];
    case TASK_STATUS.IN_PROGRESS:
      return [
        {
          key: 'continue',
          type: 'link',
          label: 'Continue',
          icon: ArrowRight,
          variant: 'outline',
          to: paths.task(id),
        },
        {
          key: 'submit',
          type: 'link',
          label: 'Submit',
          icon: Upload,
          variant: 'primary',
          to: paths.task(id, { tab: TASK_TABS.SUBMIT }),
        },
      ];
    case TASK_STATUS.SUBMITTED:
      return [
        {
          key: 'view',
          type: 'link',
          label: 'View',
          icon: Eye,
          variant: 'outline',
          to: paths.task(id, { tab: TASK_TABS.HISTORY }),
        },
      ];
    case TASK_STATUS.CHANGES_REQUESTED:
      return [
        {
          key: 'resubmit',
          type: 'link',
          label: 'Resubmit',
          icon: RotateCcw,
          variant: 'primary',
          to: paths.task(id, { tab: TASK_TABS.SUBMIT }),
        },
      ];
    case TASK_STATUS.APPROVED:
      return [
        {
          key: 'view',
          type: 'link',
          label: 'View',
          icon: Eye,
          variant: 'outline',
          to: paths.task(id),
        },
      ];
    case TASK_STATUS.LOCKED:
    default:
      return [];
  }
}

export function isTeamEnrollment(enrollment) {
  return enrollment?.enrollmentType === ENROLLMENT_TYPE.TEAM;
}

/** "Java Developer · Banking · 3 months" */
export function getEnrollmentLabel(enrollment) {
  const plan = enrollment?.plan;
  if (!plan) return 'Your internship';
  return [plan.designation?.name, plan.domain?.name, plan.durationMonths ? formatDuration(plan.durationMonths) : null]
    .filter(Boolean)
    .join(' · ');
}

/** "github.com/org/repo" for display; the full URL stays in href. */
export function displayUrl(url) {
  if (!url) return '';
  return String(url)
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}
