import { useQuery } from '@tanstack/react-query';
import { getAssessment } from '@/services/assessmentService';
import { queryKeys } from '@/services/queryKeys';

/**
 * The 15 questions for a designation: { designation, configVersion, totalQuestions, questions[{ _id, text, options }] }.
 * Never contains answer keys. Fetched once per visit: no background refetches while the student
 * is answering (a refetch could replace the questions mid-attempt).
 * Errors: 404 (no published assessment), 409 ALREADY_ATTEMPTED.
 */
export function useAssessment(designationId, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.assessment.questions(designationId),
    queryFn: () => getAssessment(designationId),
    enabled: Boolean(designationId) && enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}

export default useAssessment;
