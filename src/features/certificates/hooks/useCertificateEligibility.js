import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEnrollmentTasks } from '@/services/applicationService';
import { queryKeys } from '@/services/queryKeys';
import {
  ACTIVE_ENROLLMENT_STATUSES,
  ENROLLMENT_STATUS,
  PAYMENT_STATUS,
  TASK_STATUS,
} from '@/shared/constants';
import { pluralize } from '@/shared/utils/helpers';

/**
 * Row states for the certificate checklist:
 *  done     requirement met
 *  current  in progress / waiting on someone else
 *  blocked  needs the student's action (e.g. a failed payment)
 *  upcoming not started yet
 */
export const ELIGIBILITY_STATE = Object.freeze({
  DONE: 'done',
  CURRENT: 'current',
  BLOCKED: 'blocked',
  UPCOMING: 'upcoming',
});

function toList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
}

function paymentRequirement(enrollment, isActive) {
  const status = enrollment?.paymentStatus ?? null;
  if (status === PAYMENT_STATUS.SUCCESS || (status === null && isActive)) {
    return { state: ELIGIBILITY_STATE.DONE, text: 'Your payment has been received and confirmed.' };
  }
  if (status === PAYMENT_STATUS.FAILED) {
    return {
      state: ELIGIBILITY_STATE.BLOCKED,
      text: "Your last payment didn't go through. Retry the payment to start your internship.",
      needsPayment: true,
    };
  }
  if (status === PAYMENT_STATUS.REFUND_PENDING || status === PAYMENT_STATUS.REFUNDED) {
    return {
      state: ELIGIBILITY_STATE.BLOCKED,
      text: 'This payment was refunded, so a certificate cannot be issued for this enrollment.',
    };
  }
  if (status === PAYMENT_STATUS.PENDING || status === PAYMENT_STATUS.CREATED) {
    return {
      state: ELIGIBILITY_STATE.CURRENT,
      text: "We're waiting for the payment provider to confirm your payment.",
    };
  }
  if (enrollment?.status === ENROLLMENT_STATUS.PENDING_PAYMENT) {
    return {
      state: ELIGIBILITY_STATE.UPCOMING,
      text: 'Complete your payment to unlock the schedule and tasks.',
      needsPayment: true,
    };
  }
  return { state: ELIGIBILITY_STATE.UPCOMING, text: 'Payment not confirmed yet.' };
}

function tasksRequirement({ isActive, tasks, enrollment }) {
  const fromTasks = Array.isArray(tasks);
  const total = fromTasks ? tasks.length : Number(enrollment?.progress?.total ?? 0);
  const approved = fromTasks
    ? tasks.filter((task) => task?.status === TASK_STATUS.APPROVED).length
    : Number(enrollment?.progress?.approved ?? 0);
  const changesRequested = fromTasks
    ? tasks.filter((task) => task?.status === TASK_STATUS.CHANGES_REQUESTED).length
    : 0;

  if (!isActive) {
    return {
      state: ELIGIBILITY_STATE.UPCOMING,
      text: 'Tasks unlock once your payment is confirmed.',
      approved,
      total,
      changesRequested,
    };
  }
  if (total === 0) {
    return {
      state: ELIGIBILITY_STATE.UPCOMING,
      text: 'Your tasks will appear here once your schedule is ready.',
      approved,
      total,
      changesRequested,
    };
  }
  if (approved >= total) {
    return {
      state: ELIGIBILITY_STATE.DONE,
      text: total === 1 ? 'Your task is approved.' : `All ${total} tasks approved.`,
      approved,
      total,
      changesRequested,
    };
  }
  const extra =
    changesRequested > 0
      ? ` ${pluralize(changesRequested, 'task')} ${changesRequested === 1 ? 'needs' : 'need'} changes.`
      : '';
  return {
    state: ELIGIBILITY_STATE.CURRENT,
    text: `${approved} of ${pluralize(total, 'task')} approved.${extra}`,
    approved,
    total,
    changesRequested,
  };
}

function reviewsRequirement({ isActive, tasks }) {
  if (!isActive || !Array.isArray(tasks)) {
    return {
      state: ELIGIBILITY_STATE.UPCOMING,
      text: 'Trainer reviews start after your first submission.',
      pending: 0,
    };
  }
  const pending = tasks.filter((task) => task?.status === TASK_STATUS.SUBMITTED).length;
  if (pending > 0) {
    return {
      state: ELIGIBILITY_STATE.CURRENT,
      text: `${pluralize(pending, 'submission')} waiting for trainer review.`,
      pending,
    };
  }
  return {
    state: ELIGIBILITY_STATE.DONE,
    text: 'No submissions are waiting for review.',
    pending,
  };
}

/** Pure: builds the three checklist requirements from an enrollment and its task list. */
export function buildEligibility(enrollment, tasks) {
  const isActive = Boolean(enrollment && ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status));
  const payment = paymentRequirement(enrollment, isActive);
  const taskReq = tasksRequirement({ isActive, tasks, enrollment });
  const reviews = reviewsRequirement({ isActive, tasks });
  const items = [payment, taskReq, reviews];
  const doneCount = items.filter((item) => item.state === ELIGIBILITY_STATE.DONE).length;
  return {
    isActive,
    payment,
    tasks: taskReq,
    reviews,
    doneCount,
    totalCount: items.length,
    allDone: doneCount === items.length,
  };
}

/**
 * Certificate eligibility for one enrollment (GP12): payment confirmed, every task approved,
 * nothing waiting for review. Reads the enrollment's task list (shared cache with the task board).
 * The server decides issuance; this only explains where the student stands.
 */
export function useCertificateEligibility(enrollment) {
  const enrollmentId = enrollment?._id ?? null;
  const isActive = Boolean(enrollment && ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status));

  const tasksQuery = useQuery({
    queryKey: queryKeys.enrollments.tasks(enrollmentId),
    queryFn: () => getEnrollmentTasks(enrollmentId),
    select: toList,
    enabled: Boolean(enrollmentId) && isActive,
  });

  const tasks = isActive && tasksQuery.isSuccess ? tasksQuery.data : undefined;
  const eligibility = useMemo(() => buildEligibility(enrollment, tasks), [enrollment, tasks]);

  return {
    ...eligibility,
    isLoading: isActive && tasksQuery.isLoading,
    isError: isActive && tasksQuery.isError,
    error: tasksQuery.error,
    refetch: tasksQuery.refetch,
  };
}

export default useCertificateEligibility;
