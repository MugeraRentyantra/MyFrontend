import { useQuery } from '@tanstack/react-query';
import { getTaskContent } from '@/services/taskService';
import { queryKeys } from '@/services/queryKeys';

/**
 * One task for the task page (GP6): GET /tasks/:progressId/content →
 * { locked, progress, task, enrollment, team }. Locked tasks come without instructions.
 */
export function useTaskContent(progressId, options = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.content(progressId),
    queryFn: () => getTaskContent(progressId),
    enabled: Boolean(progressId),
    ...options,
  });
}

export default useTaskContent;
