import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEnrollment, getEnrollments } from '@/services/applicationService';
import { queryKeys } from '@/services/queryKeys';
import { useAuth } from '@/shared/hooks/useAuth';
import { ENROLLMENT_STATUS, ROLES, STORAGE_KEYS } from '@/shared/constants';

/**
 * "Applications" are a student's enrollments (plan + price snapshot + status).
 * These hooks are shared by the dashboard, schedule, tasks, team and certificate screens.
 */

/** All of the current student's enrollments (array). */
export function useEnrollments(options = {}) {
  const { isAuthenticated, hasRole } = useAuth();
  return useQuery({
    queryKey: queryKeys.enrollments.list,
    queryFn: () => getEnrollments(),
    select: (data) => data?.items ?? [],
    enabled: isAuthenticated && hasRole(ROLES.STUDENT),
    ...options,
  });
}

/** One enrollment by id. Pass `refetchInterval` to poll (payment status page). */
export function useEnrollment(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.enrollments.detail(id),
    queryFn: () => getEnrollment(id),
    enabled: Boolean(id),
    ...options,
  });
}

// --- Active enrollment selection (persisted per browser tab) --------------------------

const listeners = new Set();

function readStoredId() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEYS.activeEnrollmentId);
  } catch {
    return null;
  }
}

function writeStoredId(id) {
  try {
    if (id) window.sessionStorage.setItem(STORAGE_KEYS.activeEnrollmentId, id);
    else window.sessionStorage.removeItem(STORAGE_KEYS.activeEnrollmentId);
  } catch {
    // storage unavailable (private mode): selection simply is not remembered
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const STATUS_PRIORITY = [
  ENROLLMENT_STATUS.IN_PROGRESS,
  ENROLLMENT_STATUS.ACTIVE,
  ENROLLMENT_STATUS.PENDING_PAYMENT,
  ENROLLMENT_STATUS.COMPLETED,
  ENROLLMENT_STATUS.SUSPENDED,
  ENROLLMENT_STATUS.CANCELLED,
];

/** Picks the enrollment a student most likely wants to work on. */
export function pickDefaultEnrollment(enrollments = []) {
  if (!enrollments.length) return null;
  return [...enrollments].sort((a, b) => {
    const byStatus = STATUS_PRIORITY.indexOf(a.status) - STATUS_PRIORITY.indexOf(b.status);
    if (byStatus !== 0) return byStatus;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  })[0];
}

/**
 * The enrollment the learning screens operate on.
 * Returns { enrollment, enrollments, isLoading, isError, error, refetch, setActiveEnrollmentId }.
 * `enrollment` is null when the student has not enrolled yet.
 */
export function useActiveEnrollment() {
  const query = useEnrollments();
  const storedId = useSyncExternalStore(subscribe, readStoredId, () => null);
  const enrollments = useMemo(() => query.data ?? [], [query.data]);

  const enrollment = useMemo(() => {
    const stored = storedId ? enrollments.find((item) => item._id === storedId) : null;
    return stored ?? pickDefaultEnrollment(enrollments);
  }, [enrollments, storedId]);

  const setActiveEnrollmentId = useCallback((id) => writeStoredId(id), []);

  return {
    enrollment,
    enrollments,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    setActiveEnrollmentId,
  };
}
