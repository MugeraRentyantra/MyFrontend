import { useQuery } from '@tanstack/react-query';
import { useActiveEnrollment } from '@/features/applications/hooks/useApplications';
import {
  getEnrollmentPlanId,
  isEnrollmentActive,
  isPendingPayment,
} from '@/features/dashboard/utils/dashboardHelpers';
import { getEnrollmentSchedule } from '@/services/applicationService';
import { getSchedulePreview } from '@/services/internshipService';
import { queryKeys } from '@/services/queryKeys';
import { isErrorCode } from '@/shared/utils/errors';

/**
 * Day-wise schedule of an active enrollment (GP3):
 * { enrollmentId, scheduleTemplateId, version, totalDays, days: [{ dayNumber, title, activity,
 *   requiredEvidence, hasSop, task: { progressId, title, status } | null, completed }] }
 * 403 ENROLLMENT_NOT_ACTIVE until the payment is confirmed.
 */
export function useEnrollmentSchedule(enrollmentId, { enabled = true, ...options } = {}) {
  return useQuery({
    queryKey: queryKeys.enrollments.schedule(enrollmentId),
    queryFn: () => getEnrollmentSchedule(enrollmentId),
    enabled: Boolean(enrollmentId) && enabled,
    ...options,
  });
}

/** Public preview of a plan's schedule: { planId, totalDays, days: [{ dayNumber, title }] }. */
export function useSchedulePreview(planId, { enabled = true, ...options } = {}) {
  return useQuery({
    queryKey: queryKeys.catalog.schedulePreview(planId),
    queryFn: () => getSchedulePreview(planId),
    enabled: Boolean(planId) && enabled,
    staleTime: 5 * 60_000,
    ...options,
  });
}

/** True when the API refused the schedule because the enrollment is not paid/active yet. */
export function isNotActiveError(error) {
  return isErrorCode(error, 'ENROLLMENT_NOT_ACTIVE');
}

/**
 * Everything the schedule page needs for the student's active enrollment:
 * the enrollment list state, the full schedule (active) or the locked preview (pending payment
 * or refused with ENROLLMENT_NOT_ACTIVE).
 */
export function useSchedule() {
  const active = useActiveEnrollment();
  const { enrollment } = active;
  const isActive = isEnrollmentActive(enrollment);
  const scheduleQuery = useEnrollmentSchedule(enrollment?._id, { enabled: isActive });
  const refusedAsNotActive = isActive && isNotActiveError(scheduleQuery.error);
  const isLocked = isPendingPayment(enrollment) || refusedAsNotActive;
  const previewQuery = useSchedulePreview(getEnrollmentPlanId(enrollment), { enabled: isLocked });

  return { ...active, isActive, isLocked, scheduleQuery, previewQuery };
}

export default useSchedule;
