import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitTask } from '@/services/taskService';
import { queryKeys } from '@/services/queryKeys';

/**
 * POST /tasks/:progressId/submissions (multipart, GP8).
 * Returns the mutation plus `uploadProgress`: null when idle or when the browser does not
 * report progress, otherwise 0-100. On success the new attempt is put at the top of the cached
 * history, then the task, its history and the enrollment views (board, schedule, dashboard)
 * are refreshed.
 */
export function useSubmitTask(progressId) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(null);

  const handleUploadProgress = useCallback((event) => {
    if (!event || !event.total) return;
    const value = Math.round((event.loaded / event.total) * 100);
    setUploadProgress(Math.min(100, Math.max(0, value)));
  }, []);

  const mutation = useMutation({
    mutationFn: ({ screenshots, description, githubUrl }) =>
      submitTask(
        progressId,
        { screenshots, description, githubUrl },
        { onUploadProgress: handleUploadProgress },
      ),
    onMutate: () => setUploadProgress(null),
    onSuccess: (submission) => {
      if (submission && submission._id) {
        queryClient.setQueryData(queryKeys.tasks.submissions(progressId), (current) => {
          if (!current || !Array.isArray(current.items)) return current;
          if (current.items.some((item) => item._id === submission._id)) return current;
          return {
            ...current,
            items: [submission, ...current.items],
            total: (Number(current.total) || current.items.length) + 1,
          };
        });
      }
    },
    onSettled: () => {
      setUploadProgress(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.content(progressId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.submissions(progressId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    },
  });

  return { ...mutation, uploadProgress };
}

export default useSubmitTask;
