import { ENROLLMENT_STATUS, ENROLLMENT_TYPE, TEAM_STATUS } from '@/shared/constants';
import { formatDuration, pluralize } from '@/shared/utils/helpers';

/** What an assignment points at: a student's (individual) enrollment or a whole team. */
export const TARGET_TYPE = Object.freeze({ ENROLLMENT: 'ENROLLMENT', TEAM: 'TEAM' });

/** Enrollments that can get a trainer: paid and not finished. */
export const ASSIGNABLE_ENROLLMENT_STATUSES = [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.IN_PROGRESS];

/** List responses are `{ items, … }`; tolerate a bare array too. */
export function toItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/** "Java Developer · Banking · 3 months" */
export function planLabel(plan) {
  if (!plan) return '';
  const parts = [plan.designation?.name, plan.domain?.name].filter(Boolean);
  if (plan.durationMonths) parts.push(formatDuration(plan.durationMonths));
  return parts.join(' · ');
}

export function membersLabel(count) {
  const value = Number(count);
  return Number.isFinite(value) && value > 0 ? pluralize(value, 'member') : '';
}

/** An assignment row is active unless it was ended (active:false or an unassignedAt date). */
export function isAssignmentActive(row) {
  if (!row) return false;
  if (typeof row.active === 'boolean') return row.active;
  return !row.unassignedAt;
}

export function assignmentTargetType(row) {
  if (row?.teamId || row?.team?._id || row?.type === ENROLLMENT_TYPE.TEAM) return TARGET_TYPE.TEAM;
  return TARGET_TYPE.ENROLLMENT;
}

export function assignmentTargetId(row) {
  if (assignmentTargetType(row) === TARGET_TYPE.TEAM) return row?.teamId ?? row?.team?._id ?? null;
  return row?.enrollmentId ?? row?.enrollment?._id ?? null;
}

/** The plan of an admin assignment row (nested under enrollment or team). */
export function assignmentPlan(row) {
  return row?.enrollment?.plan ?? row?.team?.plan ?? row?.plan ?? null;
}

/** The student of an individual assignment row ({ _id, name, email }). */
export function assignmentStudent(row) {
  return row?.enrollment?.student ?? row?.student ?? null;
}

/**
 * Target summary used across the page and the dialog:
 * { type, id, name, detail, searchText } — student "Name · plan" or team "Team name (n members)".
 */
export function targetFromAssignment(row) {
  const type = assignmentTargetType(row);
  const plan = planLabel(assignmentPlan(row));
  if (type === TARGET_TYPE.TEAM) {
    const members = membersLabel(row?.team?.membersCount ?? row?.membersCount);
    return {
      type,
      id: assignmentTargetId(row),
      name: row?.team?.name || 'Unnamed team',
      detail: [members, plan].filter(Boolean).join(' · '),
      searchText: row?.team?.name ?? '',
    };
  }
  const student = assignmentStudent(row);
  return {
    type,
    id: assignmentTargetId(row),
    name: student?.name || 'Unknown student',
    detail: plan || student?.email || '',
    searchText: student?.name ?? '',
  };
}

export function targetFromEnrollment(enrollment) {
  return {
    type: TARGET_TYPE.ENROLLMENT,
    id: enrollment._id,
    name: enrollment.student?.name || 'Unknown student',
    detail: [planLabel(enrollment.plan), enrollment.student?.email].filter(Boolean).join(' · '),
    status: enrollment.status,
    searchText: enrollment.student?.name ?? '',
  };
}

export function targetFromTeam(team) {
  return {
    type: TARGET_TYPE.TEAM,
    id: team._id,
    name: team.name || 'Unnamed team',
    detail: [
      membersLabel(team.membersCount),
      team.leader?.name ? `led by ${team.leader.name}` : '',
      planLabel(team.plan),
    ]
      .filter(Boolean)
      .join(' · '),
    status: team.status,
    disabled: team.status === TEAM_STATUS.DISBANDED,
    searchText: team.name ?? '',
  };
}

export function matchesTarget(row, target) {
  if (!row || !target?.id) return false;
  return assignmentTargetType(row) === target.type && assignmentTargetId(row) === target.id;
}

export function byAssignedAtDesc(a, b) {
  return new Date(b?.assignedAt ?? 0).getTime() - new Date(a?.assignedAt ?? 0).getTime();
}

/** Trainer id of an assignment row (DTO `trainer` object or a bare `trainerId`). */
export function assignmentTrainerId(row) {
  return row?.trainer?._id ?? row?.trainerId ?? null;
}
