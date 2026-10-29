import { useQuery } from '@tanstack/react-query';
import { getMyAttempt } from '@/services/assessmentService';
import { queryKeys } from '@/services/queryKeys';

/**
 * The student's scored attempt for the result page (SN7).
 * `stateAttempt` is the Attempt handed over in navigation state right after submitting; it is
 * shown immediately while the server copy is (re)fetched. `notAttempted` becomes true only once
 * a fresh server response confirms there is no attempt, so a stale cached `null` never causes a
 * wrong redirect.
 */
export function useAttemptResult(designationId, stateAttempt = null) {
  const query = useQuery({
    queryKey: queryKeys.assessment.attempt(designationId),
    queryFn: () => getMyAttempt(designationId),
    enabled: Boolean(designationId),
    staleTime: 0,
  });

  const attempt = stateAttempt ?? query.data ?? null;

  return {
    attempt,
    isLoading: !attempt && query.isLoading,
    isError: !attempt && query.isError,
    error: query.error,
    refetch: query.refetch,
    notAttempted: !stateAttempt && query.isSuccess && query.data === null && !query.isFetching,
  };
}

export default useAttemptResult;
