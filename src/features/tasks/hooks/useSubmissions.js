import { useQuery } from '@tanstack/react-query';
import { getSubmissions } from '@/services/taskService';
import { queryKeys } from '@/services/queryKeys';

function submittedTime(submission) {
  const time = new Date(submission?.submittedAt ?? 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** List response -> Submission[] newest first (attempt number, then submit time). */
function selectSubmissions(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return [...items].sort(
    (a, b) =>
      (Number(b?.attemptNumber) || 0) - (Number(a?.attemptNumber) || 0) ||
      submittedTime(b) - submittedTime(a),
  );
}

/** Submission history of one task (GP9): GET /tasks/:progressId/submissions. */
export function useSubmissions(progressId, { enabled = true, ...options } = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.submissions(progressId),
    queryFn: () => getSubmissions(progressId),
    select: selectSubmissions,
    enabled: Boolean(progressId) && enabled,
    ...options,
  });
}

export default useSubmissions;
