import { useQuery } from '@tanstack/react-query';
import { getEnrollmentTasks } from '@/services/applicationService';
import { queryKeys } from '@/services/queryKeys';
import { sortBySequence } from '../utils/taskActions';

/** List response -> TaskProgress[] ordered by task.sequence (module-level so `select` is stable). */
function selectTasks(data) {
  return sortBySequence(Array.isArray(data?.items) ? data.items : []);
}

/**
 * Task progress of one enrollment (GP5): GET /enrollments/:id/tasks.
 * Shares its cache entry with the dashboard (`queryKeys.enrollments.tasks(id)`).
 */
export function useTasks(enrollmentId, { enabled = true, ...options } = {}) {
  return useQuery({
    queryKey: queryKeys.enrollments.tasks(enrollmentId),
    queryFn: () => getEnrollmentTasks(enrollmentId),
    select: selectTasks,
    enabled: Boolean(enrollmentId) && enabled,
    ...options,
  });
}

export default useTasks;
