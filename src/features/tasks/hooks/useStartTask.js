import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startTask } from '@/services/taskService';
import { queryKeys } from '@/services/queryKeys';

/**
 * POST /tasks/:progressId/start (AVAILABLE → IN_PROGRESS).
 * `mutate(progressId, { onSuccess, onError })` — callers own the toast and navigation.
 * Success and failure both refresh the task and the enrollment views (board, schedule,
 * dashboard), because a 409 usually means a teammate already started the task.
 */
export function useStartTask() {
  const queryClient = useQueryClient();

  const refresh = (progressId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.content(progressId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
  };

  return useMutation({
    mutationFn: (progressId) => startTask(progressId),
    onSuccess: (progress, progressId) => {
      if (progress && typeof progress === 'object') {
        queryClient.setQueryData(queryKeys.tasks.content(progressId), (current) =>
          current?.progress ? { ...current, progress: { ...current.progress, ...progress } } : current,
        );
      }
      refresh(progressId);
    },
    onError: (_error, progressId) => refresh(progressId),
  });
}

export default useStartTask;
