import { useCallback, useMemo } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminEnrollments, getUsers } from '@/services/adminService';
import {
  createAssignment,
  getAdminAssignments,
  getAdminTeams,
  removeAssignment,
} from '@/services/adminAssignmentService';
import { queryKeys } from '@/services/queryKeys';
import { ENROLLMENT_TYPE, ROLES, USER_STATUS } from '@/shared/constants';
import {
  ASSIGNABLE_ENROLLMENT_STATUSES,
  TARGET_TYPE,
  byAssignedAtDesc,
  matchesTarget,
  targetFromEnrollment,
  targetFromTeam,
  toItems,
} from '../utils/assignmentHelpers';

const PICKER_LIMIT = 50;

/** Server-mode DataTable wiring for /admin/assignments (KD11). */
export function useAssignmentsTable() {
  return useMemo(
    () => ({ fetcher: getAdminAssignments, queryKey: queryKeys.admin.assignments }),
    [],
  );
}

/** Active users with the TRAINER role, for the trainer picker. */
export function useTrainerOptions() {
  const params = { role: ROLES.TRAINER, status: USER_STATUS.ACTIVE, limit: 100 };
  return useQuery({
    queryKey: [...queryKeys.admin.users, 'trainer-options', params],
    queryFn: () => getUsers(params),
    select: selectActiveTrainers,
    staleTime: 60_000,
  });
}

function selectActiveTrainers(data) {
  // Guard against a list that ignores the filters: keep active trainers only.
  return toItems(data).filter(
    (user) =>
      (!Array.isArray(user.roles) || user.roles.includes(ROLES.TRAINER)) &&
      (!user.status || user.status === USER_STATUS.ACTIVE),
  );
}

function selectAssignableEnrollments(data) {
  // Team members are reviewed through their team, so only individual enrollments are offered.
  return toItems(data)
    .filter(
      (enrollment) =>
        ASSIGNABLE_ENROLLMENT_STATUSES.includes(enrollment.status) &&
        enrollment.enrollmentType !== ENROLLMENT_TYPE.TEAM,
    )
    .map(targetFromEnrollment);
}

function selectTeams(data) {
  return toItems(data).map(targetFromTeam);
}

/**
 * Search results for the target picker. `type` is TARGET_TYPE.ENROLLMENT or TARGET_TYPE.TEAM;
 * `data` is a list of target summaries ({ type, id, name, detail, status, disabled }).
 * Mount one picker per type (key it by type) so previous data never crosses types.
 */
export function useAssignmentTargets({ type, search }) {
  const isTeam = type === TARGET_TYPE.TEAM;
  const params = isTeam
    ? { search: search || undefined, limit: PICKER_LIMIT }
    : {
        search: search || undefined,
        status: ASSIGNABLE_ENROLLMENT_STATUSES.join(','),
        limit: PICKER_LIMIT,
      };
  return useQuery({
    queryKey: isTeam
      ? [...queryKeys.admin.teams, 'assign-picker', params]
      : [...queryKeys.admin.enrollments, 'assign-picker', params],
    queryFn: () => (isTeam ? getAdminTeams(params) : getAdminEnrollments(params)),
    select: isTeam ? selectTeams : selectAssignableEnrollments,
    placeholderData: keepPreviousData,
  });
}

/** Every assignment (active and ended) of one target, newest first: current trainer + history. */
export function useTargetAssignments(target) {
  const targetType = target?.type ?? null;
  const targetId = target?.id ?? null;
  const search = target?.searchText || undefined;

  const select = useCallback(
    (data) =>
      toItems(data)
        .filter((row) => matchesTarget(row, { type: targetType, id: targetId }))
        .sort(byAssignedAtDesc),
    [targetType, targetId],
  );

  return useQuery({
    queryKey: [...queryKeys.admin.assignments, 'target', targetType, targetId],
    queryFn: () => getAdminAssignments({ search, active: 'all', limit: 100 }),
    enabled: Boolean(targetId),
    select,
  });
}

function useInvalidateAssignments() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.assignments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.enrollments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.teams }),
    ]);
}

// Invalidations are started but not awaited, so the caller's onSuccess (toast + close) runs at once
// instead of after the refetch (which would briefly show the new state inside the open dialog).

/** POST { trainerId, enrollmentId } or { trainerId, teamId }; the previous assignment is ended. */
export function useCreateAssignment() {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: (body) => createAssignment(body),
    onSuccess: () => {
      invalidate();
    },
  });
}

/** DELETE: ends the assignment (history is kept). */
export function useRemoveAssignment() {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: (assignmentId) => removeAssignment(assignmentId),
    onSuccess: () => {
      invalidate();
    },
  });
}
