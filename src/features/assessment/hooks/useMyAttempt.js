import { useQuery } from '@tanstack/react-query';
import { getMyAttempt } from '@/services/assessmentService';
import { queryKeys } from '@/services/queryKeys';

/**
 * The signed-in student's attempt for a designation (SN6/SN7).
 * `data` is the Attempt, or `null` when the student has not taken this assessment yet.
 */
export function useMyAttempt(designationId, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.assessment.attempt(designationId),
    queryFn: () => getMyAttempt(designationId),
    enabled: Boolean(designationId) && enabled,
    staleTime: 30 * 1000,
  });
}

export default useMyAttempt;
