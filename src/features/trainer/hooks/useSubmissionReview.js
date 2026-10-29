import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTrainerSubmission, reviewSubmission } from '@/services/trainerService';
import { queryKeys } from '@/services/queryKeys';

/**
 * One submission with everything the review screen needs (KD10): the submission, task (with
 * acceptance criteria), student/team, plan, previousAttempts[], automatedChecks[] and nextPendingId.
 * A 403 means the submission isn't assigned to this trainer.
 */
export function useTrainerSubmission(submissionId) {
  return useQuery({
    queryKey: queryKeys.trainer.submission(submissionId),
    queryFn: () => getTrainerSubmission(submissionId),
    enabled: Boolean(submissionId),
  });
}

/**
 * Records the decision: mutate({ decision, feedback }) -> { review, submission, nextPendingId }.
 * Every trainer query (stats, queue, assignments, this submission) is refreshed afterwards.
 *
 * The invalidation is deliberately NOT awaited: if it were, the refetched submission (now reviewed)
 * would swap the form for the read-only summary before the caller's onSuccess could navigate on.
 */
export function useReviewSubmission(submissionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ decision, feedback }) => reviewSubmission(submissionId, { decision, feedback }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainer.all });
    },
  });
}
